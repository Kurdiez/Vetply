import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { entitiesToReigster } from './entities-registry';
import { getMigrationPaths } from './typeorm-migration-options';

export const createDBConnectionImport = () =>
  TypeOrmModule.forRootAsync({
    name: 'default',
    useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
      type: 'postgres',
      host: configService.get('DATABASE_HOST'),
      port: configService.get('DATABASE_PORT'),
      username: configService.get('DATABASE_USER'),
      password: configService.get('DATABASE_PASSWORD'),
      database: configService.get('DATABASE_NAME'),
      schema: 'public',
      extra: {
        driver: { family: 4 },
      },
      entities: entitiesToReigster,
      migrations: getMigrationPaths(),
      synchronize: false,
      migrationsRun: process.env.TYPEORM_MIGRATIONS_RUN === 'true',
    }),
    imports: [ConfigModule],
    inject: [ConfigService],
  });

export const databaseConnections = [createDBConnectionImport()];
