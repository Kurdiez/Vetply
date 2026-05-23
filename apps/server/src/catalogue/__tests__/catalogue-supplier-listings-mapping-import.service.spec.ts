import { TestingModule } from '@nestjs/testing';
import {
  DUPLICATE_CATALOGUE_PRODUCT_MAPPING_FAIL_REASON,
  LegalCategory,
  SalesCategory,
  Supplier,
  type SupplierListingsMappingImportRow,
} from '@vetply/shared';
import { DataSource } from 'typeorm';
import { saveCatalogueProduct } from '~/commons/test/mockers/catalogue-product.mocker';
import {
  cleanupAllTestResources,
  createTestDbContext,
  createTestingModule,
  getTestRepository,
  type TestDbContext,
  setupTestDatabase,
} from '~/commons/test/utils/jest-test-utils';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CatalogueSupplierListingsMappingImportService } from '../services/catalogue-supplier-listings-mapping-import.service';

function batchMeta(totalDataRows: number) {
  return {
    batchIndex: 0,
    totalBatches: 1,
    totalDataRows,
  };
}

function mappingRow(
  overrides: Partial<SupplierListingsMappingImportRow> = {},
): SupplierListingsMappingImportRow {
  return {
    rowNumber: 1,
    id: '00000000-0000-4000-8000-000000000099',
    catalogue_product_id: '',
    name: 'Listing Name',
    listed_price: '10.50',
    ...overrides,
  };
}

