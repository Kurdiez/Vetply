import {
  canonicalCatalogueImportProductName,
  CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES,
} from '../utils/catalogue-product-name-aliases';

describe('canonicalCatalogueImportProductName', () => {
  it('removes NVS sugar marker (SU glued to pack digits', () => {
    expect(
      canonicalCatalogueImportProductName(
        'PARACETAMOL SUSP 120MG/5ML (SU100ML',
      ),
    ).toBe('PARACETAMOL SUSP 120MG/5ML 100ML');
  });

  it('strips bare (SU sugar marker', () => {
    expect(canonicalCatalogueImportProductName('PARACETAMOL X (SU')).toBe(
      'PARACETAMOL X',
    );
  });

  it('normalises parenthetical sugar-free wording to (Sugar Free)', () => {
    expect(
      canonicalCatalogueImportProductName(
        'Paracetamol Susp 120mg/5ml (Sugar free)',
      ),
    ).toBe('Paracetamol Susp 120mg/5ml (Sugar Free)');
    expect(
      canonicalCatalogueImportProductName(
        'Paracetamol Susp 120mg/5ml (Sugar Free)',
      ),
    ).toBe('Paracetamol Susp 120mg/5ml (Sugar Free)');
  });

  it('rewrites NVS-style SF before pack digits to (Sugar Free)', () => {
    expect(
      canonicalCatalogueImportProductName(
        'PARACETAMOL SUSP 120MG/5ML SF 100ML',
      ),
    ).toBe('PARACETAMOL SUSP 120MG/5ML (Sugar Free) 100ML');
    expect(
      canonicalCatalogueImportProductName(
        'PARACETAMOL 250MG/5ML SUSP SF 100ML',
      ),
    ).toBe('PARACETAMOL 250MG/5ML SUSP (Sugar Free) 100ML');
  });

  it('applies literal aliases when entries exist', () => {
    const prev = { ...CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES };
    try {
      Object.assign(CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES, {
        FOOBARIN: 'Foobarinate',
      });
      expect(canonicalCatalogueImportProductName('X FOOBARIN Y')).toBe(
        'X Foobarinate Y',
      );
    } finally {
      for (const k of Object.keys(CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES)) {
        if (!(k in prev)) {
          delete CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES[k];
        }
      }
    }
  });
});
