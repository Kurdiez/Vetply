import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '~/config/config.module';
import { entitiesToReigster } from './entities-registry';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      entitiesToReigster as Parameters<typeof TypeOrmModule.forFeature>[0],
    ),
    ConfigModule,
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
