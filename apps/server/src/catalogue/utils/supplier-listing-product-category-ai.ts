import {
  ProductCategory,
  ProductCategoryStatus,
  type ProductCategoryLeafRef,
} from '@vetply/shared';
import { z } from 'zod';

export const SUPPLIER_LISTING_PRODUCT_CATEGORY_BATCH_SIZE = 25;

/** Safety cap so a permanently failing AI batch cannot retry forever. */
export const SUPPLIER_LISTING_PRODUCT_CATEGORY_MAX_ROUNDS = 100;

export type ListingCategoryAiInput = {
  id: string;
  name: string;
  supplierProductId: string;
  supplierName: string;
  listedPrice: string | null;
  catalogueProductName: string | null;
};

export type ListingCategoryAiMapping = {
  listingId: string;
  productCategory: string;
  productCategoryStatus:
    | typeof ProductCategoryStatus.Confident
    | typeof ProductCategoryStatus.NeedsReview;
};

const aiBatchResponseSchema = z.object({
  mappings: z.array(
    z.object({
      listingId: z.string().uuid(),
      productCategoryPath: z.string().min(1),
      status: z.enum([
        ProductCategoryStatus.Confident,
        ProductCategoryStatus.NeedsReview,
      ]),
    }),
  ),
});

export const listingCategoryAiJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mappings'],
  properties: {
    mappings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['listingId', 'productCategoryPath', 'status'],
        properties: {
          listingId: { type: 'string' },
          productCategoryPath: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              ProductCategoryStatus.Confident,
              ProductCategoryStatus.NeedsReview,
            ],
          },
        },
      },
    },
  },
} as const;

export function buildListingCategorySystemPrompt(
  leafRefs: ProductCategoryLeafRef[],
): string {
  return [
    'You classify veterinary supplier product listings into exactly one leaf product category.',
    'Use the ProductCategory tree JSON and the allowed leaf paths list.',
    'productCategoryPath MUST be copied EXACTLY from the allowed leaf paths list (full dot path).',
    'Do not invent intermediate keys or shorten/rearrange paths.',
    'status must be "confident" when you are sure, or "needs_review" when uncertain.',
    'Never use status "reviewed".',
    'If you are unsure about a product, use the web_search tool if helpful, then still assign a best-effort leaf path and set status to "needs_review".',
    'CRITICAL: mappings MUST include every listing id from the input batch — no omissions, no extras.',
    'mappings.length MUST equal the number of input listings.',
    'Never skip a listing; always map with best effort.',
    '',
    'ProductCategory tree:',
    JSON.stringify(ProductCategory),
    '',
    'Allowed leaf paths:',
    leafRefs.map((leaf) => `${leaf.path} = ${leaf.label}`).join('\n'),
  ].join('\n');
}

export function buildListingCategoryUserPrompt(
  listings: ListingCategoryAiInput[],
): string {
  const listingIds = listings.map((listing) => listing.id);
  return [
    `Classify ALL ${listings.length} supplier listings into ProductCategory leaf paths.`,
    'Return JSON with one mapping object per listing id — do not omit any id.',
    `Required listing ids (${listingIds.length}): ${JSON.stringify(listingIds)}`,
    'If unsure about any listing, still map it and set status to "needs_review".',
    '',
    'Listings:',
    JSON.stringify(listings, null, 2),
  ].join('\n');
}

export function parseListingCategoryAiResponse(
  rawJson: string,
  listings: ListingCategoryAiInput[],
  leafPathSet: Set<string>,
): ListingCategoryAiMapping[] {
  const parsed = aiBatchResponseSchema.parse(JSON.parse(rawJson));
  const byId = new Map(
    parsed.mappings.map((mapping) => [mapping.listingId, mapping]),
  );
  const leafPaths = [...leafPathSet];
  const keyToPaths = buildKeyToPathsIndex(leafPaths);

  return listings.map((listing) => {
    const mapping = byId.get(listing.id);
    if (mapping == null) {
      throw new Error(
        `AI omitted listingId=${listing.id} from product-category mappings`,
      );
    }

    const resolution = resolveProductCategoryPath(
      mapping.productCategoryPath,
      leafPathSet,
      leafPaths,
      keyToPaths,
    );

    return {
      listingId: listing.id,
      productCategory: resolution.path,
      productCategoryStatus: resolution.exact
        ? mapping.status
        : ProductCategoryStatus.NeedsReview,
    };
  });
}

export function chunkListings<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

function resolveProductCategoryPath(
  candidate: string,
  leafPathSet: Set<string>,
  leafPaths: string[],
  keyToPaths: Map<string, string[]>,
): { path: string; exact: boolean } {
  const trimmed = candidate.trim();
  if (leafPathSet.has(trimmed)) {
    return { path: trimmed, exact: true };
  }

  const suffixMatch = findBestSuffixMatch(trimmed, leafPaths);
  if (suffixMatch != null) {
    return { path: suffixMatch, exact: false };
  }

  const leafKey = trimmed.includes('.') ? trimmed.split('.').at(-1) : trimmed;
  if (leafKey != null) {
    const byKey = keyToPaths.get(leafKey.toLowerCase()) ?? [];
    if (byKey.length === 1) {
      return { path: byKey[0]!, exact: false };
    }
    if (byKey.length > 1) {
      return {
        path: pickBestPrefixMatch(trimmed, byKey),
        exact: false,
      };
    }
  }

  if (leafPaths.length === 0) {
    throw new Error('No ProductCategory leaf paths available for resolution');
  }

  return {
    path: pickBestPrefixMatch(trimmed, leafPaths),
    exact: false,
  };
}

function findBestSuffixMatch(
  candidate: string,
  leafPaths: string[],
): string | null {
  const parts = candidate.split('.').filter((part) => part.length > 0);
  for (let start = 0; start < parts.length; start += 1) {
    const suffix = parts.slice(start).join('.');
    const matches = leafPaths.filter(
      (path) => path === suffix || path.endsWith(`.${suffix}`),
    );
    if (matches.length === 1) {
      return matches[0]!;
    }
    if (matches.length > 1) {
      return pickBestPrefixMatch(candidate, matches);
    }
  }
  return null;
}

function pickBestPrefixMatch(candidate: string, candidates: string[]): string {
  const candidateParts = candidate.toLowerCase().split('.');
  let best = candidates[0]!;
  let bestScore = -1;

  for (const path of candidates) {
    const pathParts = path.toLowerCase().split('.');
    let score = 0;
    const limit = Math.min(candidateParts.length, pathParts.length);
    for (let i = 0; i < limit; i += 1) {
      if (candidateParts[i] === pathParts[i]) {
        score += 1;
      } else {
        break;
      }
    }
    // Prefer paths that share the leaf key even when prefixes differ.
    const candidateLeaf = candidateParts.at(-1);
    const pathLeaf = pathParts.at(-1);
    if (
      candidateLeaf != null &&
      pathLeaf != null &&
      candidateLeaf === pathLeaf
    ) {
      score += 10;
    }
    if (score > bestScore) {
      bestScore = score;
      best = path;
    }
  }

  return best;
}

function buildKeyToPathsIndex(leafPaths: string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const path of leafPaths) {
    const leafKey = path.split('.').at(-1);
    if (leafKey == null) {
      continue;
    }
    const existing = index.get(leafKey.toLowerCase()) ?? [];
    existing.push(path);
    index.set(leafKey.toLowerCase(), existing);
  }
  return index;
}
