import { CatalogUnitType, LegalCategory, SalesCategory } from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { canonicalCatalogueImportProductName } from '~/catalogue/utils/catalogue-product-name-aliases';
import { findExistingCatalogueProductIdForSupplierImport } from '~/catalogue/utils/catalogue-product-import-match';
import {
  parseNvsVpp,
  resolveLegalCategory,
  resolveSalesCategory,
} from '~/catalogue/utils/nvs-csv-parsers';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import type { CovetrusProductPreview } from './covetrus-uidl-parse';

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

function resolveLegalCategoryForCovetrus(
  legalGroupRaw: string | null,
): LegalCategory {
  const t = legalGroupRaw?.trim() ?? '';
  if (t === '' || t === 'N/A') {
    return LegalCategory.InstrumentsEquip;
  }
  return resolveLegalCategory(t) ?? LegalCategory.InstrumentsEquip;
}

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
  const salesCategory =
    resolveSalesCategory(row.salesCategoryTarget) ?? SalesCategory.Instruments;
  const legalCategory = resolveLegalCategoryForCovetrus(row.legalGroupRaw);
  const manufacturerId = await resolveManufacturerId(manager, row.supplierName);

  const listingRepo = manager.getRepository(
    CatalogueProductSupplierListingEntity,
  );

  const existingListing = await listingRepo.findOne({
    where: { supplierId, supplierProductId },
    relations: ['product'],
  });

  if (existingListing) {
    if (existingListing.product) {
      const productRepo = manager.getRepository(CatalogueProductEntity);
      const product = existingListing.product;
      product.manufacturerId = manufacturerId;
      product.salesCategory = salesCategory;
      product.legalCategory = legalCategory;
      product.unitType = CatalogUnitType.EA;
      product.unitQuantity = '1.000000';
      product.name = canonicalCatalogueImportProductName(name);
      await productRepo.save(product);

      existingListing.name = name;
      existingListing.listedPrice = listedPrice;
      await listingRepo.save(existingListing);
      return 'imported';
    }

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
    manufacturerId,
    name: canonicalCatalogueImportProductName(name),
    salesCategory,
    legalCategory,
    pom: null,
    image: null,
    unitType: CatalogUnitType.EA,
    unitQuantity: '1.000000',
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
