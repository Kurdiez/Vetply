import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '~/database/database.module';
import { UserEntity } from '~/database/entities/user.entity';
import { CatalogueController } from './catalogue.controller';
import { CatalogueImportService } from './catalogue-import.service';
import { SuperUserGuard } from './super-user.guard';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([UserEntity])],
  controllers: [CatalogueController],
  providers: [CatalogueImportService, SuperUserGuard],
})
export class CatalogueModule {}
