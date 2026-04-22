import { NvsImportRow } from '@vetply/shared';
import { EntityManager } from 'typeorm';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
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
    CatalogueProductSupplierListingEntity,
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
    product.name = description;
    product.salesCategory = salesCategory;
    product.legalCategory = legalCategory;
    product.pom = pom;
    product.unitType = uom.unitType;
    product.unitQuantity = uom.unitQuantity;
    await productRepo.save(product);

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
  const product = productRepo.create({
    manufacturerId: manufacturer.id,
    name: description,
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
    variantRef: partNo,
    name: description,
    listedPrice,
  });
  await listingRepo.save(listing);

  return 'imported';
}
