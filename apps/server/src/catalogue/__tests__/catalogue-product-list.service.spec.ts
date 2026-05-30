import { TestingModule } from '@nestjs/testing';
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  CatalogueListSortFieldId,
  CatalogUnitType,
  LegalCategory,
  Supplier,
  catalogueProductsListQuerySchema,
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
import { CatalogueProductListService } from '../services/catalogue-product-list.service';

describe('CatalogueProductListService', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;
  let service: CatalogueProductListService;
  let manufacturerRepo: ReturnType<
    typeof getTestRepository<CatalogueManufacturerEntity>
  >;
  let productRepo: ReturnType<typeof getTestRepository<CatalogueProductEntity>>;

  type Seed = {
    p1: CatalogueProductEntity;
    p2: CatalogueProductEntity;
    p3: CatalogueProductEntity;
  };

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {
      providers: [
        {
          provide: CatalogueProductListService,
          useFactory: () =>
            new CatalogueProductListService(
              getTestRepository(dbContext, CatalogueProductEntity),
            ),
        },
      ],
    });
    service = testModule.get(CatalogueProductListService);
    manufacturerRepo = getTestRepository(
      dbContext,
      CatalogueManufacturerEntity,
    );
    productRepo = getTestRepository(dbContext, CatalogueProductEntity);
  });

  afterEach(async () => {
    await cleanupAllTestResources(dbContext, testModule);
  });

  async function seedThreeProducts(): Promise<Seed> {
    const alpha = await saveCatalogueManufacturer(
      manufacturerRepo,
      'Alpha Pharma',
    );
    const beta = await saveCatalogueManufacturer(manufacturerRepo, 'Beta Labs');

    const p1 = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Dog Vaccine',
    });

    const p2 = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Cat Vaccine',
    });

    const p3 = await saveCatalogueProduct(productRepo, {
      manufacturerId: beta.id,
      name: 'Horse wormer',
    });

    return { p1, p2, p3 };
  }

  it('returns all products with default sort when no filters or sort', async () => {
    const { p1, p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
    });
    expect(res.totalCount).toBe(3);
    expect(res.items.map((i) => i.id).sort()).toEqual(
      [p1.id, p2.id, p3.id].sort(),
    );
  });

  it('maps nullable manufacturer to null in list items', async () => {
    await saveCatalogueProduct(productRepo, {
      manufacturerId: null,
      name: 'Supplier-unknown widget',
    });
    const res = await service.listProducts({ page: 1, pageSize: 50 });
    const row = res.items.find((i) => i.name === 'Supplier-unknown widget');
    expect(row).toBeDefined();
    expect(row!.manufacturerName).toBeNull();
    expect(row!.covetrusPrice).toBeNull();
    expect(row!.nvsPrice).toBeNull();
    expect(row!.veenakPrice).toBeNull();
    expect(row!.mwiahPrice).toBeNull();
  });

  it('name search q matches product.name as ILIKE substring', async () => {
    const { p1 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Dog Vaccine',
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p1.id);
  });

  it('name search q — negative when no substring match', async () => {
    await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Nonexistent Product',
    });
    expect(res.totalCount).toBe(0);
    expect(res.items).toHaveLength(0);
  });

  it('filters manufacturerName contains — positive', async () => {
    const { p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.Contains,
          value: 'Beta',
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p3.id);
  });

  it('filters manufacturerName doesNotContain — excludes matches only', async () => {
    const { p1, p2 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.DoesNotContain,
          value: 'Beta',
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p1.id, p2.id].sort());
  });

  it('combines AND across filters — name search q + manufacturer', async () => {
    const { p2 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Cat Vaccine',
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.Contains,
          value: 'Alpha',
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p2.id);
  });

  it('combines AND — impossible combination returns empty', async () => {
    await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      q: 'Dog Vaccine',
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.Contains,
          value: 'Beta',
        },
      ],
    });
    expect(res.totalCount).toBe(0);
  });

  it('filters manufacturerName containsAnyOf — OR semantics', async () => {
    const { p1, p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.ContainsAnyOf,
          value: ['Beta', 'Alpha'],
        },
      ],
    });
    expect(res.totalCount).toBe(3);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it('filters manufacturerName doesNotContainAnyOf — AND of exclusions', async () => {
    const { p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: CatalogueFilterOperator.DoesNotContainAnyOf,
          value: ['Alpha', 'Cat'],
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p3.id);
  });

  it('sorts by name ascending', async () => {
    await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      sort: {
        fieldId: CatalogueListSortFieldId.Name,
        direction: 'asc',
      },
    });
    expect(res.items.map((i) => i.name)).toEqual([
      'Cat Vaccine',
      'Dog Vaccine',
      'Horse wormer',
    ]);
  });

  it('paginates after filters', async () => {
    await seedThreeProducts();
    const page1 = await service.listProducts({
      page: 1,
      pageSize: 2,
      q: 'e',
    });
    const page2 = await service.listProducts({
      page: 2,
      pageSize: 2,
      q: 'e',
    });
    expect(page1.totalCount).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(1);
    const allIds = [...page1.items, ...page2.items].map((i) => i.id);
    expect(new Set(allIds).size).toBe(3);
  });

  it('filters supplier isExactly — NVS listing only', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );

    let nvsSupplier = await supplierRepo.findOne({
      where: { name: Supplier.NVS },
    });
    if (!nvsSupplier) {
      nvsSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.NVS }),
      );
    }
    let veenakSupplier = await supplierRepo.findOne({
      where: { name: Supplier.VEENAK },
    });
    if (!veenakSupplier) {
      veenakSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.VEENAK }),
      );
    }

    const alpha = await saveCatalogueManufacturer(manufacturerRepo, 'Mfg A');
    const productNvs = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Listed NVS only',
    });
    const productVeenak = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Listed Veenak only',
    });

    await listingRepo.save(
      listingRepo.create({
        productId: productNvs.id,
        supplierId: nvsSupplier.id,
        supplierProductId: 'NVS-REF-1',
        name: 'Listed NVS only',
        listedPrice: '10.0000',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: productVeenak.id,
        supplierId: veenakSupplier.id,
        supplierProductId: 'VEE-REF-1',
        name: 'Listed Veenak only',
        listedPrice: '20.0000',
      }),
    );

    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Supplier,
          operator: CatalogueFilterOperator.IsExactly,
          value: Supplier.NVS,
        },
      ],
    });

    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(productNvs.id);
  });

  it('returns per-supplier NVS, Veenak, Covetrus, and MWIAH prices on list items', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );

    const ensureSupplier = async (name: Supplier) => {
      let s = await supplierRepo.findOne({ where: { name } });
      if (!s) {
        s = await supplierRepo.save(supplierRepo.create({ name }));
      }
      return s;
    };

    const nvsSupplier = await ensureSupplier(Supplier.NVS);
    const veenakSupplier = await ensureSupplier(Supplier.VEENAK);
    const covetrusSupplier = await ensureSupplier(Supplier.COVETRUS);
    const mwiahSupplier = await ensureSupplier(Supplier.MWIAH);

    const alpha = await saveCatalogueManufacturer(
      manufacturerRepo,
      'Mfg Multi',
    );
    const product = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Multi-supplier product',
    });

    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: nvsSupplier.id,
        supplierProductId: 'REF-NVS',
        name: 'Multi-supplier product',
        listedPrice: '99.0000',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: veenakSupplier.id,
        supplierProductId: 'REF-VEE',
        name: 'Multi-supplier product',
        listedPrice: '5.5000',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: covetrusSupplier.id,
        supplierProductId: 'REF-COV',
        name: 'Multi-supplier product',
        listedPrice: '12.3400',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: product.id,
        supplierId: mwiahSupplier.id,
        supplierProductId: 'REF-MWIAH',
        name: 'Multi-supplier product',
        listedPrice: '7.8900',
      }),
    );

    const res = await service.listProducts({ page: 1, pageSize: 50 });
    const row = res.items.find((i) => i.id === product.id);
    expect(row).toBeDefined();
    expect(row!.nvsPrice).toBe('99.00');
    expect(row!.veenakPrice).toBe('5.50');
    expect(row!.covetrusPrice).toBe('12.34');
    expect(row!.mwiahPrice).toBe('7.89');
  });

  it('sorts by nvsPrice ascending', async () => {
    const supplierRepo = getTestRepository(dbContext, CatalogueSupplierEntity);
    const listingRepo = getTestRepository(
      dbContext,
      CatalogueProductSupplierListingEntity,
    );

    let nvsSupplier = await supplierRepo.findOne({
      where: { name: Supplier.NVS },
    });
    if (!nvsSupplier) {
      nvsSupplier = await supplierRepo.save(
        supplierRepo.create({ name: Supplier.NVS }),
      );
    }

    const mfg = await saveCatalogueManufacturer(manufacturerRepo, 'Mfg S');
    const cheap = await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Cheap NVS',
    });
    const expensive = await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Expensive NVS',
    });
    await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'No NVS listing',
    });

    await listingRepo.save(
      listingRepo.create({
        productId: cheap.id,
        supplierId: nvsSupplier.id,
        supplierProductId: 'C1',
        name: 'Cheap NVS',
        listedPrice: '1.0000',
      }),
    );
    await listingRepo.save(
      listingRepo.create({
        productId: expensive.id,
        supplierId: nvsSupplier.id,
        supplierProductId: 'E1',
        name: 'Expensive NVS',
        listedPrice: '100.0000',
      }),
    );

    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      sort: { fieldId: CatalogueListSortFieldId.NvsPrice, direction: 'asc' },
    });

    const names = res.items.map((i) => i.name);
    const idxCheap = names.indexOf('Cheap NVS');
    const idxExpensive = names.indexOf('Expensive NVS');
    const idxNone = names.indexOf('No NVS listing');
    expect(idxCheap).toBeGreaterThanOrEqual(0);
    expect(idxExpensive).toBeGreaterThanOrEqual(0);
    expect(idxNone).toBeGreaterThanOrEqual(0);
    expect(idxCheap).toBeLessThan(idxExpensive);
    expect(idxExpensive).toBeLessThan(idxNone);
  });

  it('listProductsForPicker returns at most three rows ordered by name', async () => {
    const mfg = await saveCatalogueManufacturer(manufacturerRepo, 'Picker Mfg');
    const ids: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const p = await saveCatalogueProduct(productRepo, {
        manufacturerId: mfg.id,
        name: `Picker item ${i}`,
      });
      ids.push(p.id);
    }
    const res = await service.listProductsForPicker({ q: 'Picker item' });
    expect(res.items.length).toBe(3);
    const names = res.items.map((r) => r.name);
    expect(names).toEqual(['Picker item 0', 'Picker item 1', 'Picker item 2']);
    expect(res.items.every((row) => ids.includes(row.id))).toBe(true);
  });

  it('listProductsForPicker applies legalCategory and unit filters', async () => {
    const mfg = await saveCatalogueManufacturer(manufacturerRepo, 'FilterCo');
    await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Match pick',
      legalCategory: LegalCategory.POM_V,
      unitType: CatalogUnitType.EA,
      unitQuantity: '10.000000',
    });
    await saveCatalogueProduct(productRepo, {
      manufacturerId: mfg.id,
      name: 'Wrong category',
      legalCategory: LegalCategory.Consumables,
      unitType: CatalogUnitType.EA,
      unitQuantity: '10.000000',
    });

    const res = await service.listProductsForPicker({
      q: 'Match',
      legalCategory: LegalCategory.POM_V,
      unitType: CatalogUnitType.EA,
      unitQuantity: '10',
    });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].name).toBe('Match pick');
  });
});

describe('catalogueProductsListQuerySchema (filters/sort)', () => {
  it('rejects invalid JSON in filters', () => {
    const r = catalogueProductsListQuerySchema.safeParse({
      page: '1',
      pageSize: '50',
      filters: '{not json',
    });
    expect(r.success).toBe(false);
  });

  it('parses valid filters JSON string', () => {
    const filters = [
      {
        kind: 'string',
        fieldId: CatalogueFilterFieldId.ManufacturerName,
        operator: CatalogueFilterOperator.Contains,
        value: 'x',
      },
    ];
    const r = catalogueProductsListQuerySchema.safeParse({
      page: '1',
      pageSize: '50',
      filters: JSON.stringify(filters),
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.filters).toEqual(filters);
    }
  });
});
