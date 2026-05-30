import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CatalogUnitType, SalesCategory } from '@vetply/shared';

import { parseMwiahSingleProductBody } from '../mwiah-product-api';
import { parseSupplierProductIdFromProductUrl } from '../mwiah-category-product-href';
import {
  buildMwiahSupplierListingPreview,
  parsePackFromProductName,
} from '../mwiah-supplier-listing-rest-parse';
import { normalizeMwiahSupplierProductId } from '../mwiah-supplier-product-id';
import { resolveMwiahSalesCategoryFromCategoryUrl } from '../mwiah-sales-category';

const fixturesDir = join(__dirname, '../__fixtures__');
const STORE_ORIGIN = 'https://onlinestore.mwiah.co.uk';
const CATEGORY_URL =
  'https://onlinestore.mwiah.co.uk/Catalog/pet-food/everyday-pet-food/cat-and-dog-general-diets';

describe('parseSupplierProductIdFromProductUrl', () => {
  it('parses id from sample product url', () => {
    expect(
      parseSupplierProductIdFromProductUrl(
        'https://onlinestore.mwiah.co.uk/Product/applaws-adult-cat-chicken-breast-and-asparagus-pouch-12-x-70g-30315838',
      ),
    ).toBe('30315838');
  });
});

describe('normalizeMwiahSupplierProductId', () => {
  it('strips leading zeros from padded erp numbers', () => {
    expect(normalizeMwiahSupplierProductId('000000000030081362')).toBe(
      '30081362',
    );
  });

  it('keeps zero when id is all zeros', () => {
    expect(normalizeMwiahSupplierProductId('000')).toBe('0');
  });
});

describe('resolveMwiahSalesCategoryFromCategoryUrl', () => {
  it('maps pet-food segment to Petfood', () => {
    expect(resolveMwiahSalesCategoryFromCategoryUrl(CATEGORY_URL)).toBe(
      SalesCategory.Petfood,
    );
  });
});

describe('parsePackFromProductName', () => {
  it('parses multi-pack gram quantity', () => {
    expect(
      parsePackFromProductName(
        'Applaws Adult Cat Chicken Breast and Asparagus Pouch - 12 x 70g',
      ),
    ).toEqual({ unitType: CatalogUnitType.G, unitQuantity: '840.000000' });
  });

  it('returns null when pack pattern is absent', () => {
    expect(
      parsePackFromProductName('Tab Band ID 20" White Collar - Box of 100'),
    ).toBeNull();
  });
});

describe('buildMwiahSupplierListingPreview', () => {
  it('builds preview from detail api fixture with normalized supplier id', () => {
    const body = readFileSync(
      join(fixturesDir, 'product-detail-30315838.json'),
      'utf8',
    );
    const listProduct = parseMwiahSingleProductBody(body);
    expect(listProduct).not.toBeNull();

    const preview = buildMwiahSupplierListingPreview({
      categoryUrl: CATEGORY_URL,
      storeOrigin: STORE_ORIGIN,
      listItem: listProduct!,
      detailBody: body,
    });
    expect(typeof preview).not.toBe('string');
    if (typeof preview === 'string') {
      throw new Error(preview);
    }
    expect(preview.supplierProductId).toBe('30315838');
    expect(preview.name).toContain('Applaws');
    expect(preview.listedPrice).toBe('12.5000');
    expect(preview.supplierName).toBe('Applaws');
    expect(preview.legalGroupRaw).toBe('POM-V');
    expect(preview.salesCategoryTarget).toBe(SalesCategory.Petfood);
    expect(preview.unitTypeTarget).toBe(CatalogUnitType.G);
  });

  it('leaves legal and unit null when absent from api data', () => {
    const preview = buildMwiahSupplierListingPreview({
      categoryUrl:
        'https://onlinestore.mwiah.co.uk/Catalog/consumables/animal-identification/hospitalisation-id',
      storeOrigin: STORE_ORIGIN,
      listItem: {
        erpNumber: '000000000030562050',
        shortDescription: 'TabBand Identification Collar Green 20" x 100',
        canonicalUrl:
          '/Product/tabband-identification-collar-green-20-x-100-30562050',
        pricing: { unitNetPrice: 25.37 },
      },
      detailBody: null,
    });
    expect(typeof preview).not.toBe('string');
    if (typeof preview === 'string') {
      throw new Error(preview);
    }
    expect(preview.supplierProductId).toBe('30562050');
    expect(preview.legalGroupRaw).toBeNull();
    expect(preview.unitTypeTarget).toBeNull();
    expect(preview.unitQuantityTarget).toBeNull();
  });

  it('returns error when supplier product id missing', () => {
    const result = buildMwiahSupplierListingPreview({
      categoryUrl: CATEGORY_URL,
      storeOrigin: STORE_ORIGIN,
      listItem: { shortDescription: 'No id product' },
      detailBody: null,
    });
    expect(result).toBe('Missing supplier product id');
  });
});
