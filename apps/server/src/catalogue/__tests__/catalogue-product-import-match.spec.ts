import { TestingModule } from '@nestjs/testing';
import {
  CatalogUnitType,
  LegalCategory,
  SalesCategory,
  stripTrailingCatalogUnitQuantityFromProductName,
  Supplier,
} from '@vetply/shared';
import { DataSource } from 'typeorm';
import { saveCatalogueProduct } from '~/commons/test/mockers/catalogue-product.mocker';
import {
  cleanupAllTestResources,
  createTestDbContext,
  createTestingModule,
  getTestRepository,
  setupTestDatabase,
  type TestDbContext,
} from '~/commons/test/utils/jest-test-utils';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import {
  diceBigramScore,
  findExistingCatalogueProductIdForSupplierImport,
  normalizeCatalogueProductNameForMatch,
  slugForCatalogueProductMatch,
} from '../utils/catalogue-product-import-match';

describe('catalogue-product-import-match', () => {
  describe('stripTrailingCatalogUnitQuantityFromProductName', () => {
    it('removes trailing decimal quantity and spaced ML unit', () => {
      expect(
        stripTrailingCatalogUnitQuantityFromProductName('Paracetamol 100 ML'),
      ).toBe('Paracetamol');
    });

    it('removes glued quantity and unit at end', () => {
      expect(
        stripTrailingCatalogUnitQuantityFromProductName('Paracetamol 100ml'),
      ).toBe('Paracetamol');
    });

    it('strips repeated tails from the right', () => {
      expect(
        stripTrailingCatalogUnitQuantityFromProductName('X 500 MG 28 TAB'),
      ).toBe('X');
    });

    it('does not strip strength tokens not at the tail', () => {
      expect(
        stripTrailingCatalogUnitQuantityFromProductName(
          'PARACETAMOL SUSP 120MG/5ML SF',
        ),
      ).toBe('PARACETAMOL SUSP 120MG/5ML SF');
    });
  });

  describe('normalizeCatalogueProductNameForMatch', () => {
    it('trims, lowercases, and collapses whitespace', () => {
      expect(
        normalizeCatalogueProductNameForMatch('  Aciclovir   200mg  '),
      ).toBe('aciclovir 200mg');
    });
  });

  describe('slugForCatalogueProductMatch', () => {
    it('drops punctuation and collapses to alphanumeric tokens', () => {
      expect(slugForCatalogueProductMatch('Aciclovir (200mg) — Tabs')).toBe(
        'aciclovir 200mg tabs',
      );
    });

    it('aligns sugar-base NVS, Covetrus-style titles to the same slug', () => {
      const covetrusStyle = 'Paracetamol Susp 120mg/5ml 100ml';
      const nvsSugarGlued = 'PARACETAMOL SUSP 120MG/5ML (SU100ML';
      expect(slugForCatalogueProductMatch(covetrusStyle)).toBe(
        slugForCatalogueProductMatch(nvsSugarGlued),
      );
    });

    it('aligns sugar-free NVS SF and Veenak-style title when pack volume is in the name', () => {
      const nvsSf = 'PARACETAMOL SUSP 120MG/5ML SF 100ML';
      const veenakSf = 'Paracetamol Susp 120mg/5ml (Sugar free) 100ML';
      expect(slugForCatalogueProductMatch(nvsSf)).toBe(
        slugForCatalogueProductMatch(veenakSf),
      );
    });

    it('does not treat plain Covetrus title as sugar-free slug', () => {
      const covetrusStyle = 'Paracetamol Susp 120mg/5ml 100ml';
      const nvsSf = 'PARACETAMOL SUSP 120MG/5ML SF 100ML';
      expect(slugForCatalogueProductMatch(covetrusStyle)).not.toBe(
        slugForCatalogueProductMatch(nvsSf),
      );
    });
  });

  describe('diceBigramScore', () => {
    it('scores identical slugs at 1', () => {
      expect(diceBigramScore('ab cd', 'ab cd')).toBe(1);
    });

    it('scores similar strings near threshold for typical pack-suffix variants', () => {
      const a = slugForCatalogueProductMatch('Aciclovir 200mg Tablets');
      const b = slugForCatalogueProductMatch(
        'Aciclovir 200mg Tablets — Pack 28',
      );
      expect(diceBigramScore(a, b)).toBeGreaterThanOrEqual(0.8);
      expect(diceBigramScore(a, b)).toBeLessThan(1);
    });
  });

  describe('findExistingCatalogueProductIdForSupplierImport', () => {
    let dataSource: DataSource;
    let dbContext: TestDbContext;
    let testModule: TestingModule;

    beforeEach(async () => {
      dataSource = await setupTestDatabase();
      dbContext = await createTestDbContext(dataSource);
      testModule = await createTestingModule(dataSource, {});
    });

    afterEach(async () => {
      await cleanupAllTestResources(dbContext, testModule);
    });

    it('returns product id when name matches and supplier has no listing yet', async () => {
      const supplierRepo = getTestRepository(
        dbContext,
        CatalogueSupplierEntity,
      );
      const nvs = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.NVS }),
      );
      const veenak = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );
      const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
      const listingRepo = getTestRepository(
        dbContext,
        CatalogueProductSupplierListingEntity,
      );

      const product = await saveCatalogueProduct(productRepo, {
        name: 'Aciclovir 200mg Tablets',
        manufacturerId: null,
        salesCategory: SalesCategory.Consumables,
        legalCategory: LegalCategory.POM_V,
        pom: true,
      });

      await listingRepo.save(
        listingRepo.create({
          productId: product.id,
          supplierId: nvs.id,
          supplierProductId: '00001234',
          name: 'Aciclovir 200mg Tablets',
          listedPrice: '1.0000',
        }),
      );

      const found = await findExistingCatalogueProductIdForSupplierImport(
        dbContext.manager,
        {
          supplierId: veenak.id,
          candidateName: '  aciclovir   200mg   tablets  ',
        },
      );
      expect(found).toBe(product.id);
    });

    it('prefers plain Paracetamol product over SF variant for Covetrus listing title', async () => {
      const supplierRepo = getTestRepository(
        dbContext,
        CatalogueSupplierEntity,
      );
      const covetrus = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.COVETRUS }),
      );

      const productRepo = getTestRepository(dbContext, CatalogueProductEntity);

      const plainProduct = await productRepo.save(
        productRepo.create({
          id: '00000000-0000-4000-8000-000000000001',
          manufacturerId: null,
          name: 'PARACETAMOL SUSP 120MG/5ML',
          salesCategory: SalesCategory.Pharmaceutical,
          legalCategory: LegalCategory.POM_V,
          pom: true,
          unitType: CatalogUnitType.ML,
          unitQuantity: '100.000000',
        }),
      );

      await productRepo.save(
        productRepo.create({
          id: '00000000-0000-4000-8000-000000000002',
          manufacturerId: null,
          name: 'PARACETAMOL SUSP 120MG/5ML SF',
          salesCategory: SalesCategory.Pharmaceutical,
          legalCategory: LegalCategory.POM_V,
          pom: true,
          unitType: CatalogUnitType.ML,
          unitQuantity: '100.000000',
        }),
      );

      const found = await findExistingCatalogueProductIdForSupplierImport(
        dbContext.manager,
        {
          supplierId: covetrus.id,
          candidateName: 'Paracetamol Susp 120mg/5ml 100ml',
        },
      );

      expect(found).toBe(plainProduct.id);
    });

    it('returns null when product already has a listing for that supplier', async () => {
      const supplierRepo = getTestRepository(
        dbContext,
        CatalogueSupplierEntity,
      );
      const veenak = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );
      const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
      const listingRepo = getTestRepository(
        dbContext,
        CatalogueProductSupplierListingEntity,
      );

      const product = await saveCatalogueProduct(productRepo, {
        name: 'Only Veenak',
        manufacturerId: null,
        salesCategory: null,
        legalCategory: null,
        pom: null,
        unitType: CatalogUnitType.EA,
      });

      await listingRepo.save(
        listingRepo.create({
          productId: product.id,
          supplierId: veenak.id,
          supplierProductId: 'VEE-1',
          name: 'Only Veenak',
          listedPrice: '5.0000',
        }),
      );

      const found = await findExistingCatalogueProductIdForSupplierImport(
        dbContext.manager,
        { supplierId: veenak.id, candidateName: 'Only Veenak' },
      );
      expect(found).toBeNull();
    });

    it('returns null for empty candidate name', async () => {
      const supplierRepo = getTestRepository(
        dbContext,
        CatalogueSupplierEntity,
      );
      const veenak = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );

      const found = await findExistingCatalogueProductIdForSupplierImport(
        dbContext.manager,
        { supplierId: veenak.id, candidateName: '   ' },
      );
      expect(found).toBeNull();
    });

    it('fuzzy-matches when slug differs slightly (punctuation / pack suffix)', async () => {
      const supplierRepo = getTestRepository(
        dbContext,
        CatalogueSupplierEntity,
      );
      const nvs = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.NVS }),
      );
      const veenak = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );
      const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
      const listingRepo = getTestRepository(
        dbContext,
        CatalogueProductSupplierListingEntity,
      );

      const product = await saveCatalogueProduct(productRepo, {
        name: 'Aciclovir (200mg) Tablets',
        manufacturerId: null,
        salesCategory: SalesCategory.Consumables,
        legalCategory: LegalCategory.POM_V,
        pom: true,
      });

      await listingRepo.save(
        listingRepo.create({
          productId: product.id,
          supplierId: nvs.id,
          supplierProductId: '00001234',
          name: 'Aciclovir (200mg) Tablets',
          listedPrice: '1.0000',
        }),
      );

      const found = await findExistingCatalogueProductIdForSupplierImport(
        dbContext.manager,
        {
          supplierId: veenak.id,
          candidateName: 'Aciclovir 200mg Tablets — Pack of 28',
        },
      );
      expect(found).toBe(product.id);
    });
  });
});
