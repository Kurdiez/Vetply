import { TestingModule } from '@nestjs/testing';
import type { VeenakImportRow } from '@vetply/shared';
import {
  CatalogUnitType,
  LegalCategory,
  SalesCategory,
  Supplier,
} from '@vetply/shared';
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
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { importVeenakCatalogueRow } from '../importers/veenak-catalogue-importer';
import * as catalogueProductImportMatch from '../utils/catalogue-product-import-match';

function veenakRow(overrides: Partial<VeenakImportRow> = {}): VeenakImportRow {
  return {
    productName: 'Aciclovir 200mg Tablets',
    packSize: '25',
    form: 'Tablets',
    productId: 'ACICLOVIR200T25',
    newPrice: '1.43',
    ...overrides,
  };
}

describe('importVeenakCatalogueRow', () => {
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

  it('creates product and listing when no listing and no name match', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const veenak = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.VEENAK }),
    );

    const r = await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({ productId: 'UNIQUE-ID-1' }),
      veenak.id,
    );
    expect(r).toBe('imported');

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    expect(await productRepo.count()).toBe(1);
    expect(await listingRepo.count()).toBe(1);
    const p = (await productRepo.find())[0];
    expect(p.name).toBe('Aciclovir 200mg Tablets');
    const l = (await listingRepo.find())[0];
    expect(l.supplierProductId).toBe('UNIQUE-ID-1');
    expect(l.listedPrice).toBe('1.4300');
  });

  it('adds listing only when product name matches existing product without this supplier listing', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const nvs = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.NVS }),
    );
    const veenak = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.VEENAK }),
    );
    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );

    const product = await saveCatalogueProduct(productRepo, {
      name: 'Aciclovir 200mg Tablets',
      manufacturerId: null,
      salesCategory: SalesCategory.Consumables,
      legalCategory: LegalCategory.POM_V,
      pom: true,
      unitType: CatalogUnitType.EA,
    });
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvs.id,
        supplierProductId: '00009999',
        name: 'Aciclovir 200mg Tablets',
        listedPrice: '2.0000',
      }),
    );

    const r = await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({ productId: 'VEE-ACIC-1' }),
      veenak.id,
    );
    expect(r).toBe('imported');

    expect(await productRepo.count()).toBe(1);
    expect(await listingRepo.count()).toBe(2);
    const veenakListings = await listingRepo.find({
      where: { supplierId: veenak.id },
    });
    expect(veenakListings).toHaveLength(1);
    expect(veenakListings[0].productId).toBe(product.id);
    expect(veenakListings[0].supplierProductId).toBe('VEE-ACIC-1');
  });

  it('updates listing when supplier product id already exists', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const veenak = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.VEENAK }),
    );

    await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({ productId: 'SAME-ID', productName: 'First' }),
      veenak.id,
    );

    const r = await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({
        productId: 'SAME-ID',
        productName: 'Second',
        newPrice: '9.99',
      }),
      veenak.id,
    );
    expect(r).toBe('imported');

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );
    expect(await productRepo.count()).toBe(1);
    const listings = await listingRepo.find();
    expect(listings).toHaveLength(1);
    expect(listings[0].name).toBe('Second');
    expect(listings[0].listedPrice).toBe('9.9900');
    const products = await productRepo.find();
    expect(products[0].name).toBe('First');
  });

  it('calls smart match only when creating the first listing for a supplier SKU', async () => {
    const spy = jest.spyOn(
      catalogueProductImportMatch,
      'findExistingCatalogueProductIdForSupplierImport',
    );
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const veenak = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.VEENAK }),
    );

    await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({ productId: 'SMART-MATCH-SKU-1' }),
      veenak.id,
    );
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockClear();
    await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({
        productId: 'SMART-MATCH-SKU-1',
        productName: 'Renamed only on listing',
      }),
      veenak.id,
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call smart match when updating an orphan listing', async () => {
    const spy = jest.spyOn(
      catalogueProductImportMatch,
      'findExistingCatalogueProductIdForSupplierImport',
    );
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const veenak = await supplierRepo.save(
      supplierRepo.create({ name: Supplier.VEENAK }),
    );

    await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({ productId: 'ORPHAN-SKU-1' }),
      veenak.id,
    );

    const productRepo = getTestRepository(dbContext, CatalogueProductEntity);
    const pid = (await productRepo.find())[0].id;
    await productRepo.delete({ id: pid });

    spy.mockClear();
    await importVeenakCatalogueRow(
      dbContext.manager,
      veenakRow({
        productId: 'ORPHAN-SKU-1',
        productName: 'Orphan row update',
      }),
      veenak.id,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
