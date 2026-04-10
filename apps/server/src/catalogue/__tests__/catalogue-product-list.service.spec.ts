import { TestingModule } from '@nestjs/testing';
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  LegalCategory,
  SalesCategory,
  catalogueProductsListQuerySchema,
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
import {
  saveCatalogueManufacturer,
  saveCatalogueProduct,
} from '~/commons/test/mockers/catalogue-product.mocker';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
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
      salesCategory: SalesCategory.Dental,
      legalCategory: LegalCategory.GSL_GeneralSalesList,
      pom: false,
    });

    const p2 = await saveCatalogueProduct(productRepo, {
      manufacturerId: alpha.id,
      name: 'Cat Vaccine',
      salesCategory: SalesCategory.VaccinesSA,
      legalCategory: LegalCategory.POM_V,
      pom: true,
    });

    const p3 = await saveCatalogueProduct(productRepo, {
      manufacturerId: beta.id,
      name: 'Horse wormer',
      salesCategory: SalesCategory.EctosEquine,
      legalCategory: LegalCategory.NFA_VPS,
      pom: false,
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

  it('filters name isExactly — positive match', async () => {
    const { p1 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.IsExactly,
          value: 'Dog Vaccine',
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p1.id);
  });

  it('filters name isExactly — negative (no false positives)', async () => {
    await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.IsExactly,
          value: 'Nonexistent Product',
        },
      ],
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

  it('combines AND across filters — name + pom', async () => {
    const { p2 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.Contains,
          value: 'Vaccine',
        },
        {
          kind: 'boolean',
          fieldId: CatalogueFilterFieldId.Pom,
          operator: CatalogueFilterOperator.IsExactly,
          value: true,
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
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.IsExactly,
          value: 'Dog Vaccine',
        },
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

  it('filters salesCategory isExactly', async () => {
    const { p1 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.SalesCategory,
          operator: CatalogueFilterOperator.IsExactly,
          value: SalesCategory.Dental,
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p1.id);
  });

  it('filters salesCategory containsAnyOf', async () => {
    const { p1, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.SalesCategory,
          operator: CatalogueFilterOperator.ContainsAnyOf,
          value: [SalesCategory.Dental, SalesCategory.EctosEquine],
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p1.id, p3.id].sort());
  });

  it('filters salesCategory doesNotContainAnyOf — no false positives', async () => {
    const { p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.SalesCategory,
          operator: CatalogueFilterOperator.DoesNotContainAnyOf,
          value: [SalesCategory.Dental],
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p2.id, p3.id].sort());
  });

  it('filters legalCategory isDistinctFrom', async () => {
    const { p2, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'enum',
          fieldId: CatalogueFilterFieldId.LegalCategory,
          operator: CatalogueFilterOperator.IsDistinctFrom,
          value: LegalCategory.GSL_GeneralSalesList,
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p2.id, p3.id].sort());
  });

  it('filters pom boolean isExactly', async () => {
    const { p2 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'boolean',
          fieldId: CatalogueFilterFieldId.Pom,
          operator: CatalogueFilterOperator.IsExactly,
          value: true,
        },
      ],
    });
    expect(res.totalCount).toBe(1);
    expect(res.items[0].id).toBe(p2.id);
  });

  it('filters string containsAnyOf — OR semantics', async () => {
    const { p1, p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.ContainsAnyOf,
          value: ['Horse', 'Dog'],
        },
      ],
    });
    expect(res.totalCount).toBe(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual([p1.id, p3.id].sort());
  });

  it('filters string doesNotContainAnyOf — AND of exclusions', async () => {
    const { p3 } = await seedThreeProducts();
    const res = await service.listProducts({
      page: 1,
      pageSize: 50,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.DoesNotContainAnyOf,
          value: ['Dog', 'Cat'],
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
        fieldId: CatalogueFilterFieldId.Name,
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
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.Contains,
          value: 'e',
        },
      ],
    });
    const page2 = await service.listProducts({
      page: 2,
      pageSize: 2,
      filters: [
        {
          kind: 'string',
          fieldId: CatalogueFilterFieldId.Name,
          operator: CatalogueFilterOperator.Contains,
          value: 'e',
        },
      ],
    });
    expect(page1.totalCount).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(1);
    const allIds = [...page1.items, ...page2.items].map((i) => i.id);
    expect(new Set(allIds).size).toBe(3);
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
        fieldId: CatalogueFilterFieldId.Name,
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
