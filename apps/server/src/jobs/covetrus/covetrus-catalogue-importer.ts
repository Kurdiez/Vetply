import { EntityManager } from 'typeorm';
import { createOrphanSupplierListing } from '~/catalogue/utils/create-orphan-supplier-listing';
import { parseNvsVpp } from '~/catalogue/utils/nvs-csv-parsers';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { updateExistingSupplierListingListedPriceOnly } from '~/catalogue/utils/existing-supplier-listing-reimport';
import type { CovetrusProductPreview } from './covetrus-uidl-parse';

export async function importCovetrusPreviewRow(
  manager: EntityManager,
  row: CovetrusProductPreview,
  supplierId: string,
): Promise<'imported' | string> {
  const supplierProductId = row.supplierProductId.trim();
  const name = row.name.trim();
  if (supplierProductId === '' || name === '') {
    return 'Missing supplier product id or name';
  }
  if (supplierProductId.length > 128) {
    return 'Supplier product id exceeds 128 characters';
  }

  const listedPrice =
    row.listedPrice != null ? parseNvsVpp(row.listedPrice) : null;

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
