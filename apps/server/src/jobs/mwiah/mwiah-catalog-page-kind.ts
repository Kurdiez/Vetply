import type { Page } from 'playwright';

export const MWIAH_PRODUCT_LIST_PAGE_SELECTOR =
  '[data-test-selector="page_ProductListPage"]';
export const MWIAH_CATEGORY_DETAILS_PAGE_SELECTOR =
  '[data-test-selector="page_CategoryDetailsPage"]';

export type MwiahCatalogPageKind = 'product_list' | 'category_details';

export async function readMwiahCatalogPageKind(
  page: Page,
): Promise<MwiahCatalogPageKind | null> {
  return page.evaluate(
    ([productListSelector, categoryDetailsSelector]) => {
      if (document.querySelector(productListSelector)) {
        return 'product_list';
      }
      if (document.querySelector(categoryDetailsSelector)) {
        return 'category_details';
      }
      return null;
    },
    [
      MWIAH_PRODUCT_LIST_PAGE_SELECTOR,
      MWIAH_CATEGORY_DETAILS_PAGE_SELECTOR,
    ] as const,
  );
}
