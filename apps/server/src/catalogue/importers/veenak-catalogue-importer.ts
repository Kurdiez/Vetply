import { VeenakImportRow } from '@vetply/shared';
import { EntityManager, IsNull } from 'typeorm';
import { CatalogueProductVariantEntity } from '~/database/entities/catalogue/catalogue-product-variant.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueVariantSupplierListingEntity } from '~/database/entities/catalogue/catalogue-variant-supplier-listing.entity';
import {
  parseVeenakPackAndForm,
  parseVeenakPrice,
} from '../utils/veenak-csv-parsers';

export async function importVeenakCatalogueRow(
  manager: EntityManager,
  row: VeenakImportRow,
  supplierId: string,
): Promise<'imported' | string> {
  const listingRepo = manager.getRepository(
    CatalogueVariantSupplierListingEntity,
  );

  const productId = row.productId.trim();
  const productName = row.productName.trim();

  if (productId === '' || productName === '') {
    return 'Missing ProductID or Product Name';
  }

  if (productId.length > 128) {
    return 'ProductID exceeds 128 characters';
  }

  const uom = parseVeenakPackAndForm(row.packSize, row.form);
  const listedPrice = parseVeenakPrice(row.newPrice);

  const existingListing = await listingRepo.findOne({
    where: { supplierId, variantRef: productId },
  });

  if (existingListing) {
    existingListing.name = productName;
    existingListing.listedPrice = listedPrice;
    await listingRepo.save(existingListing);
    return 'imported';
  }

  const productRepo = manager.getRepository(CatalogueProductEntity);
  let product = await productRepo.findOne({
    where: {
      manufacturerId: IsNull(),
      name: productName,
      salesCategory: IsNull(),
      legalCategory: IsNull(),
      pom: IsNull(),
    },
  });

  if (!product) {
    product = productRepo.create({
      manufacturerId: null,
      name: productName,
      salesCategory: null,
      legalCategory: null,
      pom: null,
    });
    product = await productRepo.save(product);
  }

  const variantName = `${productName} (${productId})`;
  const variantRepo = manager.getRepository(CatalogueProductVariantEntity);

  const variant = variantRepo.create({
    productId: product.id,
    name: variantName,
    unitType: uom.unitType,
    unitQuantity: uom.unitQuantity,
  });
  const savedVariant = await variantRepo.save(variant);

  const listing = listingRepo.create({
    variantId: savedVariant.id,
    supplierId,
    variantRef: productId,
    name: productName,
    listedPrice,
  });
  await listingRepo.save(listing);

  return 'imported';
}
