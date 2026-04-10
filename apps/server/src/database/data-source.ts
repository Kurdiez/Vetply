import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { entitiesToReigster } from './entities-registry';
import { getMigrationPaths } from './typeorm-migration-options';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: +process.env.DATABASE_PORT!,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  schema: 'public',
  extra: {
    driver: { family: 4 },
  },
  entities: entitiesToReigster as DataSourceOptions['entities'],
  migrations: getMigrationPaths(),
  synchronize: false,
  logging: true,
});

export default dataSource;
