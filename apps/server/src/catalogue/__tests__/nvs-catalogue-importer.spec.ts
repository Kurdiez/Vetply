import { TestingModule } from '@nestjs/testing';
import type { NvsImportRow } from '@vetply/shared';
import {
  CatalogUnitType,
  LegalCategory,
  SalesCategory,
  Supplier,
} from '@vetply/shared';
import { DataSource } from 'typeorm';
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
import * as catalogueProductImportMatch from '../utils/catalogue-product-import-match';

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

  it('creates manufacturer, product, and listing for a new part number', async () => {
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
      outcome: 'new_product_and_listing',
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

    const products = await productRepo.find();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Test product');
    expect(products[0].unitType).toBe(CatalogUnitType.EA);
    expect(products[0].salesCategory).toBe(SalesCategory.Consumables);
    expect(products[0].legalCategory).toBe(LegalCategory.POM_V);
    expect(products[0].pom).toBe(false);

    const mfg = await manufacturerRepo.findOne({
      where: { id: products[0].manufacturerId! },
    });
    expect(mfg?.name).toBe('Acme Vet');

    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].supplierProductId).toBe('PART-1');
    expect(listings[0].listedPrice).toBe('10.0000');
    expect(listings[0].productId).toBe(products[0].id);
  });

  it('updates product and listing when part number already exists', async () => {
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
      outcome: 'updated_existing_listing',
    });

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    const products = await productRepo.find();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Updated name');
    expect(products[0].unitType).toBe(CatalogUnitType.ML);
    expect(products[0].unitQuantity).toBe('250.000000');
    expect(products[0].pom).toBe(true);
    expect(products[0].salesCategory).toBe(SalesCategory.Consumables);
    expect(products[0].legalCategory).toBe(LegalCategory.GSL_GeneralSalesList);

    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].listedPrice).toBe('20.5000');
    expect(listings[0].name).toBe('Updated name');
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
      outcome: 'updated_existing_listing',
    });
    const after = await listingRepo.find();
    expect(after).toHaveLength(1);
    expect(after[0].supplierProductId).toBe('00719870');
    expect(after[0].name).toBe('Same line different padding');
  });

  it('calls smart match only when creating the first listing for a part number', async () => {
    const spy = jest.spyOn(
      catalogueProductImportMatch,
      'findExistingCatalogueProductIdForSupplierImport',
    );
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    await importNvsCatalogueRow(
      dbContext.manager,
      validRow({ partNo: 'PART-SMART-1' }),
      nvs.id,
    );
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockClear();
    await importNvsCatalogueRow(
      dbContext.manager,
      validRow({
        partNo: 'PART-SMART-1',
        description: 'Second import same part',
      }),
      nvs.id,
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call smart match when updating an orphan listing', async () => {
    const spy = jest.spyOn(
      catalogueProductImportMatch,
      'findExistingCatalogueProductIdForSupplierImport',
    );
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );

    await importNvsCatalogueRow(
      dbContext.manager,
      validRow({ partNo: 'PART-ORPH-1' }),
      nvs.id,
    );

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const pid = (await productRepo.find())[0].id;
    await productRepo.delete({ id: pid });

    spy.mockClear();
    await importNvsCatalogueRow(
      dbContext.manager,
      validRow({
        partNo: 'PART-ORPH-1',
        description: 'Orphan listing refresh',
      }),
      nvs.id,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
