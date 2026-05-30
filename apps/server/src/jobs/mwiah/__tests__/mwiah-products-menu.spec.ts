import {
  collectMwiahMenuCategoryUrls,
  dedupeCategoryUrls,
  MAX_MENU_DEPTH,
  resolveMwiahCategoryUrl,
  type MwiahMenuNode,
} from '../mwiah-products-menu';

const STORE_ORIGIN = 'https://onlinestore.mwiah.co.uk';

describe('resolveMwiahCategoryUrl', () => {
  it('resolves relative catalog paths', () => {
    expect(resolveMwiahCategoryUrl('/Catalog/consumables', STORE_ORIGIN)).toBe(
      'https://onlinestore.mwiah.co.uk/Catalog/consumables',
    );
  });

  it('passes through absolute URLs', () => {
    expect(
      resolveMwiahCategoryUrl(
        'https://onlinestore.mwiah.co.uk/Catalog/consumables',
        STORE_ORIGIN,
      ),
    ).toBe('https://onlinestore.mwiah.co.uk/Catalog/consumables');
  });

  it('rejects empty href', () => {
    expect(() => resolveMwiahCategoryUrl('', STORE_ORIGIN)).toThrow();
  });
});

describe('collectMwiahMenuCategoryUrls', () => {
  const sampleTree: MwiahMenuNode = {
    label: 'Products',
    href: null,
    children: [
      {
        label: 'Consumables',
        href: '/Catalog/consumables',
        children: [
          {
            label: 'Animal identification',
            href: '/Catalog/consumables/animal-identification',
            children: [],
          },
        ],
      },
      {
        label: 'Clearance sale',
        href: '/Catalog/Clearance-sale',
        children: [],
      },
    ],
  };

  it('includes every node with href', () => {
    const urls = collectMwiahMenuCategoryUrls(sampleTree, STORE_ORIGIN);
    expect(urls).toEqual([
      'https://onlinestore.mwiah.co.uk/Catalog/consumables',
      'https://onlinestore.mwiah.co.uk/Catalog/consumables/animal-identification',
      'https://onlinestore.mwiah.co.uk/Catalog/Clearance-sale',
    ]);
  });
});

describe('dedupeCategoryUrls', () => {
  it('keeps one entry per url', () => {
    expect(
      dedupeCategoryUrls([
        'https://onlinestore.mwiah.co.uk/Catalog/a',
        'https://onlinestore.mwiah.co.uk/Catalog/a',
      ]),
    ).toEqual(['https://onlinestore.mwiah.co.uk/Catalog/a']);
  });
});

describe('MAX_MENU_DEPTH', () => {
  it('is a positive guard', () => {
    expect(MAX_MENU_DEPTH).toBeGreaterThan(0);
  });
});
