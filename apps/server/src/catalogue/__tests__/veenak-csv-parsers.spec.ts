import { CatalogUnitType } from '@vetply/shared';
import {
  parseVeenakPackAndForm,
  parseVeenakPrice,
} from '../utils/veenak-csv-parsers';

describe('parseVeenakPrice', () => {
  it('parses decimal amounts', () => {
    expect(parseVeenakPrice('52.00')).toBe('52.0000');
  });

  it('parses pound amounts', () => {
    expect(parseVeenakPrice(' £ 13.35 ')).toBe('13.3500');
  });
});

describe('parseVeenakPackAndForm', () => {
  it('maps plain count tablets to TAB', () => {
    expect(parseVeenakPackAndForm('90', 'Tablets')).toEqual({
      unitType: CatalogUnitType.TAB,
      unitQuantity: '90.000000',
    });
  });

  it('maps plain count device to EA', () => {
    expect(parseVeenakPackAndForm('1', 'Device')).toEqual({
      unitType: CatalogUnitType.EA,
      unitQuantity: '1.000000',
    });
  });

  it('normalizes ml x count to total ML', () => {
    expect(parseVeenakPackAndForm('10ml x 10', 'Injection')).toEqual({
      unitType: CatalogUnitType.ML,
      unitQuantity: '100.000000',
    });
  });

  it('parses count x ml', () => {
    expect(parseVeenakPackAndForm('1 x 10ml', 'Injection')).toEqual({
      unitType: CatalogUnitType.ML,
      unitQuantity: '10.000000',
    });
  });

  it('parses gm suffix', () => {
    expect(parseVeenakPackAndForm('250gm', 'Powder')).toEqual({
      unitType: CatalogUnitType.G,
      unitQuantity: '250.000000',
    });
  });

  it('parses gram suffix on cream', () => {
    expect(parseVeenakPackAndForm('10g', 'Cream')).toEqual({
      unitType: CatalogUnitType.G,
      unitQuantity: '10.000000',
    });
  });
});
