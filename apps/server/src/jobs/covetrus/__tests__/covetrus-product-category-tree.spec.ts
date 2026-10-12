import {
  collectLeafLabels,
  countTreeNodes,
  mergeLeveledRowsIntoForest,
  sortForestInPlace,
  type ProductCategoryTreeNode,
} from '../covetrus-product-category-tree';

describe('mergeLeveledRowsIntoForest', () => {
  it('builds a path-aware hierarchy from leveled rows', () => {
    const forest: ProductCategoryTreeNode[] = [];

    mergeLeveledRowsIntoForest(forest, [
      { label: 'Consumables', level: 0 },
      { label: 'Anaesthesia', level: 1 },
      { label: 'Adaptors', level: 2 },
      { label: 'Circuits', level: 2 },
      { label: 'Clothing And PPE', level: 1 },
    ]);

    expect(forest).toEqual([
      {
        label: 'Consumables',
        children: [
          {
            label: 'Anaesthesia',
            children: [
              { label: 'Adaptors', children: [] },
              { label: 'Circuits', children: [] },
            ],
          },
          { label: 'Clothing And PPE', children: [] },
        ],
      },
    ]);
  });

  it('merges later windows into the existing forest without duplicating paths', () => {
    const forest: ProductCategoryTreeNode[] = [];

    mergeLeveledRowsIntoForest(forest, [
      { label: 'Consumables', level: 0 },
      { label: 'Anaesthesia', level: 1 },
      { label: 'Adaptors', level: 2 },
    ]);
    mergeLeveledRowsIntoForest(forest, [
      { label: 'Consumables', level: 0 },
      { label: 'Anaesthesia', level: 1 },
      { label: 'Circuits', level: 2 },
      { label: 'Dental', level: 1 },
    ]);

    expect(collectLeafLabels(forest)).toEqual([
      'Adaptors',
      'Circuits',
      'Dental',
    ]);
    expect(countTreeNodes(forest)).toBe(5);
  });
});

describe('sortForestInPlace', () => {
  it('sorts siblings alphabetically at every level', () => {
    const forest: ProductCategoryTreeNode[] = [
      {
        label: 'Zebra',
        children: [
          { label: 'Beta', children: [] },
          { label: 'Alpha', children: [] },
        ],
      },
      { label: 'Apple', children: [] },
    ];

    sortForestInPlace(forest);

    expect(forest.map((n) => n.label)).toEqual(['Apple', 'Zebra']);
    expect(forest[1]!.children.map((n) => n.label)).toEqual(['Alpha', 'Beta']);
  });
});
