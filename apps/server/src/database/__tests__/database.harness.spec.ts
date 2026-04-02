import { DataSource } from 'typeorm';
import {
  createTestDbContext,
  createTestingModule,
  setupTestDatabase,
  TestDbContext,
} from '~/commons/test/utils/jest-test-utils';
import { TestingModule } from '@nestjs/testing';

describe('Database harness (testcontainers + transaction rollback)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('runs a query inside a transaction and rolls back', async () => {
    let context: TestDbContext | undefined;
    let testModule: TestingModule | undefined;
    try {
      testModule = await createTestingModule(dataSource);
      context = await createTestDbContext(dataSource);
      const rows = await context.manager.query('SELECT 1 AS one');
      expect(rows[0].one).toBe(1);
    } finally {
      if (context?.queryRunner) {
        await context.queryRunner.rollbackTransaction();
        await context.queryRunner.release();
      }
      if (testModule) {
        await testModule.close();
      }
    }
  });
});
