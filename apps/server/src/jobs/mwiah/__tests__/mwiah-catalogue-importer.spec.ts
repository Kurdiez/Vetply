import { TestingModule } from '@nestjs/testing';
import { SalesCategory, Supplier } from '@vetply/shared';
import { DataSource } from 'typeorm';
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
import { importMwiahPreviewRow } from '../mwiah-catalogue-importer';
import type { MwiahProductPreview } from '../mwiah-product.types';

function previewRow(
  overrides: Partial<MwiahProductPreview> = {},
): MwiahProductPreview {
  return {
    supplierProductId: '30081362',
    name: 'Tab Band ID 20" White Collar - Box of 100',
    listedPrice: '30.2400',
    supplierName: 'MWI',
    legalGroupRaw: null,
    categoryUrl:
      'https://onlinestore.mwiah.co.uk/Catalog/consumables/animal-identification/hospitalisation-id',
    productUrl:
      'https://onlinestore.mwiah.co.uk/Product/tab-band-id-20-white-collar-box-of-100-30081362',
    image: null,
    salesCategoryTarget: SalesCategory.Consumables,
    unitTypeTarget: null,
    unitQuantityTarget: null,
    ...overrides,
  };
}

describe('importMwiahPreviewRow', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {});
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cleanupAllTestResources(dbContext, testModule);
  });

  it('creates orphan listing for a new supplier SKU', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const mwiah = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.MWIAH }),
    );

    const r = await importMwiahPreviewRow(
      dbContext.manager,
      previewRow(),
      mwiah.id,
    );
    expect(r).toBe('imported');

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    expect(await productRepo.count()).toBe(0);

    const listing = await listingRepo.findOne({
      where: { supplierProductId: '30081362' },
    });
    expect(listing?.productId).toBeNull();
    expect(listing?.name).toBe('Tab Band ID 20" White Collar - Box of 100');
    expect(listing?.listedPrice).toBe('30.2400');
  });

  it('updates listed price only when listing already exists', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const mwiah = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.MWIAH }),
    );

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({ name: 'Original listing name' }),
      mwiah.id,
    );

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({
        name: 'Updated listing name only',
        listedPrice: '99.9900',
        legalGroupRaw: 'POM-V',
      }),
      mwiah.id,
    );

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    expect(await productRepo.count()).toBe(0);

    const listing = await listingRepo.findOne({
      where: { supplierProductId: '30081362' },
    });
    expect(listing?.name).toBe('Original listing name');
    expect(listing?.listedPrice).toBe('99.9900');
    expect(listing?.productId).toBeNull();
  });

  it('updates orphan listing only when reimporting after manual product unlink', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const mwiah = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.MWIAH }),
    );

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({ supplierProductId: '30562050' }),
      mwiah.id,
    );

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const listing = await listingRepo.findOne({
      where: { supplierProductId: '30562050' },
    });
    expect(listing?.productId).toBeNull();

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({
        supplierProductId: '30562050',
        name: 'Orphan listing update',
        listedPrice: '12.5000',
      }),
      mwiah.id,
    );

    const updated = await listingRepo.findOne({
      where: { supplierProductId: '30562050' },
    });
    expect(updated?.productId).toBeNull();
    expect(updated?.name).toBe('Tab Band ID 20" White Collar - Box of 100');
    expect(updated?.listedPrice).toBe('12.5000');
  });
});
