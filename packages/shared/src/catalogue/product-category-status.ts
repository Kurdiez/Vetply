export const ProductCategoryStatus = {
  Confident: 'confident',
  NeedsReview: 'needs_review',
  Reviewed: 'reviewed',
} as const;

export type ProductCategoryStatus =
  (typeof ProductCategoryStatus)[keyof typeof ProductCategoryStatus];

/** Admin UI labels for `productCategoryStatus` on supplier listings. */
export const ProductCategoryMappingDisplayLabel = {
  [ProductCategoryStatus.Confident]: 'AI mapped',
  [ProductCategoryStatus.NeedsReview]: 'Needs review',
  [ProductCategoryStatus.Reviewed]: 'Admin mapped',
} as const;

export function productCategoryMappingDisplayLabel(
  status: ProductCategoryStatus | null | undefined,
): string {
  if (status == null) {
    return '—';
  }
  return ProductCategoryMappingDisplayLabel[status];
}