describe('CatalogueSupplierListingsMappingImportService', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;
  let service: CatalogueSupplierListingsMappingImportService;
  let listingRepo: ReturnType<
    typeof getTestRepository<CatalogueProductSupplierListingEntity>
  >;
  let productRepo: ReturnType<typeof getTestRepository<CatalogueProductEntity>>;
  let supplierRepo: ReturnType<
    typeof getTestRepository<CatalogueSupplierEntity>
  >;

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {
      providers: [
        {
          provide: CatalogueSupplierListingsMappingImportService,
          useFactory: () =>
            new CatalogueSupplierListingsMappingImportService(
              getTestRepository(
                dbContext,
                CatalogueProductSupplierListingEntity,
              ),
            ),
        },
      ],
    });
    service = testModule.get(CatalogueSupplierListingsMappingImportService);
    listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
  });

  afterEach(async () => {
    await cleanupAllTestResources(dbContext, testModule);
  });

  async function ensureSupplier(
    name: Supplier,
  ): Promise<CatalogueSupplierEntity> {
    let row = await supplierRepo.findOne({ where: { name } });
    if (!row) {
      row = await supplierRepo.save(supplierRepo.create({ name }));
    }
    return row;
  }

  describe('importBatch — supplier resolution', () => {
    it('fails every row when supplier row is missing', async () => {
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(2),
        rows: [
          mappingRow({ rowNumber: 1 }),
          mappingRow({
            rowNumber: 2,
            id: '00000000-0000-4000-8000-000000000088',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(0);
      expect(res.rowsFailed).toBe(2);
      expect(res.failures.every((f) => f.column === 'supplier')).toBe(true);
      expect(res.failures[0].message).toBe('Supplier not found in catalogue');
    });

    it('proceeds when supplier exists', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-1',
          name: 'Before',
          listedPrice: null,
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [
          mappingRow({
            id: listing.id,
            name: 'After',
            listed_price: '',
            catalogue_product_id: '',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(1);
      const after = await listingRepo.findOne({ where: { id: listing.id } });
      expect(after!.name).toBe('After');
    });
  });

  describe('importBatch — listing id & supplier ownership', () => {
    it('fails when listing id does not exist', async () => {
      await ensureSupplier(Supplier.NVS);
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [
          mappingRow({
            id: '00000000-0000-4000-8000-00000000dead',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(0);
      expect(res.failures[0]).toMatchObject({
        column: 'id',
        message: 'Supplier listing not found',
      });
    });

    it('fails when listing belongs to another supplier', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      await ensureSupplier(Supplier.VEENAK);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'NV-1',
          name: 'Nvs only',
          listedPrice: '1.0000',
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.VEENAK,
        ...batchMeta(1),
        rows: [mappingRow({ id: listing.id })],
      });
      expect(res.rowsUpdated).toBe(0);
      expect(res.failures[0]).toMatchObject({
        column: 'id',
        message: 'Listing does not belong to the selected supplier',
      });
      const unchanged = await listingRepo.findOne({
        where: { id: listing.id },
      });
      expect(unchanged!.supplierId).toBe(nvs.id);
    });
  });

  describe('importBatch — name', () => {
    it('fails when name is empty after trim', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-2',
          name: 'Keep',
          listedPrice: null,
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [mappingRow({ id: listing.id, name: '   ' })],
      });
      expect(res.rowsUpdated).toBe(0);
      expect(res.failures[0]).toMatchObject({
        column: 'name',
        message: 'name cannot be empty',
      });
    });
  });

  describe('importBatch — catalogue_product_id', () => {
    it('unlinks when catalogue_product_id is blank', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const product = await saveCatalogueProduct(productRepo, {
        name: 'P',
        image: null,
        salesCategory: SalesCategory.Consumables,
        legalCategory: LegalCategory.Consumables,
        pom: false,
      });
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: product.id,
          supplierId: nvs.id,
          supplierProductId: 'SP-3',
          name: 'Linked',
          listedPrice: '2.0000',
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [
          mappingRow({
            id: listing.id,
            catalogue_product_id: ' \t',
            name: 'Unlinked',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(1);
      const after = await listingRepo.findOne({ where: { id: listing.id } });
      expect(after!.productId).toBeNull();
      expect(after!.name).toBe('Unlinked');
    });

    it('fails when catalogue_product_id is non-empty but not a UUID', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-4',
          name: 'X',
          listedPrice: null,
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [
          mappingRow({
            id: listing.id,
            catalogue_product_id: 'not-a-uuid',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(0);
      expect(res.failures[0]).toMatchObject({
        column: 'catalogue_product_id',
        message: 'catalogue_product_id must be a UUID or empty',
      });
    });

    it('fails when catalogue_product_id UUID has no product', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-5',
          name: 'X',
          listedPrice: null,
        }),
      );
      const missingId = '00000000-0000-4000-8000-0000000000aa';
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [
          mappingRow({
            id: listing.id,
            catalogue_product_id: missingId,
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(0);
      expect(res.failures[0]).toMatchObject({
        column: 'catalogue_product_id',
        message: 'Catalogue product not found',
      });
    });

    it('links when catalogue_product_id matches an existing product', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const product = await saveCatalogueProduct(productRepo, {
        name: 'Target',
        image: null,
        salesCategory: null,
        legalCategory: null,
        pom: null,
      });
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-6',
          name: 'X',
          listedPrice: null,
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [
          mappingRow({
            id: listing.id,
            catalogue_product_id: product.id,
            name: 'Mapped',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(1);
      const after = await listingRepo.findOne({ where: { id: listing.id } });
      expect(after!.productId).toBe(product.id);
    });
  });

  describe('importBatch — listed_price', () => {
    it('sets listed_price null when cell is empty', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-7',
          name: 'Priced',
          listedPrice: '9.9900',
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [
          mappingRow({
            id: listing.id,
            listed_price: '',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(1);
      expect(
        (await listingRepo.findOne({ where: { id: listing.id } }))!.listedPrice,
      ).toBeNull();
    });

    it('accepts zero as listed_price', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-8',
          name: 'X',
          listedPrice: '1.0000',
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(1),
        rows: [mappingRow({ id: listing.id, listed_price: '0' })],
      });
      expect(res.rowsUpdated).toBe(1);
      const row = await listingRepo.findOne({ where: { id: listing.id } });
      expect(row!.listedPrice).toBe('0.0000');
    });

    it('fails when listed_price is negative or not a number', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const listing = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-9',
          name: 'X',
          listedPrice: '1.0000',
        }),
      );
      for (const listed_price of ['-0.01', 'abc']) {
        const res = await service.importBatch({
          supplier: Supplier.NVS,
          ...batchMeta(1),
          rows: [mappingRow({ id: listing.id, listed_price })],
        });
        expect(res.rowsFailed).toBe(1);
        expect(res.failures[0].column).toBe('listed_price');
      }
    });
  });

  describe('importBatch — mixed outcomes', () => {
    it('updates valid rows and skips invalid rows in the same batch', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const ok = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'SP-ok',
          name: 'A',
          listedPrice: null,
        }),
      );
      const res = await service.importBatch({
        supplier: Supplier.NVS,
        ...batchMeta(2),
        rows: [
          mappingRow({
            rowNumber: 1,
            id: ok.id,
            name: 'Updated',
          }),
          mappingRow({
            rowNumber: 2,
            id: '00000000-0000-4000-8000-00000000beef',
            name: 'Ghost',
          }),
        ],
      });
      expect(res.rowsUpdated).toBe(1);
      expect(res.rowsFailed).toBe(1);
      expect((await listingRepo.findOne({ where: { id: ok.id } }))!.name).toBe(
        'Updated',
      );
    });
  });

  describe('importBatch — duplicate catalogue product mapping', () => {
    it('throws BadRequest with failReason when two rows map to the same catalogue product', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const product = await saveCatalogueProduct(productRepo, {
        name: 'Shared target',
        image: null,
        salesCategory: SalesCategory.Consumables,
        legalCategory: LegalCategory.Consumables,
        pom: false,
      });
      const l1 = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'DUP-1',
          name: 'Listing one',
          listedPrice: null,
        }),
      );
      const l2 = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'DUP-2',
          name: 'Listing two',
          listedPrice: null,
        }),
      );

      await expect(
        service.importBatch({
          supplier: Supplier.NVS,
          ...batchMeta(2),
          rows: [
            mappingRow({
              rowNumber: 1,
              id: l1.id,
              catalogue_product_id: product.id,
            }),
            mappingRow({
              rowNumber: 2,
              id: l2.id,
              catalogue_product_id: product.id,
            }),
          ],
        }),
      ).rejects.toMatchObject({
        response: {
          failReason: DUPLICATE_CATALOGUE_PRODUCT_MAPPING_FAIL_REASON,
        },
      });

      expect(
        (await listingRepo.findOne({ where: { id: l1.id } }))!.productId,
      ).toBeNull();
      expect(
        (await listingRepo.findOne({ where: { id: l2.id } }))!.productId,
      ).toBeNull();
    });

    it('throws BadRequest with failReason when import conflicts with an existing linked listing', async () => {
      const nvs = await ensureSupplier(Supplier.NVS);
      const product = await saveCatalogueProduct(productRepo, {
        name: 'Occupied',
        image: null,
        salesCategory: SalesCategory.Consumables,
        legalCategory: LegalCategory.Consumables,
        pom: false,
      });
      await listingRepo.save(
        listingRepo.create({
          productId: product.id,
          supplierId: nvs.id,
          supplierProductId: 'OCC-1',
          name: 'Already linked',
          listedPrice: '1.0000',
        }),
      );
      const orphan = await listingRepo.save(
        listingRepo.create({
          productId: null,
          supplierId: nvs.id,
          supplierProductId: 'OCC-2',
          name: 'Orphan',
          listedPrice: null,
        }),
      );

      await expect(
        service.importBatch({
          supplier: Supplier.NVS,
          ...batchMeta(1),
          rows: [
            mappingRow({
              id: orphan.id,
              catalogue_product_id: product.id,
            }),
          ],
        }),
      ).rejects.toMatchObject({
        response: {
          failReason: DUPLICATE_CATALOGUE_PRODUCT_MAPPING_FAIL_REASON,
        },
      });

      expect(
        (await listingRepo.findOne({ where: { id: orphan.id } }))!.productId,
      ).toBeNull();
    });
  });
});
