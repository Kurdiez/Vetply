import { VeenakImportRow } from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { findExistingCatalogueProductIdForSupplierImport } from '../utils/catalogue-product-import-match';
import { parseNvsUom, parseNvsVpp } from '../utils/nvs-csv-parsers';

export async function importVeenakCatalogueRow(
  manager: EntityManager,
  row: VeenakImportRow,
  supplierId: string,
): Promise<'imported' | string> {
  const supplierProductId = row.productId.trim();
  const productName = row.productName.trim();
  if (supplierProductId === '' || productName === '') {
    return 'Missing ProductID or Product Name';
  }
  if (supplierProductId.length > 128) {
    return 'Product ID exceeds 128 characters';
  }

  const listedPrice = parseNvsVpp(row.newPrice);
  const packToken = `${row.packSize} ${row.form}`.trim();
  const uom = parseNvsUom(packToken);
  if (!uom) {
    return `Invalid pack/UoM: ${packToken}`;
  }

  const listingRepo = manager.getRepository(
    CatalogueProductSupplierListingEntity,
  );

  const existingListing = await listingRepo.findOne({
    where: { supplierId, supplierProductId },
    relations: ['product'],
  });

  if (existingListing?.product) {
    existingListing.name = productName;
    existingListing.listedPrice = listedPrice;
    await listingRepo.save(existingListing);
    return 'imported';
  }

  const matchedProductId =
    await findExistingCatalogueProductIdForSupplierImport(manager, {
      supplierId,
      candidateName: productName,
    });

  if (matchedProductId) {
    const listing = listingRepo.create({
      productId: matchedProductId,
      supplierId,
      supplierProductId,
      name: productName,
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
    name: productName,
    image: null,
    unitType: uom.unitType,
    unitQuantity: uom.unitQuantity,
  });
  const savedProduct = await productRepo.save(product);

  const listing = listingRepo.create({
    productId: savedProduct.id,
    supplierId,
    supplierProductId,
    name: productName,
    listedPrice,
  });
  await listingRepo.save(listing);

  return 'imported';
}
