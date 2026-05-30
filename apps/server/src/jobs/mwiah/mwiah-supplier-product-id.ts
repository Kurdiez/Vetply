export function normalizeMwiahSupplierProductId(raw: string): string {
  const trimmed = raw.trim();
  const withoutLeadingZeros = trimmed.replace(/^0+/, '');
  return withoutLeadingZeros === '' ? '0' : withoutLeadingZeros;
}
