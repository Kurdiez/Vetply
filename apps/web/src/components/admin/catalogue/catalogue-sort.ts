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
        const va = a[sort.fieldId];
        const vb = b[sort.fieldId];
        const sa = va == null ? "" : String(va);
        const sb = vb == null ? "" : String(vb);
        cmp = sa.localeCompare(sb, undefined, { sensitivity: "base" });
        break;
      }
      case CatalogueFilterFieldId.Pom: {
        const na = a.pom === true ? 1 : a.pom === false ? 0 : -1;
        const nb = b.pom === true ? 1 : b.pom === false ? 0 : -1;
        cmp = na - nb;
        break;
      }
      case CatalogueFilterFieldId.Supplier:
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
