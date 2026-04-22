import {
  ceilPriceToTwoDecimalPlaces,
  formatUnitQuantityAsWholeNumber,
} from '../utils/catalogue-price-format';

describe('ceilPriceToTwoDecimalPlaces', () => {
  it('returns null for null or empty', () => {
    expect(ceilPriceToTwoDecimalPlaces(null)).toBeNull();
    expect(ceilPriceToTwoDecimalPlaces('')).toBeNull();
  });

  it('ceils to two decimal places', () => {
    expect(ceilPriceToTwoDecimalPlaces('5.551')).toBe('5.56');
    expect(ceilPriceToTwoDecimalPlaces('5.5501')).toBe('5.56');
    expect(ceilPriceToTwoDecimalPlaces('10.001')).toBe('10.01');
  });

  it('leaves exact two-decimal values unchanged in string form', () => {
    expect(ceilPriceToTwoDecimalPlaces('5.50')).toBe('5.50');
    expect(ceilPriceToTwoDecimalPlaces('99.00')).toBe('99.00');
  });
});

describe('formatUnitQuantityAsWholeNumber', () => {
  it('rounds decimal strings to whole numbers', () => {
    expect(formatUnitQuantityAsWholeNumber('250.000000')).toBe('250');
    expect(formatUnitQuantityAsWholeNumber('1.000000')).toBe('1');
    expect(formatUnitQuantityAsWholeNumber('6.000000')).toBe('6');
  });

  it('returns original string when not parseable as number', () => {
    expect(formatUnitQuantityAsWholeNumber('')).toBe('');
  });
});
