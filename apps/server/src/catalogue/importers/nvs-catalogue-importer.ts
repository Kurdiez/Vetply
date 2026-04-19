import { NvsImportRow } from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductVariantEntity } from '~/database/entities/catalogue/catalogue-product-variant.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueVariantSupplierListingEntity } from '~/database/entities/catalogue/catalogue-variant-supplier-listing.entity';
import {
  parseNvsUom,
  parseNvsVpp,
  parsePom,
  resolveLegalCategory,
  resolveSalesCategory,
} from '../utils/nvs-csv-parsers';

export async function importNvsCatalogueRow(
  manager: EntityManager,
  row: NvsImportRow,
  supplierId: string,
): Promise<'imported' | string> {
  const listingRepo = manager.getRepository(
    CatalogueVariantSupplierListingEntity,
  );

  const partNo = row.partNo.trim();
  const description = row.description.trim();
  const manufacturerName = row.manufacturer.trim();

  if (partNo === '' || description === '' || manufacturerName === '') {
    return 'Missing Part No, Description, or Manufacturer';
  }

  if (partNo.length > 128) {
    return 'Part No exceeds 128 characters';
  }

  const salesCategory = resolveSalesCategory(row.salesGroup);
  if (!salesCategory) {
    return `Unknown Sales Group: ${row.salesGroup.trim()}`;
  }

  const legalCategory = resolveLegalCategory(row.legalLabel);
  if (!legalCategory) {
    return `Unknown legal label: ${row.legalLabel.trim()}`;
  }

  const pom = parsePom(row.pom);
  if (pom === null) {
    return `Invalid POM: ${row.pom.trim()}`;
  }

  const uom = parseNvsUom(row.uom);
  if (!uom) {
    return `Invalid UoM: ${row.uom.trim()}`;
  }

  const listedPrice = parseNvsVpp(row.vpp);

  const existingListing = await listingRepo.findOne({
    where: { supplierId, variantRef: partNo },
  });

  if (existingListing) {
    existingListing.name = description;
    existingListing.listedPrice = listedPrice;
    await listingRepo.save(existingListing);
    return 'imported';
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
  let product = await productRepo.findOne({
    where: {
      manufacturerId: manufacturer.id,
      name: description,
      salesCategory,
      legalCategory,
      pom,
    },
  });
  if (!product) {
    product = productRepo.create({
      manufacturerId: manufacturer.id,
      name: description,
      salesCategory,
      legalCategory,
      pom,
    });
    product = await productRepo.save(product);
  }

  const variantName = `${description} (${partNo})`;
  const variantRepo = manager.getRepository(CatalogueProductVariantEntity);

  const variant = variantRepo.create({
    productId: product.id,
    name: variantName,
    unitType: uom.unitType,
    unitQuantity: uom.unitQuantity,
  });
  const savedVariant = await variantRepo.save(variant);

  const listing = listingRepo.create({
    variantId: savedVariant.id,
    supplierId,
    variantRef: partNo,
    name: description,
    listedPrice,
  });
  await listingRepo.save(listing);

  return 'imported';
}
