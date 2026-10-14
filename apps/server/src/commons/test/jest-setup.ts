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
  // Keep in sync with CatalogueProductSupplierListingEntity until a tracked migration adds them.
  await ds.query(`
    DO $$ BEGIN
      CREATE TYPE "catalogue_product_supplier_listings_product_category_status_enum"
        AS ENUM ('confident', 'needs_review', 'reviewed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await ds.query(`
    ALTER TABLE "catalogue_product_supplier_listings"
      ADD COLUMN IF NOT EXISTS "product_category" character varying(512),
      ADD COLUMN IF NOT EXISTS "product_category_status"
        "catalogue_product_supplier_listings_product_category_status_enum"
  `);
  await ds.query(`
    CREATE INDEX IF NOT EXISTS
      "IDX_catalogue_product_supplier_listings_product_category_status"
      ON "catalogue_product_supplier_listings" ("product_category_status")
  `);
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
