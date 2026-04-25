import { TestingModule } from '@nestjs/testing';
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  LegalCategory,
  SalesCategory,
  Supplier,
  catalogueProductsListQuerySchema,
} from '@vetply/shared';
import { DataSource } from 'typeorm';
import {
  cleanupAllTestResources,
  createTestDbContext,
  createTestingModule,
  getTestRepository,
  setupTestDatabase,
  type TestDbContext,
} from '~/commons/test/utils/jest-test-utils';
import {
  saveCatalogueManufacturer,
  saveCatalogueProduct,
} from '~/commons/test/mockers/catalogue-product.mocker';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CatalogueProductListService } from '../services/catalogue-product-list.service';

describe('CatalogueProductListService', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;
  let service: CatalogueProductListService;
  let manufacturerRepo: ReturnType<
    typeof getTestRepository<CatalogueManufacturerEntity>
  >;
  let productRepo: ReturnType<typeof getTestRepository<CatalogueProductEntity>>;

  type Seed = {
    p1: CatalogueProductEntity;
    p2: CatalogueProductEntity;
    p3: CatalogueProductEntity;
  };

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {
      providers: [
        {
          provide: CatalogueProductListService,
          useFactory: () =>
            new CatalogueProductListService(
              getTestRepository(dbContext, CatalogueProductEntity),
            ),
        },
      ],
    });
    service = testModule.get(CatalogueProductListService);
    manufacturerRepo = getTestRepository(
      dbContext,
      CatalogueManufacturerEntity,
    );
    productRepo = getTestRepository(dbContext, CatalogueProductEntity);
  });

  afterEach(async () => {
    await cleanupAllTestResources(dbContext, testModule);
  });

  async function seedThreeProducts(): Promise<Seed> {
    const alpha = await saveCatalogueManufacturer(
      manufacturerRepo,
      'Alpha Pharma',
    );
    const beta = await saveCatalogueManufacturer(manufacturerRepo, 'Beta Labs');

    const p1 = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Dog Vaccine',
      salesCategory: SalesCategory.Dental,
      legalCategory: LegalCategory.GSL_GeneralSalesList,
      pom: false,
    });

    const p2 = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Cat Vaccine',
      salesCategory: SalesCategory.VaccinesSA,
      legalCategory: LegalCategory.POM_V,
      pom: true,
    });

    const p3 = await saveCatalogueProduct(productRepo, {
      manufacturerId: beta.id,
      name: 'Horse wormer',
      salesCategory: SalesCategory.EctosEquine,
      legalCategory: LegalCategory.NFA_VPS,
      pom: false,
    });

    return { p1, p2, p3 };
  }

  it('returns all products with default sort when no filters or sort', async () => {
    const { p1, p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
    });
    expect(res.totalCount).toBe(3);
    expect(res.items.map((i) => i.id).sort()).toEqual(
      [p1.id, p2.id, p3.id].sort(),
    );
  });

  it('maps nullable manufacturer and classification to null in list items', async () => {
    await saveCatalogueProduct(productRepo, {
      manufacturerId: null,
      name: 'Supplier-unknown widget',
      salesCategory: null,
      legalCategory: null,
      pom: null,
    });
    const res = await service.listProducts({ page: 1, pageSize: 50 });
    const row = res.items.find((i) => i.name === 'Supplier-unknown widget');
    expect(row).toBeDefined();
    expect(row!.manufacturerName).toBeNull();
    expect(row!.salesCategory).toBeNull();
    expect(row!.legalCategory).toBeNull();
    expect(row!.pom).toBeNull();
  });

  it('name search q matches product.name as ILIKE substring', async () => {
    const { p1 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Dog Vaccine',
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p1.id);
  });

  it('name search q — negative when no substring match', async () => {
    await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Nonexistent Product',
    });
    expect(res.totalCount).toBe(0);
    expect(res.items).toHaveLength(0);
  });

  it('filters manufacturerName contains — positive', async () => {
    const { p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.Contains,
          value: 'Beta',
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p3.id);
  });

  it('filters manufacturerName doesNotContain — excludes matches only', async () => {
    const { p1, p2 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.DoesNotContain,
          value: 'Beta',
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p1.id, p2.id].sort());
  });

  it('combines AND across filters — name search q + pom', async () => {
    const { p2 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Vaccine',
      filters: [
        {
          kind: 'boolean',
          fieldId: CatalogueFilterFieldId.Pom,
          operator: CatalogueFilterOperator.IsExactly,
          value: true,
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p2.id);
  });

  it('combines AND — impossible combination returns empty', async () => {
    await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Dog Vaccine',
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.Contains,
          value: 'Beta',
        },
      ],
    });
    expect(res.totalCount).toBe(0);
  });

  it('filters salesCategory isExactly', async () => {
    const { p1 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.SalesCategory,
          operator: CatalogueFilterOperator.IsExactly,
          value: SalesCategory.Dental,
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p1.id);
  });

  it('filters salesCategory containsAnyOf', async () => {
    const { p1, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.SalesCategory,
          operator: CatalogueFilterOperator.ContainsAnyOf,
          value: [SalesCategory.Dental, SalesCategory.EctosEquine],
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p1.id, p3.id].sort());
  });

  it('filters salesCategory doesNotContainAnyOf — no false positives', async () => {
    const { p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.SalesCategory,
          operator: CatalogueFilterOperator.DoesNotContainAnyOf,
          value: [SalesCategory.Dental],
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p2.id, p3.id].sort());
  });

  it('filters legalCategory isDistinctFrom', async () => {
    const { p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.LegalCategory,
          operator: CatalogueFilterOperator.IsDistinctFrom,
          value: LegalCategory.GSL_GeneralSalesList,
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p2.id, p3.id].sort());
  });

  it('filters pom boolean isExactly', async () => {
    const { p2 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'boolean',
          fieldId: CatalogueFilterFieldId.Pom,
          operator: CatalogueFilterOperator.IsExactly,
          value: true,
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p2.id);
  });

  it('filters manufacturerName containsAnyOf — OR semantics', async () => {
    const { p1, p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.ContainsAnyOf,
          value: ['Beta', 'Alpha'],
        },
      ],
    });
    expect(res.totalCount).toBe(3);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it('filters manufacturerName doesNotContainAnyOf — AND of exclusions', async () => {
    const { p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.DoesNotContainAnyOf,
          value: ['Alpha', 'Cat'],
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p3.id);
  });

  it('sorts by name ascending', async () => {
    await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      sort: {
        fieldId: CatalogueFilterFieldId.Name,
        direction: 'asc',
      },
    });
    expect(res.items.map((i) => i.name)).toEqual([
      'Cat Vaccine',
      'Dog Vaccine',
      'Horse wormer',
    ]);
  });

  it('paginates after filters', async () => {
    await seedThreeProducts();
    const page1 = await service.listProducts({
      page: 1,
      pageSize: 2,
      q: 'e',
    });
    const page2 = await service.listProducts({
      page: 2,
      pageSize: 2,
      q: 'e',
    });
    expect(page1.totalCount).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(1);
    const allIds = [...page1.items, ...page2.items].map((i) => i.id);
    expect(new Set(allIds).size).toBe(3);
  });

  it('filters supplier isExactly — NVS listing only', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );

    let nvsSupplier = await supplierRepo.findOne({
      where: { name: Supplier.NVS },
    });
    if (!nvsSupplier) {
      nvsSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.NVS }),
      );
    }
    let veenakSupplier = await supplierRepo.findOne({
      where: { name: Supplier.VEENAK },
    });
    if (!veenakSupplier) {
      veenakSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );
    }

    const alpha = await saveCatalogueManufacturer(manufacturerRepo, 'Mfg A');
    const productNvs = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Listed NVS only',
      salesCategory: SalesCategory.Misc,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });
    const productVeenak = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Listed Veenak only',
      salesCategory: SalesCategory.Misc,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    await listingRepo.save(
      listingRepo.create({
        productId: productNvs.id,
        supplierId: nvsSupplier.id,
        supplierProductId: 'NVS-REF-1',
        name: 'Listed NVS only',
        listedPrice: '10.0000',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: productVeenak.id,
        supplierId: veenakSupplier.id,
        supplierProductId: 'VEE-REF-1',
        name: 'Listed Veenak only',
        listedPrice: '20.0000',
      }),
    );

    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Supplier,
          operator: CatalogueFilterOperator.IsExactly,
          value: Supplier.NVS,
        },
      ],
    });

    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(productNvs.id);
  });

  it('returns bestPrice and bestSupplierName from lowest-priced listing (tie-break)', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );

    let nvsSupplier = await supplierRepo.findOne({
      where: { name: Supplier.NVS },
    });
    if (!nvsSupplier) {
      nvsSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.NVS }),
      );
    }
    let veenakSupplier = await supplierRepo.findOne({
      where: { name: Supplier.VEENAK },
    });
    if (!veenakSupplier) {
      veenakSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );
    }

    const alpha = await saveCatalogueManufacturer(
      manufacturerRepo,
      'Mfg Multi',
    );
    const product = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Multi-supplier product',
      salesCategory: SalesCategory.Misc,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvsSupplier.id,
        supplierProductId: 'REF-HIGH',
        name: 'Multi-supplier product',
        listedPrice: '99.0000',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: veenakSupplier.id,
        supplierProductId: 'REF-LOW',
        name: 'Multi-supplier product',
        listedPrice: '5.5000',
      }),
    );

    const res = await service.listProducts({ page: 1, pageSize: 50 });
    const row = res.items.find((i) => i.id === product.id);
    expect(row).toBeDefined();
    expect(row!.bestPrice).toBe('5.50');
    expect(row!.bestSupplierName).toBe(Supplier.VEENAK);
  });

  it('filters bestSupplier isExactly — matches only when that supplier has a min-price listing', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );

    let nvsSupplier = await supplierRepo.findOne({
      where: { name: Supplier.NVS },
    });
    if (!nvsSupplier) {
      nvsSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.NVS }),
      );
    }
    let veenakSupplier = await supplierRepo.findOne({
      where: { name: Supplier.VEENAK },
    });
    if (!veenakSupplier) {
      veenakSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );
    }

    const alpha = await saveCatalogueManufacturer(manufacturerRepo, 'Mfg BS');
    const product = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Dual list',
      salesCategory: SalesCategory.Misc,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvsSupplier.id,
        supplierProductId: 'HI',
        name: 'Dual list',
        listedPrice: '100.0000',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: veenakSupplier.id,
        supplierProductId: 'LO',
        name: 'Dual list',
        listedPrice: '1.0000',
      }),
    );

    const matchVeenak = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.BestSupplier,
          operator: CatalogueFilterOperator.IsExactly,
          value: Supplier.VEENAK,
        },
      ],
    });
    expect(matchVeenak.totalCount).toBe(1);
    expect(matchVeenak.items[0].id).toBe(product.id);

    const matchNvs = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.BestSupplier,
          operator: CatalogueFilterOperator.IsExactly,
          value: Supplier.NVS,
        },
      ],
    });
    expect(matchNvs.totalCount).toBe(0);
  });
});

describe('catalogueProductsListQuerySchema (filters/sort)', () => {
  it('rejects invalid JSON in filters', () => {
    const r = catalogueProductsListQuerySchema.safeParse({
      page: '1',
      pageSize: '50',
      filters: '{not json',
    });
    expect(r.success).toBe(false);
  });

  it('parses valid filters JSON string', () => {
    const filters = [
      {
        kind: 'string',
        fieldId: CatalogueFilterFieldId.ManufacturerName,
        operator: CatalogueFilterOperator.Contains,
        value: 'x',
      },
    ];
    const r = catalogueProductsListQuerySchema.safeParse({
      page: '1',
      pageSize: '50',
      filters: JSON.stringify(filters),
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.filters).toEqual(filters);
    }
  });
});
