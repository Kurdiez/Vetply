import { canonicalizeNvsSupplierProductId, NvsImportRow } from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { canonicalCatalogueImportProductName } from '../utils/catalogue-product-name-aliases';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { findExistingCatalogueProductIdForSupplierImport } from '../utils/catalogue-product-import-match';
import { resolveNvsSalesCategory } from '../utils/nvs-sales-group-to-sales-category';
import {
  parseNvsUom,
  parseNvsVpp,
  parsePom,
  resolveLegalCategory,
} from '../utils/nvs-csv-parsers';

export type NvsCatalogueImportRowResult =
  | {
      ok: true;
      outcome:
        | 'updated_existing_listing'
        | 'new_listing_matched_product'
        | 'new_product_and_listing';
    }
  | { ok: false; reason: string };

export async function importNvsCatalogueRow(
  manager: EntityManager,
  row: NvsImportRow,
  supplierId: string,
): Promise<NvsCatalogueImportRowResult> {
  const listingRepo = manager.getRepository(
    CatalogueProductSupplierListingEntity,
  );

  const partNo = canonicalizeNvsSupplierProductId(row.partNo);
  const description = row.description.trim();
  const manufacturerName = row.manufacturer.trim();

  if (partNo === '' || description === '' || manufacturerName === '') {
    return {
      ok: false,
      reason: 'Missing Part No, Description, or Manufacturer',
    };
  }

  if (partNo.length > 128) {
    return { ok: false, reason: 'Part No exceeds 128 characters' };
  }

  const salesCategory = resolveNvsSalesCategory(row.salesGroup);
  if (!salesCategory) {
    return {
      ok: false,
      reason: `Unknown Sales Group: ${row.salesGroup.trim()}`,
    };
  }

  const legalCategory = resolveLegalCategory(row.legalLabel);
  if (!legalCategory) {
    return {
      ok: false,
      reason: `Unknown legal label: ${row.legalLabel.trim()}`,
    };
  }

  const pom = parsePom(row.pom);
  if (pom === null) {
    return { ok: false, reason: `Invalid POM: ${row.pom.trim()}` };
  }

  const uom = parseNvsUom(row.uom);
  if (!uom) {
    return { ok: false, reason: `Invalid UoM: ${row.uom.trim()}` };
  }

  const listedPrice = parseNvsVpp(row.vpp);

  const existingListing = await listingRepo.findOne({
    where: { supplierId, supplierProductId: partNo },
    relations: ['product'],
  });

  if (existingListing?.product) {
    const manufacturerRepo = manager.getRepository(CatalogueManufacturerEntity);
    let manufacturer = await manufacturerRepo.findOne({
      where: { name: manufacturerName },
    });
    if (!manufacturer) {
      manufacturer = manufacturerRepo.create({ name: manufacturerName });
      manufacturer = await manufacturerRepo.save(manufacturer);
    }

    const productRepo = manager.getRepository(CatalogueProductEntity);
    const product = existingListing.product;
    product.manufacturerId = manufacturer.id;
    product.salesCategory = salesCategory;
    product.legalCategory = legalCategory;
    product.pom = pom;
    product.unitType = uom.unitType;
    product.unitQuantity = uom.unitQuantity;
    product.name = canonicalCatalogueImportProductName(description);
    await productRepo.save(product);

    existingListing.name = description;
    existingListing.listedPrice = listedPrice;
    await listingRepo.save(existingListing);
    return { ok: true, outcome: 'updated_existing_listing' };
  }

  const matchedProductId =
    await findExistingCatalogueProductIdForSupplierImport(manager, {
      supplierId,
      candidateName: description,
    });
  if (matchedProductId) {
    const listing = listingRepo.create({
      productId: matchedProductId,
      supplierId,
      supplierProductId: partNo,
      name: description,
      listedPrice,
    });
    await listingRepo.save(listing);
    return { ok: true, outcome: 'new_listing_matched_product' };
  }

  const manufacturerRepo = manager.getRepository(CatalogueManufacturerEntity);
  let manufacturer = await manufacturerRepo.findOne({
    where: { name: manufacturerName },
  });
  if (!manufacturer) {
    manufacturer = manufacturerRepo.create({ name: manufacturerName });
    manufacturer = await manufacturerRepo.save(manufacturer);
  }

  const productRepo = manager.getRepository(CatalogueProductEntity);
  const product = productRepo.create({
    manufacturerId: manufacturer.id,
    name: canonicalCatalogueImportProductName(description),
    salesCategory,
    legalCategory,
    pom,
    unitType: uom.unitType,
    unitQuantity: uom.unitQuantity,
  });
  const savedProduct = await productRepo.save(product);

  const listing = listingRepo.create({
    productId: savedProduct.id,
    supplierId,
    supplierProductId: partNo,
    name: description,
    listedPrice,
  });
  await listingRepo.save(listing);

  return { ok: true, outcome: 'new_product_and_listing' };
}
