import { CatalogueManufacturerEntity } from './entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductVariantEntity } from './entities/catalogue/catalogue-product-variant.entity';
import { CatalogueProductEntity } from './entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from './entities/catalogue/catalogue-supplier.entity';
import { CatalogueVariantSupplierListingEntity } from './entities/catalogue/catalogue-variant-supplier-listing.entity';
import { UserEntity } from './entities/user.entity';

export const entitiesToReigster = [
  UserEntity,
  CatalogueManufacturerEntity,
  CatalogueProductEntity,
  CatalogueProductVariantEntity,
  CatalogueSupplierEntity,
  CatalogueVariantSupplierListingEntity,
];
