import { NotFoundException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import {
  CatalogUnitType,
  LegalCategory,
  SalesCategory,
  Supplier,
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
  setupTestDatabase,
  type TestDbContext,
} from '~/commons/test/utils/jest-test-utils';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CatalogueProductDetailService } from '../services/catalogue-product-detail.service';

describe('CatalogueProductDetailService', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;
  let service: CatalogueProductDetailService;
  let manufacturerRepo: ReturnType<
    typeof getTestRepository<CatalogueManufacturerEntity>
  >;
  let productRepo: ReturnType<typeof getTestRepository<CatalogueProductEntity>>;

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {
      providers: [
        {
          provide: CatalogueProductDetailService,
          useFactory: () =>
            new CatalogueProductDetailService(
              getTestRepository(dbContext, CatalogueProductEntity),
              getTestRepository(dbContext, CatalogueManufacturerEntity),
              getTestRepository(
                dbContext,
                CatalogueProductSupplierListingEntity,
              ),
            ),
        },
      ],
    });
    service = testModule.get(CatalogueProductDetailService);
    manufacturerRepo = getTestRepository(
      dbContext,
      CatalogueManufacturerEntity,
    );
    productRepo = getTestRepository(dbContext, CatalogueProductEntity);
  });

  afterEach(async () => {
    await cleanupAllTestResources(dbContext, testModule);
  });

  it('returns product with listings and supplier names', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
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

    const mfg = await saveCatalogueManufacturer(manufacturerRepo, 'Acme');
    const product = await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Widget',
      image: null,
      salesCategory: SalesCategory.Consumables,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        supplierProductId: 'SKU-1',
        name: 'Widget NVS',
        listedPrice: '12.3400',
      }),
    );

    const res = await service.getProductDetail(product.id);
    expect(res.id).toBe(product.id);
    expect(res.name).toBe('Widget');
    expect(res.image).toBeNull();
    expect(res.manufacturerId).toBe(mfg.id);
    expect(res.manufacturerName).toBe('Acme');
    expect(res.listings).toHaveLength(1);
    expect(res.listings[0].supplierName).toBe(Supplier.NVS);
    expect(res.listings[0].supplierProductId).toBe('SKU-1');
    expect(res.listings[0].listedPrice).toBe('12.34');
  });

  it('throws when product missing', async () => {
    await expect(
      service.getProductDetail('00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createManualProduct persists defaults and returns empty listings', async () => {
    const detail = await service.createManualProduct();

    expect(detail.name).toBe('Default Product Title');
    expect(detail.listings).toEqual([]);
    expect(detail.manufacturerId).toBeNull();
    expect(detail.unitType).toBe(CatalogUnitType.EA);

    const row = await productRepo.findOne({
      where: { id: detail.id },
    });
    expect(row).not.toBeNull();
    expect(row!.unitQuantity).toBe('1.000000');
    expect(row!.salesCategory).toBeNull();
    expect(row!.legalCategory).toBeNull();
    expect(row!.pom).toBeNull();
    expect(row!.image).toBeNull();
  });

  it('bulkDeleteProducts deletes products and sets listing product_id to null', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
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

    const product = await saveCatalogueProduct(productRepo, {
      name: 'BulkDeleteTarget',
      image: null,
      salesCategory: SalesCategory.Consumables,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    const listingRow = await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        supplierProductId: 'SKU-BULK-DEL',
        name: 'Listed',
        listedPrice: '1.0000',
      }),
    );

    const result = await service.bulkDeleteProducts([product.id]);
    expect(result.deletedCount).toBe(1);

    const listingAfter = await listingRepo.findOne({
      where: { id: listingRow.id },
    });
    expect(listingAfter).not.toBeNull();
    expect(listingAfter!.productId).toBeNull();
  });

  it('unlinkSupplierListing sets listing product_id null and omits it from detail', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
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

    const product = await saveCatalogueProduct(productRepo, {
      name: 'UnlinkTarget',
      image: null,
      salesCategory: SalesCategory.Consumables,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    const listingRow = await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        supplierProductId: 'SKU-UNLINK',
        name: 'Listed',
        listedPrice: '2.0000',
      }),
    );

    const before = await service.getProductDetail(product.id);
    expect(before.listings).toHaveLength(1);

    const after = await service.unlinkSupplierListing(
      product.id,
      listingRow.id,
    );
    expect(after.listings).toHaveLength(0);

    const listingDb = await listingRepo.findOne({
      where: { id: listingRow.id },
    });
    expect(listingDb?.productId).toBeNull();
  });

  it('unlinkSupplierListing throws when listing does not belong to product', async () => {
    const product = await saveCatalogueProduct(productRepo, {
      name: 'Solo',
      image: null,
      salesCategory: SalesCategory.Consumables,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    await expect(
      service.unlinkSupplierListing(
        product.id,
        '00000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
