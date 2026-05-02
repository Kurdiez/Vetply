import { TestingModule } from '@nestjs/testing';
import type { NvsAllProductsImportRow } from '@vetply/shared';
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
import { importNvsAllProductsRow } from '../importers/nvs-all-products-importer';

function row(
  overrides: Partial<NvsAllProductsImportRow> = {},
): NvsAllProductsImportRow {
  return {
    supplierProductId: '00009999',
    name: 'Test widget',
    pack: 'EA',
    listedPrice: '12.5000',
    ...overrides,
  };
}

describe('importNvsAllProductsRow', () => {
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

  it('creates product and listing with sparse catalogue fields', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    const r = await importNvsAllProductsRow(
      dbContext.manager,
      row({ supplierProductId: '00001111', pack: '100ML' }),
      nvs.id,
    );
    expect(r).toBe('imported');

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const products = await productRepo.find();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Test widget');
    expect(products[0].manufacturerId).toBeNull();
    expect(products[0].salesCategory).toBeNull();
    expect(products[0].legalCategory).toBeNull();
    expect(products[0].pom).toBeNull();
    expect(products[0].unitType).toBe(CatalogUnitType.ML);
    expect(products[0].unitQuantity).toBe('100.000000');

    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].supplierProductId).toBe('00001111');
    expect(listings[0].listedPrice).toBe('12.5000');
  });

  it('updates existing listing without clearing rich product metadata', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    await importNvsAllProductsRow(
      dbContext.manager,
      row({ supplierProductId: '00002222', name: 'First', pack: 'EA' }),
      nvs.id,
    );

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    let products = await productRepo.find();
    const p0 = products[0];
    p0.salesCategory = SalesCategory.Consumables;
    await productRepo.save(p0);

    const r = await importNvsAllProductsRow(
      dbContext.manager,
      row({
        supplierProductId: '00002222',
        name: 'Second',
        pack: 'PK6',
        listedPrice: '3.00',
      }),
      nvs.id,
    );
    expect(r).toBe('imported');

    products = await productRepo.find();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Second');
    expect(products[0].salesCategory).toBe(SalesCategory.Consumables);
    expect(products[0].unitType).toBe(CatalogUnitType.PK);

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const listings = await listingRepo.find();
    expect(listings[0].name).toBe('Second');
  });
});
