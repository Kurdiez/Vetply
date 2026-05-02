import { stripTrailingCatalogUnitQuantityFromProductName } from '@vetply/shared';
import { EntityManager } from 'typeorm';

import { canonicalCatalogueImportProductName } from './catalogue-product-name-aliases';

/** Minimum bigram Dice score to accept a fuzzy match (light fuzz; ~0.83 for typical pack suffix). */
export const CATALOGUE_PRODUCT_IMPORT_DICE_THRESHOLD = 0.82;

/** Max rows to pull from DB for exact + fuzzy scoring (exact slug uses same pool). */
const FUZZY_CANDIDATE_LIMIT = 250;

/** Minimum token length used for the cheap SQL prefilter (`position`). */
const FUZZY_PREFILTER_TOKEN_MIN_LEN = 4;

/**
 * Normalizes a catalogue product display name for cross-supplier import matching.
 * Used before slugging and for Dice scoring input.
 */
export function normalizeCatalogueProductNameForMatch(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Punctuation-insensitive "slug": lowercased letters/digits only, single spaces.
 * Strips trailing `{qty} {catalog unit}` from the canonical title, then applies
 * aliases so NVS / Veenak / Covetrus sugar wording lines up.
 */
export function slugForCatalogueProductMatch(raw: string): string {
  const canonical = canonicalCatalogueImportProductName(raw);
  const withoutUnitTail =
    stripTrailingCatalogUnitQuantityFromProductName(canonical);
  const n = normalizeCatalogueProductNameForMatch(withoutUnitTail);
  return n
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sørensen–Dice coefficient on character bigrams (0–1). Good light fuzzy signal for
 * short product names without DB extensions.
 */
export function diceBigramScore(a: string, b: string): number {
  if (a === '' && b === '') {
    return 1;
  }
  if (a === '' || b === '') {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  if (a.length < 2 || b.length < 2) {
    return a === b ? 1 : 0;
  }

  const bigramCounts = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i += 1) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };

  const A = bigramCounts(a);
  const B = bigramCounts(b);
  let intersection = 0;
  for (const [k, va] of A) {
    const vb = B.get(k);
    if (vb !== undefined) {
      intersection += Math.min(va, vb);
    }
  }
  return (2 * intersection) / (A.size + B.size);
}

function longestSlugToken(slug: string): string | null {
  const parts = slug.split(' ').filter(Boolean);
  const longEnough = parts.filter(
    (t) => t.length >= FUZZY_PREFILTER_TOKEN_MIN_LEN,
  );
  if (longEnough.length === 0) {
    return slug.length >= FUZZY_PREFILTER_TOKEN_MIN_LEN ? slug : null;
  }
  longEnough.sort((x, y) => y.length - x.length);
  return longEnough[0] ?? null;
}

export type FindExistingCatalogueProductIdParams = {
  supplierId: string;
  candidateName: string;
};

/**
 * Finds an existing catalogue product for import linking:
 * 1) Exact match on punctuation-insensitive slug (aliases applied in TS; checked on candidate pool).
 * 2) If none: pick best Sørensen–Dice bigram score on slugs if >= threshold (same pool).
 *
 * Only considers products with no listing for this supplier yet. Deterministic: best score,
 * then lowest `id`.
 */
export async function findExistingCatalogueProductIdForSupplierImport(
  manager: EntityManager,
  params: FindExistingCatalogueProductIdParams,
): Promise<string | null> {
  const slugCand = slugForCatalogueProductMatch(params.candidateName);
  if (slugCand === '') {
    return null;
  }

  const token = longestSlugToken(slugCand);
  if (!token) {
    return null;
  }

  const fuzzyRows = await manager.query<{ id: string; name: string }[]>(
    `SELECT p.id::text AS id, p.name AS name
     FROM catalogue_products p
     WHERE NOT EXISTS (
       SELECT 1 FROM catalogue_product_supplier_listings l
       WHERE l.product_id = p.id AND l.supplier_id = $1::uuid
     )
     AND position($2 in lower(trim(p.name))) > 0
     ORDER BY p.id ASC
     LIMIT $3`,
    [params.supplierId, token, FUZZY_CANDIDATE_LIMIT],
  );

  let bestExactId: string | null = null;
  for (const row of fuzzyRows) {
    if (slugForCatalogueProductMatch(row.name) === slugCand) {
      if (!bestExactId || row.id < bestExactId) {
        bestExactId = row.id;
      }
    }
  }
  if (bestExactId !== null) {
    return bestExactId;
  }

  let bestId: string | null = null;
  let bestScore = -1;
  for (const row of fuzzyRows) {
    const slugDb = slugForCatalogueProductMatch(row.name);
    const score = diceBigramScore(slugCand, slugDb);
    if (
      score > bestScore ||
      (score === bestScore && row.id < (bestId ?? '\uffff'))
    ) {
      bestScore = score;
      bestId = row.id;
    }
  }

  if (bestId !== null && bestScore >= CATALOGUE_PRODUCT_IMPORT_DICE_THRESHOLD) {
    return bestId;
  }
  return null;
}
