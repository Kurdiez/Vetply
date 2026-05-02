/**
 * Canonical catalogue product titles for imports.
 * Extend behaviour via `CATALOGUE_PRODUCT_NAME_REGEX_ALIASES`, `CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES`,
 * or extra steps in `catalogueProductNameAliasTransforms`.
 */

function collapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive substring replacements. Longer keys run first so specific phrases beat short ones.
 * Add entries as needed, e.g. `{ MISCELLANEOUS: 'Misc' }`.
 */
export const CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES: Record<string, string> =
  {};

/**
 * Regex-based aliases applied in array order after transforms. Append rules rather than editing earlier ones.
 */
export const CATALOGUE_PRODUCT_NAME_REGEX_ALIASES: ReadonlyArray<{
  pattern: RegExp;
  replacement: string;
}> = [
  { pattern: /\s*\(\s*SU\s*(?=\d)/gi, replacement: ' ' },
  { pattern: /\s*\(\s*SU\b/gi, replacement: '' },
  { pattern: /\s*\(\s*Sugar\s+free\s*\)/gi, replacement: ' (Sugar Free)' },
  { pattern: /\bSF\b\s+(?=\d)/gi, replacement: ' (Sugar Free) ' },
];

export type CatalogueProductNameAliasTransform = (s: string) => string;

/** Optional extra normalisers (run after regex + literal aliases). */
export const catalogueProductNameAliasTransforms: CatalogueProductNameAliasTransform[] =
  [];

export function canonicalCatalogueImportProductName(raw: string): string {
  let s = raw.normalize('NFKC').trim();
  if (s === '') {
    return '';
  }

  for (const { pattern, replacement } of CATALOGUE_PRODUCT_NAME_REGEX_ALIASES) {
    s = s.replace(pattern, replacement);
  }

  const literalEntries = Object.entries(
    CATALOGUE_PRODUCT_NAME_LITERAL_ALIASES,
  ).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of literalEntries) {
    if (from === '') {
      continue;
    }
    s = s.replace(new RegExp(escapeRegExp(from), 'gi'), to);
  }

  for (const fn of catalogueProductNameAliasTransforms) {
    s = fn(s);
  }

  return collapseWhitespace(s);
}
