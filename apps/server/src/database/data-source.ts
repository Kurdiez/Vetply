import 'dotenv/config';
import { DataSource } from 'typeorm';

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
  entities: ['src/database/entities/**/*.entity{.ts,.js}'],
  migrations: [],
  synchronize: true,
  logging: true,
});

export default dataSource;
