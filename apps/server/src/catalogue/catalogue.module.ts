import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '~/database/database.module';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { UserEntity } from '~/database/entities/user.entity';
import { CatalogueController } from './controllers/catalogue.controller';
import { SuperUserGuard } from './guards/super-user.guard';
import { CatalogueCsvExportService } from './services/catalogue-csv-export.service';
import { CatalogueSuppliersBootstrapService } from './services/catalogue-suppliers-bootstrap.service';
import { CatalogueImportService } from './services/catalogue-import.service';
import { CatalogueManufacturerService } from './services/catalogue-manufacturer.service';
import { CatalogueProductDetailService } from './services/catalogue-product-detail.service';
import { CatalogueProductListService } from './services/catalogue-product-list.service';
import { CatalogueProductsCsvImportService } from './services/catalogue-products-csv-import.service';
import { CatalogueSupplierListingListService } from './services/catalogue-supplier-listing-list.service';
import { CatalogueSupplierListingsMappingImportService } from './services/catalogue-supplier-listings-mapping-import.service';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      UserEntity,
      CatalogueProductEntity,
      CatalogueProductSupplierListingEntity,
      CatalogueManufacturerEntity,
      CatalogueSupplierEntity,
    ]),
  ],
  controllers: [CatalogueController],
  providers: [
    CatalogueCsvExportService,
    CatalogueSuppliersBootstrapService,
    CatalogueImportService,
    CatalogueProductListService,
    CatalogueSupplierListingListService,
    CatalogueManufacturerService,
    CatalogueProductDetailService,
    CatalogueProductsCsvImportService,
    CatalogueSupplierListingsMappingImportService,
    SuperUserGuard,
  ],
  exports: [CatalogueProductListService, CatalogueProductDetailService],
})
export class CatalogueModule {}
