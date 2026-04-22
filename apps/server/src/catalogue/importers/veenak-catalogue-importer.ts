import { VeenakImportRow } from '@vetply/shared';
import { EntityManager } from 'typeorm';

/** Veenak catalogue import is not supported after the product/listing schema change. */
export function importVeenakCatalogueRow(
  _manager: EntityManager,
  _row: VeenakImportRow,
  _supplierId: string,
): Promise<'imported' | string> {
  return Promise.resolve('Veenak import not supported after catalogue refactor');
}
