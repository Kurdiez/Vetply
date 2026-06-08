import { TestingModule } from '@nestjs/testing';
import type { NvsAllProductsImportRow } from '@vetply/shared';
import { Supplier } from '@vetply/shared';
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
    jest.restoreAllMocks();
    await cleanupAllTestResources(dbContext, testModule);
  });

  it('creates orphan listing without creating a catalogue product', async () => {
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
    expect(await productRepo.count()).toBe(0);

    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].supplierProductId).toBe('00001111');
    expect(listings[0].name).toBe('Test widget');
    expect(listings[0].listedPrice).toBe('12.5000');
    expect(listings[0].productId).toBeNull();
  });

  it('updates listed price only without changing listing name', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    await importNvsAllProductsRow(
      dbContext.manager,
      row({ supplierProductId: '00002222', name: 'First', pack: 'EA' }),
      nvs.id,
    );

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

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    expect(await productRepo.count()).toBe(0);

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const listings = await listingRepo.find();
    expect(listings[0].name).toBe('First');
    expect(listings[0].listedPrice).toBe('3.0000');
  });

  it('updates orphan listing only when product was deleted (no relink)', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    const first = await importNvsAllProductsRow(
      dbContext.manager,
      row({ supplierProductId: '00008888', pack: 'EA' }),
      nvs.id,
    );
    expect(first).toBe('imported');

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const orphan = await listingRepo.findOne({
      where: { supplierProductId: '00008888', supplierId: nvs.id },
    });
    expect(orphan?.productId).toBeNull();
    const orphanNameBefore = orphan?.name;

    const second = await importNvsAllProductsRow(
      dbContext.manager,
      row({
        supplierProductId: '00008888',
        pack: 'EA',
        name: 'After orphan',
        listedPrice: '3.00',
      }),
      nvs.id,
    );
    expect(second).toBe('imported');

    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].productId).toBeNull();
    expect(listings[0].name).toBe(orphanNameBefore);
    expect(listings[0].listedPrice).toBe('3.0000');
  });
});
