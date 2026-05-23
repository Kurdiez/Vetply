import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CatalogueCsvImportRowFailure } from '@vetply/shared';
import type { Supplier } from '@vetply/shared';
import {
  DUPLICATE_CATALOGUE_PRODUCT_MAPPING_FAIL_REASON,
  findDuplicateCatalogueProductIdInSupplierListingsMappingRows,
  SupplierListingsMappingImportBatchReq,
  SupplierListingsMappingImportBatchRes,
  type SupplierListingsMappingImportRow,
  supplierListingsMappingImportBatchResSchema,
} from '@vetply/shared';
import type { EntityManager } from 'typeorm';
import { Not, Repository } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';

@Injectable()
export class CatalogueSupplierListingsMappingImportService {
  constructor(
    @InjectRepository(CatalogueProductSupplierListingEntity)
    private readonly listingRepository: Repository<CatalogueProductSupplierListingEntity>,
  ) {}

  async importBatch(
    body: SupplierListingsMappingImportBatchReq,
  ): Promise<SupplierListingsMappingImportBatchRes> {
    const duplicateFailReason =
      findDuplicateCatalogueProductIdInSupplierListingsMappingRows(body.rows);
    if (duplicateFailReason !== null) {
      throw new BadRequestException({ failReason: duplicateFailReason });
    }

    const failures: CatalogueCsvImportRowFailure[] = [];
    let rowsUpdated = 0;

    await this.listingRepository.manager.transaction(async (manager) => {
      const supplierId = await this.resolveSupplierId(body.supplier, manager);
      if (supplierId === null) {
        for (const row of body.rows) {
          failures.push({
            rowNumber: row.rowNumber,
            column: 'supplier',
            value: body.supplier,
            message: 'Supplier not found in catalogue',
          });
        }
        return;
      }

      await this.assertNoExistingSupplierProductConflict(
        body.rows,
        supplierId,
        manager,
      );

      const listingRepo = manager.getRepository(
        CatalogueProductSupplierListingEntity,
      );
      const productRepo = manager.getRepository(CatalogueProductEntity);

      for (const row of body.rows) {
        const listing = await listingRepo.findOne({ where: { id: row.id } });
        if (!listing) {
          failures.push({
            rowNumber: row.rowNumber,
            column: 'id',
            value: row.id,
            message: 'Supplier listing not found',
          });
          continue;
        }
        if (listing.supplierId !== supplierId) {
          failures.push({
            rowNumber: row.rowNumber,
            column: 'id',
            value: row.id,
            message: 'Listing does not belong to the selected supplier',
          });
          continue;
        }

        const nameTrim = row.name.trim();
        if (nameTrim.length === 0) {
          failures.push({
            rowNumber: row.rowNumber,
            column: 'name',
            value: row.name,
            message: 'name cannot be empty',
          });
          continue;
        }

        const productIdParsed = this.parseProductId(
          row.catalogue_product_id.trim(),
          row.rowNumber,
          row.catalogue_product_id,
        );
        if (productIdParsed.outcome === 'failure') {
          failures.push(productIdParsed.failure);
          continue;
        }

        if (productIdParsed.value !== null) {
          const product = await productRepo.findOne({
            where: { id: productIdParsed.value },
          });
          if (!product) {
            failures.push({
              rowNumber: row.rowNumber,
              column: 'catalogue_product_id',
              value: row.catalogue_product_id,
              message: 'Catalogue product not found',
            });
            continue;
          }
        }

        const priceParsed = this.parseListedPrice(row.listed_price.trim());
        if (priceParsed === 'invalid') {
          failures.push({
            rowNumber: row.rowNumber,
            column: 'listed_price',
            value: row.listed_price,
            message: 'listed_price must be a non-negative number',
          });
          continue;
        }

        listing.productId = productIdParsed.value;
        listing.name = nameTrim;
        listing.listedPrice = priceParsed;
        try {
          await listingRepo.save(listing);
          rowsUpdated += 1;
        } catch (err: unknown) {
          failures.push({
            rowNumber: row.rowNumber,
            column: 'id',
            value: row.id,
            message:
              err instanceof Error
                ? err.message
                : 'Database error while saving',
          });
        }
      }
    });

    const raw = {
      batchIndex: body.batchIndex,
      rowsUpdated,
      rowsFailed: failures.length,
      failures,
    };
    return zodResTransform(
      raw,
      supplierListingsMappingImportBatchResSchema,
    ) as SupplierListingsMappingImportBatchRes;
  }

  private async assertNoExistingSupplierProductConflict(
    rows: SupplierListingsMappingImportRow[],
    supplierId: string,
    manager: EntityManager,
  ): Promise<void> {
    const listingRepo = manager.getRepository(
      CatalogueProductSupplierListingEntity,
    );

    for (const row of rows) {
      const trimmed = row.catalogue_product_id.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const parsed = this.parseProductId(
        trimmed,
        row.rowNumber,
        row.catalogue_product_id,
      );
      if (parsed.outcome === 'failure' || parsed.value === null) {
        continue;
      }

      const blocking = await listingRepo.findOne({
        where: {
          supplierId,
          productId: parsed.value,
          id: Not(row.id),
        },
      });
      if (blocking) {
        throw new BadRequestException({
          failReason: DUPLICATE_CATALOGUE_PRODUCT_MAPPING_FAIL_REASON,
        });
      }
    }
  }

  private async resolveSupplierId(
    supplier: Supplier,
    manager: EntityManager,
  ): Promise<string | null> {
    const repo = manager.getRepository(CatalogueSupplierEntity);
    const row = await repo.findOne({ where: { name: supplier } });
    return row?.id ?? null;
  }

  private parseProductId(
    trimmed: string,
    rowNumber: number,
    rawCatalogueProductId: string,
  ):
    | { outcome: 'ok'; value: string | null }
    | { outcome: 'failure'; failure: CatalogueCsvImportRowFailure } {
    if (trimmed.length === 0) {
      return { outcome: 'ok', value: null };
    }
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(trimmed)) {
      return {
        outcome: 'failure',
        failure: {
          rowNumber,
          column: 'catalogue_product_id',
          value: rawCatalogueProductId,
          message: 'catalogue_product_id must be a UUID or empty',
        },
      };
    }
    return { outcome: 'ok', value: trimmed };
  }

  private parseListedPrice(trimmed: string): string | null | 'invalid' {
    if (trimmed.length === 0) {
      return null;
    }
    const n = Number(trimmed);
    if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
      return 'invalid';
    }
    return trimmed;
  }
}
