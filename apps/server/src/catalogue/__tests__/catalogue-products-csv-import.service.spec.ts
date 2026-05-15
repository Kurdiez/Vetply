import { TestingModule } from '@nestjs/testing';
import {
  CatalogUnitType,
  LegalCategory,
  SalesCategory,
  Supplier,
  type CatalogueProductImportRow,
} from '@vetply/shared';
import { DataSource } from 'typeorm';
import {
  saveCatalogueManufacturer,
  saveCatalogueProduct,
} from '~/commons/test/mockers/catalogue-product.mocker';
import {
  cleanupAllTestResources,
  createTestDbContext,
  createTestingModule,
  getTestRepository,
  type TestDbContext,
  setupTestDatabase,
} from '~/commons/test/utils/jest-test-utils';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CatalogueProductsCsvImportService } from '../services/catalogue-products-csv-import.service';

function batchMeta(totalDataRows: number) {
  return {
    batchIndex: 0,
    totalBatches: 1,
    totalDataRows,
  };
}

function baseRow(
  overrides: Partial<CatalogueProductImportRow> = {},
): CatalogueProductImportRow {
  return {
    rowNumber: 1,
    id: '',
    name: 'Import Product',
    unit_quantity: '12',
    unit_type: CatalogUnitType.ML,
    legal_category: LegalCategory.Consumables,
    sales_category: SalesCategory.Consumables,
    pom: 'false',
    manufacturer: '',
    image: '',
    ...overrides,
  };
}

