import { TestingModule } from '@nestjs/testing';
import { Supplier } from '@vetply/shared';
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
import { CatalogueSupplierListingListService } from '../services/catalogue-supplier-listing-list.service';

describe('CatalogueSupplierListingListService', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;
  let service: CatalogueSupplierListingListService;
  let manufacturerRepo: ReturnType<
    typeof getTestRepository<CatalogueManufacturerEntity>
  >;
  let productRepo: ReturnType<typeof getTestRepository<CatalogueProductEntity>>;
  let supplierRepo: ReturnType<
    typeof getTestRepository<CatalogueSupplierEntity>
  >;
  let listingRepo: ReturnType<
    typeof getTestRepository<CatalogueProductSupplierListingEntity>
  >;

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {
      providers: [
        {
          provide: CatalogueSupplierListingListService,
          useFactory: () =>
            new CatalogueSupplierListingListService(
              getTestRepository(
                dbContext,
                CatalogueProductSupplierListingEntity,
              ),
            ),
        },
      ],
    });
    service = testModule.get(CatalogueSupplierListingListService);
    manufacturerRepo = getTestRepository(
      dbContext,
      CatalogueManufacturerEntity,
    );
    productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
  });

  afterEach(async () => {
    await cleanupAllTestResources(dbContext, testModule);
  });

  async function ensureSupplier(
    name: Supplier,
  ): Promise<CatalogueSupplierEntity> {
    let s = await supplierRepo.findOne({ where: { name } });
    if (!s) {
      s = await supplierRepo.save(supplierRepo.create({ name }));
    }
    return s;
  }

  it('returns listings with catalogue product name and thumbnail when linked', async () => {
    const nvs = await ensureSupplier(Supplier.NVS);
    const mfg = await saveCatalogueManufacturer(manufacturerRepo, 'Test Mfg');
    const product = await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Linked product',
    });
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        supplierProductId: 'SKU-1',
        name: 'Listing display name',
        listedPrice: '12.3400',
      }),
    );

    const res = await service.listSupplierListings({
      page: 1,
      pageSize: 50,
    });

    expect(res.totalCount).toBe(1);
    expect(res.items[0]).toMatchObject({
      name: 'Listing display name',
      supplierName: Supplier.NVS,
      supplierProductId: 'SKU-1',
      listedPrice: '12.3400',
      catalogProductName: 'Linked product',
      thumbnailImage: product.image ?? null,
    });
  });

  it('filters orphans via catalogProductNotLinked filter', async () => {
    const nvs = await ensureSupplier(Supplier.NVS);
    const mfg = await saveCatalogueManufacturer(
      manufacturerRepo,
      'IsNotLinked test Mfg',
    );
    const product = await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Linked row',
    });
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        supplierProductId: 'LINK-2',
        name: 'Linked listing',
        listedPrice: null,
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: null,
        supplierId: nvs.id,
        supplierProductId: 'ORPH-2',
        name: 'Orphan only',
        listedPrice: null,
      }),
    );

    const res = await service.listSupplierListings({
      page: 1,
      pageSize: 50,
      filters: [{ kind: 'catalogProductNotLinked' }],
    });

    expect(res.totalCount).toBe(1);
    expect(res.items[0].name).toBe('Orphan only');
  });
});
