import type { SupplierListingSortFieldId } from '@vetply/shared';

export type SupplierListingSortState = {
  fieldId: SupplierListingSortFieldId;
  direction: 'asc' | 'desc';
} | null;

export function nextSupplierListingSortState(
  current: SupplierListingSortState,
  clickedColumn: SupplierListingSortFieldId,
): SupplierListingSortState {
  if (!current || current.fieldId !== clickedColumn) {
    return { fieldId: clickedColumn, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { fieldId: clickedColumn, direction: 'desc' };
  }
  return null;
}
