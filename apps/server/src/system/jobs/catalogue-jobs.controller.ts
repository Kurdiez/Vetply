import { Controller, Post, UseGuards } from '@nestjs/common';

import { SupplierListingProductCategoryClassifyService } from '~/catalogue/services/supplier-listing-product-category-classify.service';
import { SystemGuard } from '~/system/auth/system.guard';

import type { CatalogueClassifyProductCategoriesRes } from './catalogue-classify-product-categories.schemas';

@Controller('system/jobs/catalogue')
@UseGuards(SystemGuard)
export class CatalogueJobsController {
  constructor(
    private readonly productCategoryClassify: SupplierListingProductCategoryClassifyService,
  ) {}

  @Post('classify-product-categories')
  async classifyProductCategories(): Promise<CatalogueClassifyProductCategoriesRes> {
    const result = await this.productCategoryClassify.classifyAllListings();

    return {
      ok: true,
      listingCount: result.listingCount,
      batchCount: result.batchCount,
      roundCount: result.roundCount,
      confidentCount: result.confidentCount,
      needsReviewCount: result.needsReviewCount,
    };
  }
}
