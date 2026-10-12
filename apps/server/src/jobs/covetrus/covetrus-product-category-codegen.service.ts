import { Injectable, Logger } from '@nestjs/common';

import {
  resolveProductCategoryObjectFilePath,
  writeProductCategoryObjectFile,
} from './covetrus-product-category-codegen';
import {
  collectLeafLabels,
  countTreeNodes,
  type ProductCategoryTreeNode,
} from './covetrus-product-category-tree';
import { scrapeCategoryTreeFromPage } from './covetrus-product-category-tree-scrape';
import { CovetrusSessionService } from './covetrus-session.service';

export type CovetrusProductCategoryCodegenResult = {
  filePath: string;
  categories: string[];
  categoryCount: number;
  nodeCount: number;
};

@Injectable()
export class CovetrusProductCategoryCodegenService {
  private readonly logger = new Logger(
    CovetrusProductCategoryCodegenService.name,
  );

  constructor(private readonly covetrusSession: CovetrusSessionService) {}

  async scrapeAndGenerateProductCategoryObject(): Promise<CovetrusProductCategoryCodegenResult> {
    this.logger.log('COVETRUS_PRODUCT_CATEGORY_CODEGEN start');

    const forest = await this.scrapeCategoryTree();
    this.assertForestPresent(forest);

    const filePath = resolveProductCategoryObjectFilePath();
    await writeProductCategoryObjectFile(filePath, forest);

    const categories = collectLeafLabels(forest);
    const nodeCount = countTreeNodes(forest);
    this.logger.log(
      `COVETRUS_PRODUCT_CATEGORY_CODEGEN wrote leafCount=${categories.length} nodeCount=${nodeCount} path=${filePath}`,
    );

    return {
      filePath,
      categories,
      categoryCount: categories.length,
      nodeCount,
    };
  }

  private async scrapeCategoryTree(): Promise<ProductCategoryTreeNode[]> {
    return this.covetrusSession.withCatalogPage(async (page) =>
      scrapeCategoryTreeFromPage(page),
    );
  }

  private assertForestPresent(forest: ProductCategoryTreeNode[]): void {
    if (forest.length === 0) {
      throw new Error('Covetrus category tree scrape returned no categories');
    }
  }
}
