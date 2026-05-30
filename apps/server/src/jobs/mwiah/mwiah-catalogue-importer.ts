import { CatalogUnitType, LegalCategory, SalesCategory } from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { canonicalCatalogueImportProductName } from '~/catalogue/utils/catalogue-product-name-aliases';
import { findExistingCatalogueProductIdForSupplierImport } from '~/catalogue/utils/catalogue-product-import-match';
import {
  parseNvsVpp,
  resolveLegalCategory,
} from '~/catalogue/utils/nvs-csv-parsers';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { updateExistingSupplierListingListedPriceOnly } from '~/catalogue/utils/existing-supplier-listing-reimport';
import type { MwiahProductPreview } from './mwiah-product.types';

async function resolveManufacturerId(
  manager: EntityManager,
  supplierName: string | null,
): Promise<string | null> {
  const name = supplierName?.trim() ?? '';
  if (name === '') {
    return null;
  }
  const manufacturerRepo = manager.getRepository(CatalogueManufacturerEntity);
  let manufacturer = await manufacturerRepo.findOne({ where: { name } });
  if (!manufacturer) {
    manufacturer = manufacturerRepo.create({ name });
    manufacturer = await manufacturerRepo.save(manufacturer);
  }
  return manufacturer.id;
}

function resolveLegalCategoryForMwiah(
  legalGroupRaw: string | null,
): LegalCategory | null {
  const t = legalGroupRaw?.trim() ?? '';
  if (t === '' || t.toUpperCase() === 'N/A') {
    return null;
  }
  return resolveLegalCategory(t);
}

function resolveUnitFieldsForMwiah(row: MwiahProductPreview): {
  unitType: CatalogUnitType;
  unitQuantity: string;
} {
  if (row.unitTypeTarget != null && row.unitQuantityTarget != null) {
    return {
      unitType: row.unitTypeTarget,
      unitQuantity: row.unitQuantityTarget,
    };
  }
  return {
    unitType: CatalogUnitType.EA,
    unitQuantity: '1.000000',
  };
}

export async function importMwiahPreviewRow(
  manager: EntityManager,
  row: MwiahProductPreview,
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
  const salesCategory = row.salesCategoryTarget ?? SalesCategory.Consumables;
  const legalCategory = resolveLegalCategoryForMwiah(row.legalGroupRaw);
  const manufacturerId = await resolveManufacturerId(manager, row.supplierName);
  const unitFields = resolveUnitFieldsForMwiah(row);

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
    manufacturerId,
    name: canonicalCatalogueImportProductName(name),
    salesCategory,
    legalCategory,
    pom: null,
    image: row.image,
    unitType: unitFields.unitType,
    unitQuantity: unitFields.unitQuantity,
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
