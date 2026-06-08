import type { Repository } from 'typeorm';

import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';

export async function createOrphanSupplierListing(
  listingRepo: Repository<CatalogueProductSupplierListingEntity>,
  params: {
    supplierId: string;
    supplierProductId: string;
    name: string;
    listedPrice: string | null;
  },
): Promise<CatalogueProductSupplierListingEntity> {
  const listing = listingRepo.create({
    productId: null,
    supplierId: params.supplierId,
    supplierProductId: params.supplierProductId,
    name: params.name,
    listedPrice: params.listedPrice,
  });
  return listingRepo.save(listing);
}
