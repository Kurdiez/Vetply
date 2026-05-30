import {
  isMwiahProductDetailHref,
  isMwiahProductHrefUnderCategory,
  normalizeMwiahPathname,
  parseSupplierProductIdFromProductUrl,
} from '../mwiah-category-product-href';

describe('normalizeMwiahPathname', () => {
  it('normalizes absolute urls and trailing slashes', () => {
    expect(
      normalizeMwiahPathname(
        'https://onlinestore.mwiah.co.uk/Catalog/pet-food/everyday-pet-food/cat-and-dog-general-diets/',
      ),
    ).toBe('/Catalog/pet-food/everyday-pet-food/cat-and-dog-general-diets');
  });
});

describe('isMwiahProductDetailHref', () => {
  it('accepts /Product/slug-id paths', () => {
    expect(
      isMwiahProductDetailHref(
        '/Product/applaws-adult-cat-chicken-breast-and-asparagus-pouch-12-x-70g-30315838',
      ),
    ).toBe(true);
  });

  it('rejects category catalog paths', () => {
    expect(
      isMwiahProductDetailHref('/Catalog/pet-food/everyday-pet-food'),
    ).toBe(false);
  });
});

describe('parseSupplierProductIdFromProductUrl', () => {
  it('parses trailing numeric id from product url', () => {
    expect(
      parseSupplierProductIdFromProductUrl(
        'https://onlinestore.mwiah.co.uk/Product/applaws-adult-cat-chicken-breast-and-asparagus-pouch-12-x-70g-30315838',
      ),
    ).toBe('30315838');
  });

  it('returns null when id suffix missing', () => {
    expect(
      parseSupplierProductIdFromProductUrl(
        'https://onlinestore.mwiah.co.uk/Product/no-id-suffix',
      ),
    ).toBeNull();
  });
});

describe('isMwiahProductHrefUnderCategory', () => {
  const category =
    '/Catalog/pet-food/everyday-pet-food/cat-and-dog-general-diets';

  it('accepts /Product detail links', () => {
    expect(
      isMwiahProductHrefUnderCategory(
        category,
        '/Product/applaws-adult-cat-chicken-breast-and-asparagus-pouch-12-x-70g-30315838',
      ),
    ).toBe(true);
  });

  it('accepts nested catalog product paths', () => {
    expect(
      isMwiahProductHrefUnderCategory(
        category,
        '/Catalog/pet-food/everyday-pet-food/cat-and-dog-general-diets/royal-canin',
      ),
    ).toBe(true);
  });

  it('rejects the category path itself', () => {
    expect(isMwiahProductHrefUnderCategory(category, category)).toBe(false);
  });
});
