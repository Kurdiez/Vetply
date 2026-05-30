import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildMwiahSupplierListingPreview } from '../mwiah-supplier-listing-rest-parse';
import {
  resolveMwiahProductDetailApiUrl,
  withMwiahProductDetailQueryParams,
} from '../mwiah-product-detail-api';

const fixturesDir = join(__dirname, '../__fixtures__');
const storeOrigin = 'https://onlinestore.mwiah.co.uk';

describe('resolveMwiahProductDetailApiUrl', () => {
  it('uses list item uri when it points at a single product API', () => {
    const url = resolveMwiahProductDetailApiUrl(
      {
        uri: 'https://onlinestore.mwiah.co.uk/api/v2/products/30315838',
      },
      storeOrigin,
    );
    expect(url).toContain('/api/v2/products/30315838');
    expect(url).toContain('expand=detail');
  });

  it('builds url from erp when uri is missing', () => {
    const url = resolveMwiahProductDetailApiUrl(
      { erpNumber: '30315838' },
      storeOrigin,
    );
    expect(url).toBe(
      withMwiahProductDetailQueryParams(
        'https://onlinestore.mwiah.co.uk/api/v2/products/30315838',
      ),
    );
  });
});

describe('buildMwiahSupplierListingPreview detail body', () => {
  it('parses legal properties from detail fixture body', () => {
    const body = readFileSync(
      join(fixturesDir, 'product-detail-30315838.json'),
      'utf8',
    );
    const preview = buildMwiahSupplierListingPreview({
      categoryUrl:
        'https://onlinestore.mwiah.co.uk/Catalog/pet-food/everyday-pet-food/cat-and-dog-general-diets',
      storeOrigin,
      listItem: {},
      detailBody: body,
    });
    expect(typeof preview).not.toBe('string');
    if (typeof preview === 'string') {
      throw new Error(preview);
    }
    expect(preview.legalGroupRaw).toBe('POM-V');
  });
});
