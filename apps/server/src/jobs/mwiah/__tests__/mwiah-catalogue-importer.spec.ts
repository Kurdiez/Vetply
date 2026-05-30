import { TestingModule } from '@nestjs/testing';
import { CatalogUnitType, SalesCategory, Supplier } from '@vetply/shared';
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
import * as catalogueProductImportMatch from '~/catalogue/utils/catalogue-product-import-match';
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

  it('updates listed price only when listing is linked to a catalogue product', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const mwiah = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.MWIAH }),
    );

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({ name: 'Original listing name' }),
      mwiah.id,
    );

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const productsBefore = await productRepo.find();
    expect(productsBefore[0].name).toBe('Original listing name');

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({
        name: 'Updated listing name only',
        listedPrice: '99.9900',
        legalGroupRaw: 'POM-V',
      }),
      mwiah.id,
    );

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const listing = await listingRepo.findOne({
      where: { supplierProductId: '30081362' },
    });
    expect(listing?.name).toBe('Original listing name');
    expect(listing?.listedPrice).toBe('99.9900');

    const productsAfter = await productRepo.find();
    expect(productsAfter[0].name).toBe('Original listing name');
    expect(productsAfter[0].legalCategory).toBeNull();
  });

  it('does not call smart match when updating an orphan listing', async () => {
    const spy = jest.spyOn(
      catalogueProductImportMatch,
      'findExistingCatalogueProductIdForSupplierImport',
    );
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const mwiah = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.MWIAH }),
    );

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({ supplierProductId: '30562050' }),
      mwiah.id,
    );

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const productId = (await productRepo.find())[0].id;
    await productRepo.delete({ id: productId });

    spy.mockClear();
    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({
        supplierProductId: '30562050',
        name: 'Orphan listing update',
        listedPrice: '12.5000',
      }),
      mwiah.id,
    );

    expect(spy).not.toHaveBeenCalled();

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const listing = await listingRepo.findOne({
      where: { supplierProductId: '30562050' },
    });
    expect(listing?.productId).toBeNull();
    expect(listing?.name).toBe('Tab Band ID 20" White Collar - Box of 100');
    expect(listing?.listedPrice).toBe('12.5000');
  });

  it('calls smart match only when creating the first listing for a supplier SKU', async () => {
    const spy = jest.spyOn(
      catalogueProductImportMatch,
      'findExistingCatalogueProductIdForSupplierImport',
    );
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const mwiah = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.MWIAH }),
    );

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({ supplierProductId: 'SMART-1' }),
      mwiah.id,
    );
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockClear();
    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({
        supplierProductId: 'SMART-1',
        name: 'Second import same SKU',
      }),
      mwiah.id,
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('links a new listing to an existing catalogue product when smart match finds one', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const mwiah = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.MWIAH }),
    );
    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const existingProduct = await productRepo.save(
      productRepo.create({
        manufacturerId: null,
        name: 'Tab Band ID 20" White Collar - Box of 100',
        salesCategory: SalesCategory.Consumables,
        legalCategory: null,
        pom: null,
        image: null,
        unitType: CatalogUnitType.EA,
        unitQuantity: '1.000000',
      }),
    );

    jest
      .spyOn(
        catalogueProductImportMatch,
        'findExistingCatalogueProductIdForSupplierImport',
      )
      .mockResolvedValue(existingProduct.id);

    await importMwiahPreviewRow(
      dbContext.manager,
      previewRow({ supplierProductId: 'NEW-SKU-99' }),
      mwiah.id,
    );

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const listing = await listingRepo.findOne({
      where: { supplierProductId: 'NEW-SKU-99' },
    });
    expect(listing?.productId).toBe(existingProduct.id);
    expect(await productRepo.count()).toBe(1);
  });
});
