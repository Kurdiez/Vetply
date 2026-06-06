import {
  MWIAH_CATEGORY_DETAILS_PAGE_SELECTOR,
  MWIAH_PRODUCT_LIST_PAGE_SELECTOR,
  readMwiahCatalogPageKind,
} from '../mwiah-catalog-page-kind';

describe('readMwiahCatalogPageKind', () => {
  it('returns product_list when the product list page marker is present', async () => {
    const page = {
      evaluate: jest.fn(async () => 'product_list'),
    };

    await expect(readMwiahCatalogPageKind(page as never)).resolves.toBe(
      'product_list',
    );
    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), [
      MWIAH_PRODUCT_LIST_PAGE_SELECTOR,
      MWIAH_CATEGORY_DETAILS_PAGE_SELECTOR,
    ]);
  });

  it('returns category_details when the category details page marker is present', async () => {
    const page = {
      evaluate: jest.fn(async () => 'category_details'),
    };

    await expect(readMwiahCatalogPageKind(page as never)).resolves.toBe(
      'category_details',
    );
  });

  it('returns null when neither page marker is present', async () => {
    const page = {
      evaluate: jest.fn(async () => null),
    };

    await expect(readMwiahCatalogPageKind(page as never)).resolves.toBeNull();
  });
});
