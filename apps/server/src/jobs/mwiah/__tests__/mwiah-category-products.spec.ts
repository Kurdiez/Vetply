import type { Page } from 'playwright';

import { MwiahProductApiCapture } from '../mwiah-product-api-capture';
import { scrapeMwiahCategoryProducts } from '../mwiah-category-products';
import * as categoryProductLinks from '../mwiah-category-product-links';
import * as productDetailApi from '../mwiah-product-detail-api';

jest.mock('../mwiah-category-product-links');
jest.mock('../mwiah-product-detail-api');

const openMwiahCategoryListPage = jest.mocked(
  categoryProductLinks.openMwiahCategoryListPage,
);
const resolveListProductsForCurrentPage = jest.mocked(
  categoryProductLinks.resolveListProductsForCurrentPage,
);
const fetchMwiahProductDetailBody = jest.mocked(
  productDetailApi.fetchMwiahProductDetailBody,
);

describe('scrapeMwiahCategoryProducts', () => {
  const page = {} as Page;
  const categoryUrl =
    'https://onlinestore.mwiah.co.uk/Catalog/pet-food/everyday-pet-food';
  const storeOrigin = 'https://onlinestore.mwiah.co.uk';

  beforeEach(() => {
    jest.clearAllMocks();
    openMwiahCategoryListPage.mockResolvedValue(undefined);
    fetchMwiahProductDetailBody.mockResolvedValue(null);
  });

  it('processes each list page end-to-end before moving to the next', async () => {
    const capture = new MwiahProductApiCapture();
    jest
      .spyOn(capture, 'getPagination')
      .mockReturnValue({ currentPage: 1, totalPages: 2, pageSize: 12 });

    resolveListProductsForCurrentPage
      .mockResolvedValueOnce([
        {
          erpNumber: '30315838',
          canonicalUrl:
            '/Product/applaws-adult-cat-chicken-breast-and-asparagus-pouch-12-x-70g-30315838',
        },
      ])
      .mockResolvedValueOnce([
        {
          erpNumber: '30315839',
          canonicalUrl:
            '/Product/applaws-adult-cat-chicken-breast-and-asparagus-pouch-12-x-70g-30315839',
        },
      ]);

    const persistPagePreviews = jest
      .fn()
      .mockResolvedValue({ imported: 1, skipped: 0 });
    const onListPageProcessed = jest.fn();

    const result = await scrapeMwiahCategoryProducts(
      page,
      categoryUrl,
      storeOrigin,
      capture,
      { persistPagePreviews, onListPageProcessed },
    );

    expect(openMwiahCategoryListPage).toHaveBeenCalledTimes(2);
    expect(openMwiahCategoryListPage).toHaveBeenNthCalledWith(
      1,
      page,
      categoryUrl,
      1,
      capture,
    );
    expect(openMwiahCategoryListPage).toHaveBeenNthCalledWith(
      2,
      page,
      categoryUrl,
      2,
      capture,
    );
    expect(persistPagePreviews).toHaveBeenCalledTimes(2);
    expect(onListPageProcessed).toHaveBeenCalledTimes(2);
    expect(onListPageProcessed).toHaveBeenNthCalledWith(1, {
      pageNumber: 1,
      totalPages: 2,
      productsProcessed: 1,
      imported: 1,
      skipped: 0,
    });
    expect(onListPageProcessed).toHaveBeenNthCalledWith(2, {
      pageNumber: 2,
      totalPages: 2,
      productsProcessed: 1,
      imported: 1,
      skipped: 0,
    });
    expect(result).toEqual({
      listPagesVisited: 2,
      productsProcessed: 2,
      imported: 2,
      skipped: 0,
    });
  });
});
