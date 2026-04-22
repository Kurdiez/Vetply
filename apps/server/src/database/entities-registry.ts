import { CatalogueManufacturerEntity } from './entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from './entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from './entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from './entities/catalogue/catalogue-supplier.entity';
import { UserEntity } from './entities/user.entity';

export const entitiesToReigster = [
  UserEntity,
  CatalogueManufacturerEntity,
  CatalogueProductEntity,
  CatalogueSupplierEntity,
  CatalogueProductSupplierListingEntity,
];
