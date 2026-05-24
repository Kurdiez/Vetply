import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { saveCatalogueManufacturer } from '~/commons/test/mockers/catalogue-product.mocker';
import {
  cleanupAllTestResources,
  createTestDbContext,
  createTestingModule,
  getTestRepository,
  setupTestDatabase,
  type TestDbContext,
} from '~/commons/test/utils/jest-test-utils';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueManufacturerService } from '../services/catalogue-manufacturer.service';

describe('CatalogueManufacturerService', () => {
  let dataSource: DataSource;
  let dbContext: TestDbContext;
  let testModule: TestingModule;
  let service: CatalogueManufacturerService;
  let manufacturerRepo: ReturnType<
    typeof getTestRepository<CatalogueManufacturerEntity>
  >;

  beforeEach(async () => {
    dataSource = await setupTestDatabase();
    dbContext = await createTestDbContext(dataSource);
    testModule = await createTestingModule(dataSource, {
      providers: [
        {
          provide: CatalogueManufacturerService,
          useFactory: () =>
            new CatalogueManufacturerService(
              getTestRepository(dbContext, CatalogueManufacturerEntity),
            ),
        },
      ],
    });
    service = testModule.get(CatalogueManufacturerService);
    manufacturerRepo = getTestRepository(
      dbContext,
      CatalogueManufacturerEntity,
    );
  });

  afterEach(async () => {
    await cleanupAllTestResources(dbContext, testModule);
  });

  it('lists manufacturers ordered by name', async () => {
    await saveCatalogueManufacturer(manufacturerRepo, 'Zeta Corp');
    await saveCatalogueManufacturer(manufacturerRepo, 'Alpha Labs');

    const list = await service.list();

    expect(list.map((m) => m.name)).toEqual(['Alpha Labs', 'Zeta Corp']);
  });

  it('creates a manufacturer', async () => {
    const created = await service.create({ name: 'New Mfg' });

    expect(created.name).toBe('New Mfg');
    const row = await manufacturerRepo.findOne({ where: { id: created.id } });
    expect(row?.name).toBe('New Mfg');
  });

  it('rejects duplicate name on create', async () => {
    await saveCatalogueManufacturer(manufacturerRepo, 'DupCo');

    await expect(service.create({ name: 'DupCo' })).rejects.toMatchObject({
      response: { failReason: 'DUPLICATE_MANUFACTURER_NAME' },
    });
    await expect(service.create({ name: 'DupCo' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updates a manufacturer name', async () => {
    const existing = await saveCatalogueManufacturer(
      manufacturerRepo,
      'Old Name',
    );

    const updated = await service.update(existing.id, { name: 'New Name' });

    expect(updated).toEqual({ id: existing.id, name: 'New Name' });
  });

  it('throws when updating unknown manufacturer', async () => {
    await expect(
      service.update('00000000-0000-4000-8000-000000000001', {
        name: 'X',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate name on update', async () => {
    await saveCatalogueManufacturer(manufacturerRepo, 'Taken');
    const mine = await saveCatalogueManufacturer(manufacturerRepo, 'Mine');

    await expect(
      service.update(mine.id, { name: 'Taken' }),
    ).rejects.toMatchObject({
      response: { failReason: 'DUPLICATE_MANUFACTURER_NAME' },
    });
  });

  it('allows update to same name', async () => {
    const existing = await saveCatalogueManufacturer(manufacturerRepo, 'Same');

    const updated = await service.update(existing.id, { name: 'Same' });

    expect(updated.name).toBe('Same');
  });
});
