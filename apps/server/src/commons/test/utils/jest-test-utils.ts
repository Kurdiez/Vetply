import { Provider } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  DataSource,
  DataSourceOptions,
  EntityManager,
  Repository,
} from 'typeorm';
import { DatabaseModule } from '~/database/database.module';
import { entitiesToReigster } from '~/database/entities-registry';

const OriginalDate = global.Date;
const CONNECTION_TIMEOUT = 30000;

export interface TestDbContext {
  queryRunner: import('typeorm').QueryRunner;
  dataSource: DataSource;
  manager: EntityManager;
}

export interface TestSetupOptions {
  providers?: Provider[];
  mockServices?: Record<string, unknown>;
}

function getDbConfig(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.VETPLY_TEST_DB_HOST,
    port: parseInt(process.env.VETPLY_TEST_DB_PORT ?? '0', 10),
    username: process.env.VETPLY_TEST_DB_USERNAME,
    password: process.env.VETPLY_TEST_DB_PASSWORD,
    database: process.env.VETPLY_TEST_DB_DATABASE,
    schema: 'public',
    entities: entitiesToReigster as DataSourceOptions['entities'],
    synchronize: true,
    poolSize: 5,
    connectTimeoutMS: CONNECTION_TIMEOUT,
  };
}

export async function setupTestDatabase(): Promise<DataSource> {
  const dataSource = new DataSource(getDbConfig());

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error('Database connection timeout')),
      CONNECTION_TIMEOUT,
    );
    dataSource
      .initialize()
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });

  return dataSource;
}

export async function createTestingModule(
  dataSource: DataSource,
  options: TestSetupOptions = {},
): Promise<TestingModule> {
  const { providers = [], mockServices = {} } = options;

  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        ...getDbConfig(),
        autoLoadEntities: true,
      } as TypeOrmModuleOptions),
      DatabaseModule,
    ],
    providers: [
      {
        provide: DataSource,
        useValue: dataSource,
      },
      ...providers,
      ...Object.entries(mockServices).map(
        ([key, value]) =>
          ({
            provide: key,
            useValue: value,
          }) as Provider,
      ),
    ],
  }).compile();
}

export async function createTestDbContext(
  dataSource: DataSource,
): Promise<TestDbContext> {
  const queryRunner = dataSource.createQueryRunner();

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error('Query runner connection timeout')),
      CONNECTION_TIMEOUT,
    );
    queryRunner
      .connect()
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });

  await queryRunner.startTransaction('READ COMMITTED');

  return {
    queryRunner,
    dataSource,
    manager: queryRunner.manager,
  };
}

export async function cleanupAllTestResources(
  context: TestDbContext,
  module: TestingModule,
) {
  try {
    if (context.queryRunner) {
      await context.queryRunner.rollbackTransaction();
      await context.queryRunner.release();
    }

    if (context.dataSource?.isInitialized) {
      await context.dataSource.destroy();
    }

    await module.close();
    global.Date = OriginalDate;
    jest.restoreAllMocks();
  } catch (error) {
    console.error('Error during test cleanup:', error);
    if (context.queryRunner) {
      try {
        await context.queryRunner.release();
      } catch (e) {
        console.error('Failed to force release query runner:', e);
      }
    }
    if (context.dataSource?.isInitialized) {
      try {
        await context.dataSource.destroy();
      } catch (e) {
        console.error('Failed to force destroy data source:', e);
      }
    }
  }
}

export function getTestRepository<T>(
  context: TestDbContext,
  entity: new () => T,
): Repository<T> {
  return context.manager.getRepository(entity);
}
