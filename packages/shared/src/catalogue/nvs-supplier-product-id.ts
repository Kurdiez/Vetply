const NVS_SUPPLIER_PRODUCT_ID_PAD_LENGTH = 8;

/**
 * NVS "All products" files use a fixed-width numeric id (8 digits, leading zeros).
 * Non-POM CSV "Part No" values are often unpadded. Canonicalize so both sources
 * resolve to the same `supplier_product_id` string.
 *
 * - Trims whitespace.
 * - If the value is all digits and shorter than 8 characters, left-pads with `0`.
 * - If length is already ≥ 8, or the value contains non-digits, returns the trimmed
 *   string unchanged (non-numeric part numbers are supported as-is).
 */
export function canonicalizeNvsSupplierProductId(raw: string): string {
  const t = raw.trim();
  if (t === '' || t.length >= NVS_SUPPLIER_PRODUCT_ID_PAD_LENGTH) {
    return t;
  }
  if (!/^\d+$/.test(t)) {
    return t;
  }
  return t.padStart(NVS_SUPPLIER_PRODUCT_ID_PAD_LENGTH, '0');
}
