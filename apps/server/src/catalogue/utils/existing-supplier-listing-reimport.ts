import type { Repository } from 'typeorm';

import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';

export async function updateExistingSupplierListingListedPriceOnly(
  listingRepo: Repository<CatalogueProductSupplierListingEntity>,
  existingListing: CatalogueProductSupplierListingEntity,
  listedPrice: string | null,
): Promise<void> {
  existingListing.listedPrice = listedPrice;
  await listingRepo.save(existingListing);
}
