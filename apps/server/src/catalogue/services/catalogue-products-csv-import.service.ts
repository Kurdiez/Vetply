import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CatalogueCsvImportRowFailure } from '@vetply/shared';
import {
  CatalogUnitType,
  CatalogueProductImportRow,
  CatalogueProductsImportBatchReq,
  CatalogueProductsImportBatchRes,
  CatalogueProductsImportDeleteMissingBody,
  CatalogueProductsImportDeleteMissingRes,
  LegalCategory,
  SalesCategory,
  catalogueProductsImportBatchResSchema,
  catalogueProductsImportDeleteMissingResSchema,
} from '@vetply/shared';
import type { EntityManager } from 'typeorm';
import { In, Repository } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';

const DELETE_CHUNK = 500;

@Injectable()
export class CatalogueProductsCsvImportService {
  constructor(
    @InjectRepository(CatalogueProductEntity)
    private readonly productRepository: Repository<CatalogueProductEntity>,
  ) {}

  async deleteMissingNotInCsv(
    body: CatalogueProductsImportDeleteMissingBody,
  ): Promise<CatalogueProductsImportDeleteMissingRes> {
    if (body.productIdsInCsv.length === 0) {
      const raw = { deletedCount: 0 };
      return zodResTransform(
        raw,
        catalogueProductsImportDeleteMissingResSchema,
      ) as CatalogueProductsImportDeleteMissingRes;
    }
    const csvSet = new Set(body.productIdsInCsv);
    const deletedCount = await this.deleteProductsNotInSet(csvSet);
    const raw = { deletedCount };
    return zodResTransform(
      raw,
      catalogueProductsImportDeleteMissingResSchema,
    ) as CatalogueProductsImportDeleteMissingRes;
  }

