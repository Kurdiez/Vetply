import { EntityManager } from 'typeorm';

/** Minimum bigram Dice score to accept a fuzzy match (light fuzz; ~0.83 for typical pack suffix). */
export const CATALOGUE_PRODUCT_IMPORT_DICE_THRESHOLD = 0.82;

/** Max rows to pull from DB for in-memory fuzzy scoring. */
const FUZZY_CANDIDATE_LIMIT = 80;

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
 * Must stay aligned with the SQL expression in `findExistingCatalogueProductIdForSupplierImport`.
 */
export function slugForCatalogueProductMatch(raw: string): string {
  const n = normalizeCatalogueProductNameForMatch(raw);
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
 * 1) Exact match on punctuation-insensitive slug (same as before, stricter on punctuation).
 * 2) If none: cheap SQL prefilter (product name contains the longest alphanumeric token from
 *    the candidate slug), then pick best Sørensen–Dice bigram score on slugs if >= threshold.
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

  const exactRows = await manager.query<{ id: string }[]>(
    `SELECT p.id::text AS id
     FROM catalogue_products p
     WHERE NOT EXISTS (
       SELECT 1 FROM catalogue_product_supplier_listings l
       WHERE l.product_id = p.id AND l.supplier_id = $1::uuid
     )
     AND trim(both ' ' FROM regexp_replace(
           regexp_replace(lower(trim(p.name)), '[^a-z0-9]+', ' ', 'gi'),
           E'\\s+', ' ', 'g'
         )) = $2
     ORDER BY p.id ASC
     LIMIT 1`,
    [params.supplierId, slugCand],
  );
  if (exactRows[0]?.id) {
    return exactRows[0].id;
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
