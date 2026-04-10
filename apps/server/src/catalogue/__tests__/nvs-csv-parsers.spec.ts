import { CatalogUnitType, LegalCategory, SalesCategory } from '@vetply/shared';
import {
  parseNvsUom,
  parseNvsVpp,
  parsePom,
  resolveLegalCategory,
  resolveSalesCategory,
} from '../utils/nvs-csv-parsers';

describe('parseNvsVpp', () => {
  it('parses pound sterling amounts', () => {
    expect(parseNvsVpp(' £ 46.28 ')).toBe('46.2800');
  });

  it('returns null for dash placeholder', () => {
    expect(parseNvsVpp('£ -   ')).toBeNull();
  });
});

describe('parseNvsUom', () => {
  it('parses ML suffix', () => {
    expect(parseNvsUom('250ML')).toEqual({
      unitType: CatalogUnitType.ML,
      unitQuantity: '250.000000',
    });
  });

  it('parses EA', () => {
    expect(parseNvsUom('EA')).toEqual({
      unitType: CatalogUnitType.EA,
      unitQuantity: '1.000000',
    });
  });

  it('parses PK with space', () => {
    expect(parseNvsUom('PK 6')).toEqual({
      unitType: CatalogUnitType.PK,
      unitQuantity: '6.000000',
    });
  });

  it('parses multiplication form', () => {
    expect(parseNvsUom('5x20ML')).toEqual({
      unitType: CatalogUnitType.ML,
      unitQuantity: '100.000000',
    });
  });
});

describe('resolveSalesCategory', () => {
  it('accepts exact NVS label', () => {
    expect(resolveSalesCategory('Anaesthetics')).toBe(
      SalesCategory.Anaesthetics,
    );
  });

  it('rejects unknown', () => {
    expect(resolveSalesCategory('Not a category')).toBeNull();
  });
});

describe('resolveLegalCategory', () => {
  it('accepts POM-V', () => {
    expect(resolveLegalCategory('POM-V')).toBe(LegalCategory.POM_V);
  });
});

describe('parsePom', () => {
  it('parses yes/no', () => {
    expect(parsePom('Yes')).toBe(true);
    expect(parsePom('No')).toBe(false);
  });
});
