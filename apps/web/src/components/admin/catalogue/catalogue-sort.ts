import {
  CatalogueListSortFieldId,
  type CatalogueProductListItem,
} from "@vetply/shared";
import type { CatalogueSortFieldId } from "./catalogue-filter-model";

export type CatalogueSortState = {
  fieldId: CatalogueSortFieldId;
  direction: "asc" | "desc";
} | null;

function compareNullableNumberStrings(a: string | null, b: string | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (na < nb) {
    return -1;
  }
  if (na > nb) {
    return 1;
  }
  return 0;
}

export function sortCatalogueItems(
  items: CatalogueProductListItem[],
  sort: CatalogueSortState,
): CatalogueProductListItem[] {
  if (!sort) {
    return items;
  }

  const mult = sort.direction === "asc" ? 1 : -1;
  const copy = [...items];

  copy.sort((a, b) => {
    let cmp = 0;
    switch (sort.fieldId) {
      case CatalogueListSortFieldId.Name:
      case CatalogueListSortFieldId.ManufacturerName: {
        const va = a[sort.fieldId];
        const vb = b[sort.fieldId];
        const sa = va == null ? "" : String(va);
        const sb = vb == null ? "" : String(vb);
        cmp = sa.localeCompare(sb, undefined, { sensitivity: "base" });
        break;
      }
      case CatalogueListSortFieldId.CovetrusPrice:
        cmp = compareNullableNumberStrings(a.covetrusPrice, b.covetrusPrice);
        break;
      case CatalogueListSortFieldId.NvsPrice:
        cmp = compareNullableNumberStrings(a.nvsPrice, b.nvsPrice);
        break;
      case CatalogueListSortFieldId.VeenakPrice:
        cmp = compareNullableNumberStrings(a.veenakPrice, b.veenakPrice);
        break;
      case CatalogueListSortFieldId.Supplier:
      default:
        cmp = 0;
    }
    return cmp * mult;
  });

  return copy;
}

export function nextSortState(
  current: CatalogueSortState,
  clickedColumn: CatalogueSortFieldId,
): CatalogueSortState {
  if (!current || current.fieldId !== clickedColumn) {
    return { fieldId: clickedColumn, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { fieldId: clickedColumn, direction: "desc" };
  }
  return null;
}
