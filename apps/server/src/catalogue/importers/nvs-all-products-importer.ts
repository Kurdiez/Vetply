import {
  canonicalizeNvsSupplierProductId,
  type NvsAllProductsImportRow,
} from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { findExistingCatalogueProductIdForSupplierImport } from '../utils/catalogue-product-import-match';
import { parseNvsUom, parseNvsVpp } from '../utils/nvs-csv-parsers';

export async function importNvsAllProductsRow(
  manager: EntityManager,
  row: NvsAllProductsImportRow,
  supplierId: string,
): Promise<'imported' | string> {
  const supplierProductId = canonicalizeNvsSupplierProductId(
    row.supplierProductId,
  );
  const name = row.name.trim();
  const pack = row.pack.trim();
  if (supplierProductId === '' || name === '' || pack === '') {
    return 'Missing supplier product id, name, or pack';
  }
  if (supplierProductId.length > 128) {
    return 'Supplier product id exceeds 128 characters';
  }

  const uom = parseNvsUom(pack);
  if (!uom) {
    return `Invalid pack/UoM: ${pack}`;
  }

  const listedPrice = parseNvsVpp(row.listedPrice);
  const listingRepo = manager.getRepository(
    CatalogueProductSupplierListingEntity,
  );

  const existingListing = await listingRepo.findOne({
    where: { supplierId, supplierProductId },
    relations: ['product'],
  });

  if (existingListing?.product) {
    const productRepo = manager.getRepository(CatalogueProductEntity);
    const product = existingListing.product;
    product.unitType = uom.unitType;
    product.unitQuantity = uom.unitQuantity;
    await productRepo.save(product);

    existingListing.name = name;
    existingListing.listedPrice = listedPrice;
    await listingRepo.save(existingListing);
    return 'imported';
  }

  const matchedProductId =
    await findExistingCatalogueProductIdForSupplierImport(manager, {
      supplierId,
      candidateName: name,
    });
  if (matchedProductId) {
    const listing = listingRepo.create({
      productId: matchedProductId,
      supplierId,
      supplierProductId,
      name,
      listedPrice,
    });
    await listingRepo.save(listing);
    return 'imported';
  }

  const productRepo = manager.getRepository(CatalogueProductEntity);
  const product = productRepo.create({
    manufacturerId: null,
    salesCategory: null,
    legalCategory: null,
    pom: null,
    name,
    image: null,
    unitType: uom.unitType,
    unitQuantity: uom.unitQuantity,
  });
  const savedProduct = await productRepo.save(product);

  const listing = listingRepo.create({
    productId: savedProduct.id,
    supplierId,
    supplierProductId,
    name,
    listedPrice,
  });
  await listingRepo.save(listing);

  return 'imported';
}
