import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ImportSupplierPricesBatchReq,
  ImportSupplierPricesBatchRes,
  importSupplierPricesBatchResSchema,
  Supplier,
} from '@vetply/shared';
import { DataSource, EntityManager } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { importNvsAllProductsRow } from '../importers/nvs-all-products-importer';
import { importNvsCatalogueRow } from '../importers/nvs-catalogue-importer';
import { importVeenakCatalogueRow } from '../importers/veenak-catalogue-importer';

const SKIP_REASONS_CAP = 50;

@Injectable()
export class CatalogueImportService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async importSupplierPricesBatch(
    body: ImportSupplierPricesBatchReq,
  ): Promise<ImportSupplierPricesBatchRes> {
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
      const supplierEntity = await this.ensureSupplier(manager, body.supplier);
      if (body.supplier === Supplier.NVS) {
        if (body.nvsFormat === 'non_pom_csv') {
          for (const row of body.rows) {
            const result = await importNvsCatalogueRow(
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
        } else {
          for (const row of body.rows) {
            const result = await importNvsAllProductsRow(
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
        }
        return;
      }
      if (body.supplier === Supplier.VEENAK) {
        for (const row of body.rows) {
          const result = await importVeenakCatalogueRow(
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
        return;
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
}
