import {
  canonicalizeNvsSupplierProductId,
  type NvsAllProductsImportRow,
} from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { createOrphanSupplierListing } from '~/catalogue/utils/create-orphan-supplier-listing';
import { updateExistingSupplierListingListedPriceOnly } from '~/catalogue/utils/existing-supplier-listing-reimport';
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
    name,
    listedPrice,
  });

  return 'imported';
}
