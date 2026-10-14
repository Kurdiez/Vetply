export const ProductCategoryStatus = {
  Confident: 'confident',
  NeedsReview: 'needs_review',
  Reviewed: 'reviewed',
} as const;

export type ProductCategoryStatus =
  (typeof ProductCategoryStatus)[keyof typeof ProductCategoryStatus];
