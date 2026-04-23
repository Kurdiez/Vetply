import { NotFoundException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { LegalCategory, SalesCategory, Supplier } from '@vetply/shared';
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
      nvs = await supplierRepo.save(supplierRepo.create({ name: Supplier.NVS }));
    }

    const mfg = await saveCatalogueManufacturer(manufacturerRepo, 'Acme');
    const product = await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Widget',
      image: null,
      salesCategory: SalesCategory.Misc,
      legalCategory: LegalCategory.Consumables,
      pom: false,
    });

    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        variantRef: 'SKU-1',
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
    expect(res.listings[0].variantRef).toBe('SKU-1');
    expect(res.listings[0].listedPrice).toBe('12.34');
  });

  it('throws when product missing', async () => {
    await expect(
      service.getProductDetail('00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
