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

  it('includes only leaf menu nodes that have an href', () => {
    const urls = collectMwiahMenuCategoryUrls(sampleTree, STORE_ORIGIN);
    expect(urls).toEqual([
      'https://onlinestore.mwiah.co.uk/Catalog/consumables/animal-identification',
      'https://onlinestore.mwiah.co.uk/Catalog/Clearance-sale',
    ]);
  });

  it('excludes parent nodes that still have submenu children', () => {
    const urls = collectMwiahMenuCategoryUrls(sampleTree, STORE_ORIGIN);
    expect(urls).not.toContain(
      'https://onlinestore.mwiah.co.uk/Catalog/consumables',
    );
  });

  it('skips leaf nodes without href', () => {
    const tree: MwiahMenuNode = {
      label: 'Products',
      href: null,
      children: [{ label: 'Empty leaf', href: null, children: [] }],
    };
    expect(collectMwiahMenuCategoryUrls(tree, STORE_ORIGIN)).toEqual([]);
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
