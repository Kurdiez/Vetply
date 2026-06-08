import { VeenakImportRow } from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { createOrphanSupplierListing } from '~/catalogue/utils/create-orphan-supplier-listing';
import { updateExistingSupplierListingListedPriceOnly } from '~/catalogue/utils/existing-supplier-listing-reimport';
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
  });

  if (existingListing) {
    await updateExistingSupplierListingListedPriceOnly(
      listingRepo,
      existingListing,
      listedPrice,
    );
    return 'imported';
  }

  await createOrphanSupplierListing(listingRepo, {
    supplierId,
    supplierProductId,
    name: productName,
    listedPrice,
  });

  return 'imported';
}