  async importBatch(
    body: CatalogueProductsImportBatchReq,
  ): Promise<CatalogueProductsImportBatchRes> {
    const failures: CatalogueCsvImportRowFailure[] = [];
    let rowsUpserted = 0;

    await this.productRepository.manager.transaction(async (manager) => {
      const productRepo = manager.getRepository(CatalogueProductEntity);

      for (const row of body.rows) {
        const mapped = await this.mapImportRowToUpsert(row, manager);
        if (mapped.outcome === 'failure') {
          failures.push(mapped.failure);
          continue;
        }
        const idTrim = row.id;
        const isNewProduct = idTrim === '';

        if (isNewProduct) {
          const entity = productRepo.create({
            ...mapped.fields,
          });
          try {
            await productRepo.save(entity);
            rowsUpserted += 1;
          } catch (err: unknown) {
            failures.push({
              rowNumber: row.rowNumber,
              column: 'id',
              value: '',
              message:
                err instanceof Error
                  ? err.message
                  : 'Database error while saving',
            });
          }
          continue;
        }

        const existing = await productRepo.findOne({ where: { id: idTrim } });
        const entity =
          existing ??
          productRepo.create({
            id: idTrim,
          });
        Object.assign(entity, mapped.fields);
        try {
          await productRepo.save(entity);
          rowsUpserted += 1;
        } catch (err: unknown) {
          failures.push({
            rowNumber: row.rowNumber,
            column: 'id',
            value: idTrim,
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
      rowsUpserted,
      rowsFailed: failures.length,
      failures,
    };
    return zodResTransform(
      raw,
      catalogueProductsImportBatchResSchema,
    ) as CatalogueProductsImportBatchRes;
  }

  private async deleteProductsNotInSet(csvIdSet: Set<string>): Promise<number> {
    const allRows = await this.productRepository.find({
      select: { id: true },
    });
    const toDelete = allRows.map((r) => r.id).filter((id) => !csvIdSet.has(id));
    let total = 0;
    for (let i = 0; i < toDelete.length; i += DELETE_CHUNK) {
      const chunk = toDelete.slice(i, i + DELETE_CHUNK);
      const result = await this.productRepository.delete({ id: In(chunk) });
      total += result.affected ?? 0;
    }
    return total;
  }

  private async mapImportRowToUpsert(
    row: CatalogueProductImportRow,
    manager: EntityManager,
  ): Promise<
    | {
        outcome: 'ok';
        fields: Pick<
          CatalogueProductEntity,
          | 'name'
          | 'manufacturerId'
          | 'salesCategory'
          | 'legalCategory'
          | 'pom'
          | 'unitType'
          | 'unitQuantity'
          | 'image'
        >;
      }
    | { outcome: 'failure'; failure: CatalogueCsvImportRowFailure }
  > {
    const fail = (
      column: string,
      value: string,
      message: string,
    ): { outcome: 'failure'; failure: CatalogueCsvImportRowFailure } => ({
      outcome: 'failure',
      failure: { rowNumber: row.rowNumber, column, value, message },
    });

    const name = row.name.trim();
    if (name.length === 0) {
      return fail('name', row.name, 'Product name cannot be empty');
    }

    const unitTypeParsed = this.parseUnitType(row.unit_type.trim());
    if (unitTypeParsed === null) {
      return fail('unit_type', row.unit_type, 'Unknown or invalid unit_type');
    }

    const unitQty = row.unit_quantity.trim();
    const qtyNum = Number(unitQty);
    if (
      unitQty.length === 0 ||
      Number.isNaN(qtyNum) ||
      !Number.isFinite(qtyNum) ||
      qtyNum <= 0
    ) {
      return fail(
        'unit_quantity',
        row.unit_quantity,
        'Unit quantity must be a positive number',
      );
    }

    const legal = this.parseNullableEnum(
      row.legal_category.trim(),
      LegalCategory,
    );
    if (legal === 'invalid') {
      return fail(
        'legal_category',
        row.legal_category,
        'Invalid legal_category',
      );
    }

    const sales = this.parseNullableEnum(
      row.sales_category.trim(),
      SalesCategory,
    );
    if (sales === 'invalid') {
      return fail(
        'sales_category',
        row.sales_category,
        'Invalid sales_category',
      );
    }

    const pomParsed = this.parsePom(row.pom.trim());
    if (pomParsed === 'invalid') {
      return fail('pom', row.pom, 'pom must be true, false, or empty');
    }

    const mfgName = row.manufacturer.trim();
    let manufacturerId: string | null = null;
    if (mfgName.length > 0) {
      const resolved = await this.resolveManufacturerIdByName(mfgName, manager);
      if (resolved === null) {
        return fail(
          'manufacturer',
          row.manufacturer,
          'No manufacturer found with this name',
        );
      }
      manufacturerId = resolved;
    }

    const imageTrim = row.image.trim();
    if (imageTrim.length > 2048) {
      return fail('image', row.image, 'image value is too long');
    }
    const image = imageTrim.length === 0 ? null : imageTrim;

    return {
      outcome: 'ok',
      fields: {
        name,
        manufacturerId,
        salesCategory: sales.value,
        legalCategory: legal.value,
        pom: pomParsed.value,
        unitType: unitTypeParsed,
        unitQuantity: unitQty,
        image,
      },
    };
  }

  private parseUnitType(raw: string): CatalogUnitType | null {
    if (raw.length === 0) {
      return null;
    }
    const values = Object.values(CatalogUnitType) as string[];
    const hit = values.find((v) => v === raw);
    return (hit as CatalogUnitType) ?? null;
  }

  private parseNullableEnum<T extends Record<string, string>>(
    raw: string,
    enumObj: T,
  ): { value: T[keyof T] | null } | 'invalid' {
    if (raw.length === 0) {
      return { value: null };
    }
    const values = Object.values(enumObj) as string[];
    if (!values.includes(raw)) {
      return 'invalid';
    }
    return { value: raw as T[keyof T] };
  }

  private parsePom(raw: string): { value: boolean | null } | 'invalid' {
    if (raw.length === 0) {
      return { value: null };
    }
    const lower = raw.toLowerCase();
    if (lower === 'true') {
      return { value: true };
    }
    if (lower === 'false') {
      return { value: false };
    }
    return 'invalid';
  }

  private async resolveManufacturerIdByName(
    name: string,
    manager: EntityManager,
  ): Promise<string | null> {
    const repo = manager.getRepository(CatalogueManufacturerEntity);
    const entity = await repo
      .createQueryBuilder('m')
      .where('LOWER(m.name) = LOWER(:name)', { name })
      .getOne();
    return entity?.id ?? null;
  }
}
