import {
  applyTreeRowSnapshotsToLeafSet,
  parseCategoryTreeLabel,
  selectLeafLabelsByLevel,
} from '../covetrus-product-category-tree-scrape';

describe('parseCategoryTreeLabel', () => {
  it('strips trailing product counts', () => {
    expect(parseCategoryTreeLabel('Anaesthesia (224)')).toBe('Anaesthesia');
    expect(parseCategoryTreeLabel('Consumables (4,602)')).toBe('Consumables');
    expect(parseCategoryTreeLabel('Adaptors (16)')).toBe('Adaptors');
  });

  it('keeps leaf labels without counts', () => {
    expect(parseCategoryTreeLabel('Adaptors')).toBe('Adaptors');
    expect(parseCategoryTreeLabel('ET Tube Accessories')).toBe(
      'ET Tube Accessories',
    );
  });

  it('returns null for empty or too-short labels', () => {
    expect(parseCategoryTreeLabel('')).toBeNull();
    expect(parseCategoryTreeLabel('  ')).toBeNull();
    expect(parseCategoryTreeLabel('A')).toBeNull();
  });
});

describe('selectLeafLabelsByLevel', () => {
  it('keeps only deepest labels in a Covetrus-style branch', () => {
    expect(
      selectLeafLabelsByLevel([
        { label: 'Consumables', level: 0 },
        { label: 'Anaesthesia', level: 1 },
        { label: 'Adaptors', level: 2 },
        { label: 'Circuits', level: 2 },
        { label: 'Clothing And PPE', level: 1 },
        { label: 'Dental', level: 1 },
      ]),
    ).toEqual(['Adaptors', 'Circuits', 'Clothing And PPE', 'Dental']);
  });
});

describe('applyTreeRowSnapshotsToLeafSet', () => {
  it('keeps only absolute leaves and never keeps expandable parents', () => {
    const leaves = new Set<string>();
    const knownParents = new Set<string>();

    applyTreeRowSnapshotsToLeafSet(
      [
        {
          text: 'Consumables (4602)',
          label: 'Consumables',
          level: 0,
          expandable: true,
          expanded: true,
          slotName: 'vaadin-grid-cell-content-3',
        },
        {
          text: 'Anaesthesia (224)',
          label: 'Anaesthesia',
          level: 1,
          expandable: true,
          expanded: true,
          slotName: 'vaadin-grid-cell-content-9',
        },
        {
          text: 'Adaptors (16)',
          label: 'Adaptors',
          level: 2,
          expandable: false,
          expanded: false,
          slotName: 'vaadin-grid-cell-content-10',
        },
        {
          text: 'Circuits (5)',
          label: 'Circuits',
          level: 2,
          expandable: false,
          expanded: false,
          slotName: 'vaadin-grid-cell-content-11',
        },
        {
          text: 'Clothing And PPE (128)',
          label: 'Clothing And PPE',
          level: 1,
          expandable: true,
          expanded: false,
          slotName: 'vaadin-grid-cell-content-12',
        },
      ],
      leaves,
      knownParents,
    );

    expect([...leaves].sort()).toEqual(['Adaptors', 'Circuits']);
    expect(knownParents.has('consumables')).toBe(true);
    expect(knownParents.has('anaesthesia')).toBe(true);
    expect(knownParents.has('clothing and ppe')).toBe(true);
  });
});
