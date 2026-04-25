/**
 * Rounds a catalogue price up to exactly two decimal places (ceiling).
 */
export function ceilPriceToTwoDecimalPlaces(
  value: string | null,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (trimmed === '') {
    return null;
  }
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n)) {
    return null;
  }
  const cents = Math.ceil(n * 100);
  return (cents / 100).toFixed(2);
}

/** Catalogue list: unit quantity shown as a whole number (rounded). */
export function formatUnitQuantityAsWholeNumber(value: string): string {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) {
    return value;
  }
  return String(Math.round(n));
}
