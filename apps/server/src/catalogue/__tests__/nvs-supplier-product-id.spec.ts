import { canonicalizeNvsSupplierProductId } from '@vetply/shared';

describe('canonicalizeNvsSupplierProductId', () => {
  it('left-pads pure digit part numbers shorter than 8 characters', () => {
    expect(canonicalizeNvsSupplierProductId('719870')).toBe('00719870');
    expect(canonicalizeNvsSupplierProductId('309')).toBe('00000309');
  });

  it('leaves values that are already 8+ digit strings unchanged', () => {
    expect(canonicalizeNvsSupplierProductId('00000309')).toBe('00000309');
    expect(canonicalizeNvsSupplierProductId('123456789')).toBe('123456789');
  });

  it('trims whitespace before padding', () => {
    expect(canonicalizeNvsSupplierProductId('  719870  ')).toBe('00719870');
  });

  it('does not pad non-numeric part numbers', () => {
    expect(canonicalizeNvsSupplierProductId('PART-1')).toBe('PART-1');
  });
});
