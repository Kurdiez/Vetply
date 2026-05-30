import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseMwiahProductsCollectionBody,
  parseMwiahSingleProductBody,
} from '../mwiah-product-api';

const fixturesDir = join(__dirname, '../__fixtures__');

describe('parseMwiahProductsCollectionBody', () => {
  it('parses products and pagination from collection fixture', () => {
    const body = readFileSync(
      join(fixturesDir, 'products-collection-page1.json'),
      'utf8',
    );
    const parsed = parseMwiahProductsCollectionBody(body);
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0].erpNumber).toBe('30315838');
    expect(parsed.pagination).toEqual({
      currentPage: 1,
      totalPages: 2,
      pageSize: 12,
    });
  });

  it('returns empty for invalid json', () => {
    expect(parseMwiahProductsCollectionBody('not-json')).toEqual({
      products: [],
      pagination: null,
    });
  });
});

describe('parseMwiahSingleProductBody', () => {
  it('parses wrapped product from detail fixture', () => {
    const body = readFileSync(
      join(fixturesDir, 'product-detail-30315838.json'),
      'utf8',
    );
    const product = parseMwiahSingleProductBody(body);
    expect(product?.erpNumber).toBe('30315838');
    expect(product?.shortDescription).toContain('Applaws');
  });
});
