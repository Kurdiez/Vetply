import './jest-setup-env';
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { entitiesToReigster } from '../../database/entities-registry';
import { getMigrationPaths } from '../../database/typeorm-migration-options';
import { setupTestDatabase } from './test-db';

async function applyMigrationsToTestDbOnce() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.VETPLY_TEST_DB_HOST,
    port: parseInt(process.env.VETPLY_TEST_DB_PORT ?? '0', 10),
    username: process.env.VETPLY_TEST_DB_USERNAME,
    password: process.env.VETPLY_TEST_DB_PASSWORD,
    database: process.env.VETPLY_TEST_DB_DATABASE,
    schema: 'public',
    entities: entitiesToReigster as DataSourceOptions['entities'],
    migrations: getMigrationPaths(),
    synchronize: false,
    poolSize: 1,
  });
  await ds.initialize();
  await ds.runMigrations();
  // Keep in sync with CatalogueProductEntity until a tracked migration adds it.
  await ds.query(
    `ALTER TABLE "catalogue_products" ADD COLUMN IF NOT EXISTS "image" character varying(2048)`,
  );
  await ds.destroy();
}

export default async () => {
  const { container } = await setupTestDatabase();

  process.env.VETPLY_TEST_DB_HOST = container.getHost();
  process.env.VETPLY_TEST_DB_PORT = container.getMappedPort(5432).toString();
  process.env.VETPLY_TEST_DB_USERNAME = container.getUsername();
  process.env.VETPLY_TEST_DB_PASSWORD = container.getPassword();
  process.env.VETPLY_TEST_DB_DATABASE = container.getDatabase();

  await applyMigrationsToTestDbOnce();
};
