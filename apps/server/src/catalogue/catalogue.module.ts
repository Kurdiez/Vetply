import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '~/database/database.module';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { UserEntity } from '~/database/entities/user.entity';
import { CatalogueController } from './controllers/catalogue.controller';
import { SuperUserGuard } from './guards/super-user.guard';
import { CatalogueImportService } from './services/catalogue-import.service';
import { CatalogueProductDetailService } from './services/catalogue-product-detail.service';
import { CatalogueProductListService } from './services/catalogue-product-list.service';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      UserEntity,
      CatalogueProductEntity,
      CatalogueManufacturerEntity,
    ]),
  ],
  controllers: [CatalogueController],
  providers: [
    CatalogueImportService,
    CatalogueProductListService,
    CatalogueProductDetailService,
    SuperUserGuard,
  ],
})
export class CatalogueModule {}
