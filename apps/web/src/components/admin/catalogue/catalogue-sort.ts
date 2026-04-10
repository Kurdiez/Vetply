import { CatalogueFilterFieldId, type CatalogueProductListItem } from "@vetply/shared";
import type { CatalogueSortFieldId } from "./catalogue-filter-model";

export type CatalogueSortState = {
  fieldId: CatalogueSortFieldId;
  direction: "asc" | "desc";
} | null;

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
      case CatalogueFilterFieldId.Name:
      case CatalogueFilterFieldId.ManufacturerName:
      case CatalogueFilterFieldId.SalesCategory:
      case CatalogueFilterFieldId.LegalCategory: {
        const sa = String(a[sort.fieldId]);
        const sb = String(b[sort.fieldId]);
        cmp = sa.localeCompare(sb, undefined, { sensitivity: "base" });
        break;
      }
      case CatalogueFilterFieldId.Pom: {
        const na = a.pom ? 1 : 0;
        const nb = b.pom ? 1 : 0;
        cmp = na - nb;
        break;
      }
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