describe('CatalogueProductsCsvImportService', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;
  let service: CatalogueProductsCsvImportService;
  let productRepo: ReturnType<typeof getTestRepository<CatalogueProductEntity>>;
  let manufacturerRepo: ReturnType<
    typeof getTestRepository<CatalogueManufacturerEntity>
  >;

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {
      providers: [
        {
          provide: CatalogueProductsCsvImportService,
          useFactory: () =>
            new CatalogueProductsCsvImportService(
              getTestRepository(dbContext, CatalogueProductEntity),
            ),
        },
      ],
    });
    service = testModule.get(CatalogueProductsCsvImportService);
    productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    manufacturerRepo = getTestRepository(
      dbContext,
      CatalogueManufacturerEntity,
    );
  });

  afterEach(async () => {
    await cleanupAllTestResources(dbContext, testModule);
  });

  describe('importBatch — id', () => {
    it('inserts a new product when id is empty', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ id: '' })],
      });
      expect(res.rowsUpserted).toBe(1);
      expect(res.rowsFailed).toBe(0);
      const rows = await productRepo.find();
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Import Product');
      expect(rows[0].unitType).toBe(CatalogUnitType.ML);
    });

    it('updates an existing product when id matches', async () => {
      const existing = await saveCatalogueProduct(productRepo, {
        name: 'Old',
        image: null,
        salesCategory: SalesCategory.Retail,
        legalCategory: LegalCategory.GSL_GeneralSalesList,
        pom: true,
        unitType: CatalogUnitType.EA,
        unitQuantity: '1.000000',
      });
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [
          baseRow({
            id: existing.id,
            name: 'Updated',
            unit_quantity: '6',
            unit_type: CatalogUnitType.EA,
            legal_category: '',
            sales_category: '',
            pom: '',
          }),
        ],
      });
      expect(res.rowsUpserted).toBe(1);
      const row = await productRepo.findOne({ where: { id: existing.id } });
      expect(row!.name).toBe('Updated');
      expect(row!.salesCategory).toBeNull();
      expect(row!.legalCategory).toBeNull();
      expect(row!.pom).toBeNull();
    });
  });

  describe('importBatch — validation failures', () => {
    it('fails when name is empty', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ name: '   ' })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures).toEqual([
        expect.objectContaining({
          rowNumber: 1,
          column: 'name',
          message: 'Product name cannot be empty',
        }),
      ]);
    });

    it('fails when unit_type is empty', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ unit_type: '' })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('unit_type');
    });

    it('fails when unit_type is invalid', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ unit_type: 'NOT_A_UNIT' })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('unit_type');
    });

    it.each([
      ['', 'empty'],
      ['0', 'zero'],
      ['-1', 'negative'],
      ['x', 'non-numeric'],
    ])('fails when unit_quantity is %s (%s)', async (unit_quantity) => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ unit_quantity })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('unit_quantity');
    });

    it('fails when legal_category is non-empty but invalid', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ legal_category: 'bogus' })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('legal_category');
    });

    it('fails when sales_category is non-empty but invalid', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ sales_category: 'bogus' })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('sales_category');
    });

    it('accepts empty legal_category and sales_category as null', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [
          baseRow({
            legal_category: ' ',
            sales_category: '',
          }),
        ],
      });
      expect(res.rowsUpserted).toBe(1);
      const row = (await productRepo.find())[0];
      expect(row.legalCategory).toBeNull();
      expect(row.salesCategory).toBeNull();
    });

    it.each([
      ['maybe', 'invalid'],
      ['TRUEE', 'typo'],
    ])('fails when pom is invalid (%s)', async (pom) => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ pom })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('pom');
    });

    it.each([
      ['true', true],
      ['FALSE', false],
      ['', null],
    ])('accepts pom %s → %s', async (pom, expected) => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ pom })],
      });
      expect(res.rowsUpserted).toBe(1);
      expect((await productRepo.find())[0].pom).toBe(expected);
    });

    it('fails when manufacturer text has no DB match', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ manufacturer: 'Unknown Mfg' })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('manufacturer');
      expect(res.failures[0].message).toContain('manufacturer');
    });

    it('resolves manufacturer case-insensitively', async () => {
      await saveCatalogueManufacturer(manufacturerRepo, 'Acme Pharma');
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ manufacturer: 'ACME PHARMA' })],
      });
      expect(res.rowsUpserted).toBe(1);
      const m = (await productRepo.find())[0];
      const mfg = await manufacturerRepo.findOne({
        where: { id: m.manufacturerId! },
      });
      expect(mfg!.name).toBe('Acme Pharma');
    });

    it('stores null manufacturer when manufacturer cell is empty', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ manufacturer: '  ' })],
      });
      expect(res.rowsUpserted).toBe(1);
      expect((await productRepo.find())[0].manufacturerId).toBeNull();
    });

    it('fails when image exceeds max length', async () => {
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ image: 'x'.repeat(2049) })],
      });
      expect(res.rowsUpserted).toBe(0);
      expect(res.failures[0].column).toBe('image');
    });

    it('stores image when within limit', async () => {
      const url = 'https://example.com/a.png';
      const res = await service.importBatch({
        ...batchMeta(1),
        rows: [baseRow({ image: url })],
      });
      expect(res.rowsUpserted).toBe(1);
      expect((await productRepo.find())[0].image).toBe(url);
    });
  });

  describe('importBatch — mixed rows', () => {
    it('upserts valid rows and reports only invalid rows as failures', async () => {
      const res = await service.importBatch({
        ...batchMeta(2),
        rows: [
          baseRow({ rowNumber: 1, name: '' }),
          baseRow({ rowNumber: 2, name: 'Good' }),
        ],
      });
      expect(res.rowsUpserted).toBe(1);
      expect(res.rowsFailed).toBe(1);
      expect(await productRepo.count()).toBe(1);
    });
  });

  describe('deleteMissingNotInCsv', () => {
    it('deletes nothing when productIdsInCsv is empty', async () => {
      await saveCatalogueProduct(productRepo, {
        name: 'Keep',
        image: null,
        salesCategory: null,
        legalCategory: null,
        pom: null,
      });
      const res = await service.deleteMissingNotInCsv({ productIdsInCsv: [] });
      expect(res.deletedCount).toBe(0);
      expect(await productRepo.count()).toBe(1);
    });

    it('deletes products not listed and keeps listed ones', async () => {
      const keep = await saveCatalogueProduct(productRepo, {
        name: 'Keep',
        image: null,
        salesCategory: null,
        legalCategory: null,
        pom: null,
      });
      await saveCatalogueProduct(productRepo, {
        name: 'Remove',
        image: null,
        salesCategory: null,
        legalCategory: null,
        pom: null,
      });
      const res = await service.deleteMissingNotInCsv({
        productIdsInCsv: [keep.id],
      });
      expect(res.deletedCount).toBe(1);
      const ids = (await productRepo.find({ select: { id: true } })).map(
        (r) => r.id,
      );
      expect(ids).toEqual([keep.id]);
    });

    it('orphans listings when their product is deleted', async () => {
      const supplierRepo = getTestRepository(
        dbContext,
        CatalogueSupplierEntity,
      );
      const listingRepo = getTestRepository(
        dbContext,
        CatalogueProductSupplierListingEntity,
      );
      let nvs = await supplierRepo.findOne({ where: { name: Supplier.NVS } });
      if (!nvs) {
        nvs = await supplierRepo.save(
          supplierRepo.create({ name: Supplier.NVS }),
        );
      }
      const gone = await saveCatalogueProduct(productRepo, {
        name: 'ToDelete',
        image: null,
        salesCategory: null,
        legalCategory: null,
        pom: null,
      });
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: gone.id,
          supplierId: nvs.id,
          supplierProductId: 'S1',
          name: 'L',
          listedPrice: '1.0000',
        }),
      );
      const keeper = await saveCatalogueProduct(productRepo, {
        name: 'Keeper',
        image: null,
        salesCategory: null,
        legalCategory: null,
        pom: null,
      });
      await service.deleteMissingNotInCsv({ productIdsInCsv: [keeper.id] });
      const listingAfter = await listingRepo.findOne({
        where: { id: listing.id },
      });
      expect(listingAfter!.productId).toBeNull();
    });
  });
});
