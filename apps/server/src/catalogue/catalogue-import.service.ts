import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ImportSupplierPricesBatchReq,
  ImportSupplierPricesBatchRes,
  importSupplierPricesBatchResSchema,
  NvsImportRow,
  Supplier,
} from '@vetply/shared';
import { DataSource, EntityManager } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductVariantEntity } from '~/database/entities/catalogue/catalogue-product-variant.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CatalogueVariantSupplierListingEntity } from '~/database/entities/catalogue/catalogue-variant-supplier-listing.entity';
import {
  parseNvsUom,
  parseNvsVpp,
  parsePom,
  resolveLegalCategory,
  resolveSalesCategory,
} from './nvs-csv-parsers';

const SKIP_REASONS_CAP = 50;

@Injectable()
export class CatalogueImportService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async importNvsBatch(
    body: ImportSupplierPricesBatchReq,
  ): Promise<ImportSupplierPricesBatchRes> {
    if (body.supplier !== Supplier.NVS) {
      throw new BadRequestException('Only NVS imports are supported');
    }

    let rowsImported = 0;
    let rowsSkipped = 0;
    const skipReasonsSample: string[] = [];

    const pushSkip = (reason: string) => {
      rowsSkipped += 1;
      if (skipReasonsSample.length < SKIP_REASONS_CAP) {
        skipReasonsSample.push(reason);
      }
    };

    await this.dataSource.transaction(async (manager) => {
      const supplierEntity = await this.ensureSupplier(manager, Supplier.NVS);
      for (const row of body.rows) {
        const result = await this.importOneNvsRow(
          manager,
          row,
          supplierEntity.id,
        );
        if (result === 'imported') {
          rowsImported += 1;
        } else {
          pushSkip(result);
        }
      }
    });

    const raw = {
      batchIndex: body.batchIndex,
      rowsImported,
      rowsSkipped,
      skipReasonsSample,
    };
    return zodResTransform(
      raw,
      importSupplierPricesBatchResSchema,
    ) as ImportSupplierPricesBatchRes;
  }

  private async ensureSupplier(
    manager: EntityManager,
    supplier: Supplier,
  ): Promise<CatalogueSupplierEntity> {
    const repo = manager.getRepository(CatalogueSupplierEntity);
    let entity = await repo.findOne({ where: { name: supplier } });
    if (!entity) {
      entity = repo.create({ name: supplier });
      entity = await repo.save(entity);
    }
    return entity;
  }

  private async importOneNvsRow(
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
}
