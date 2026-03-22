import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

export const createDBConnectionImport = () =>
  TypeOrmModule.forRootAsync({
    name: 'default',
    useFactory: (configService: ConfigService) => ({
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
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [],
      synchronize: true,
    }),
    imports: [ConfigModule],
    inject: [ConfigService],
  });

export const databaseConnections = [createDBConnectionImport()];
