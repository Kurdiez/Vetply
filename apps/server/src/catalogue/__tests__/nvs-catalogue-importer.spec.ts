import { TestingModule } from '@nestjs/testing';
import type { NvsImportRow } from '@vetply/shared';
import { Supplier } from '@vetply/shared';
import { DataSource } from 'typeorm';
import { saveCatalogueProduct } from '~/commons/test/mockers/catalogue-product.mocker';
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
import { importNvsCatalogueRow } from '../importers/nvs-catalogue-importer';

function validRow(overrides: Partial<NvsImportRow> = {}): NvsImportRow {
  return {
    salesGroup: 'Consumables',
    partNo: 'PART-1',
    description: 'Test product',
    uom: 'EA',
    vpp: '£10.00',
    pom: 'No',
    manufacturer: 'Acme Vet',
    legalLabel: 'POM-V',
    ...overrides,
  };
}

describe('importNvsCatalogueRow', () => {
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

  it('creates orphan listing for a new part number without creating a catalogue product', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    const r = await importNvsCatalogueRow(
      dbContext.manager,
      validRow(),
      nvs.id,
    );
    expect(r).toEqual({
      ok: true,
      outcome: 'new_orphan_listing',
    });

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const manufacturerRepo = getTestRepository(
      dbContext,
      CatalogueManufacturerEntity,
    );

    expect(await productRepo.count()).toBe(0);
    expect(await manufacturerRepo.count()).toBe(0);

    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].supplierProductId).toBe('PART-1');
    expect(listings[0].name).toBe('Test product');
    expect(listings[0].listedPrice).toBe('10.0000');
    expect(listings[0].productId).toBeNull();
  });

  it('updates listed price only when part number already exists', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    await importNvsCatalogueRow(dbContext.manager, validRow(), nvs.id);

    const r = await importNvsCatalogueRow(
      dbContext.manager,
      validRow({
        description: 'Updated name',
        uom: '250ML',
        vpp: '£20.50',
        pom: 'Yes',
        legalLabel: 'GSL (General Sales List)',
        manufacturer: 'Other Mfg',
      }),
      nvs.id,
    );
    expect(r).toEqual({
      ok: true,
      outcome: 'updated_orphan_listing',
    });

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    expect(await productRepo.count()).toBe(0);

    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].listedPrice).toBe('20.5000');
    expect(listings[0].name).toBe('Test product');
    expect(listings[0].productId).toBeNull();
  });

  it('stores numeric Part No with leading zeros so it matches all-products ids', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    await importNvsCatalogueRow(
      dbContext.manager,
      validRow({ partNo: '719870' }),
      nvs.id,
    );

    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const first = await listingRepo.find();
    expect(first[0].supplierProductId).toBe('00719870');

    const r = await importNvsCatalogueRow(
      dbContext.manager,
      validRow({
        partNo: '00719870',
        description: 'Same line different padding',
      }),
      nvs.id,
    );
    expect(r).toEqual({
      ok: true,
      outcome: 'updated_orphan_listing',
    });
    const after = await listingRepo.find();
    expect(after).toHaveLength(1);
    expect(after[0].supplierProductId).toBe('00719870');
    expect(after[0].name).toBe('Test product');
    expect(after[0].listedPrice).toBe('10.0000');
  });

  it('reports updated_existing_listing when listing is linked to a catalogue product', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );
    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const product = await saveCatalogueProduct(productRepo, {
      name: 'Linked product',
    });
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        supplierProductId: 'PART-LINKED',
        name: 'Linked listing',
        listedPrice: '5.0000',
      }),
    );

    const r = await importNvsCatalogueRow(
      dbContext.manager,
      validRow({ partNo: 'PART-LINKED', vpp: '£12.00' }),
      nvs.id,
    );
    expect(r).toEqual({
      ok: true,
      outcome: 'updated_existing_listing',
    });
  });
});
