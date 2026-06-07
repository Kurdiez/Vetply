export type MwiahDiscoverCategoriesJobData = {
  startUrl?: string;
};

export type MwiahScrapeCategoryProductsJobData = {
  url: string;
};

export type MwiahScrapeCategoryWorkerInput = {
  categoryUrl: string;
  jobId: string | null;
};

export type MwiahScrapeCategoryWorkerOutput = {
  listPagesVisited: number;
  productsProcessed: number;
  imported: number;
  skipped: number;
  skippedCategoryDetails: boolean;
};
