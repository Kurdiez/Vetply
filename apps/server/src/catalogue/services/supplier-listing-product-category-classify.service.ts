import {
  ProductCategoryStatus,
  listProductCategoryLeafRefs,
  type ProductCategoryLeafRef,
} from '@vetply/shared';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OpenAiModelClient } from '~/ai/clients/openai-model.client';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import {
  SUPPLIER_LISTING_PRODUCT_CATEGORY_BATCH_SIZE,
  SUPPLIER_LISTING_PRODUCT_CATEGORY_MAX_ROUNDS,
  buildListingCategorySystemPrompt,
  buildListingCategoryUserPrompt,
  chunkListings,
  listingCategoryAiJsonSchema,
  parseListingCategoryAiResponse,
  type ListingCategoryAiInput,
  type ListingCategoryAiMapping,
} from '../utils/supplier-listing-product-category-ai';

export type SupplierListingProductCategoryClassifyResult = {
  listingCount: number;
  batchCount: number;
  roundCount: number;
  confidentCount: number;
  needsReviewCount: number;
};

type ClassificationPassResult = {
  batchCount: number;
  confidentCount: number;
  needsReviewCount: number;
  faultyIds: string[];
};

@Injectable()
export class SupplierListingProductCategoryClassifyService {
  private readonly logger = new Logger(
    SupplierListingProductCategoryClassifyService.name,
  );

  constructor(
    @InjectRepository(CatalogueProductSupplierListingEntity)
    private readonly listingRepo: Repository<CatalogueProductSupplierListingEntity>,
    private readonly openAi: OpenAiModelClient,
  ) {}

  async classifyAllListings(): Promise<SupplierListingProductCategoryClassifyResult> {
    this.logger.log('SUPPLIER_LISTING_PRODUCT_CATEGORY_CLASSIFY start');

    const leafRefs = listProductCategoryLeafRefs();
    this.assertLeavesPresent(leafRefs);
    const leafPathSet = new Set(leafRefs.map((leaf) => leaf.path));

    const allListings = await this.loadAllListingsForClassification();
    const totals = await this.classifyListingsUntilNoneFaulty(
      allListings,
      leafRefs,
      leafPathSet,
    );

    const result = {
      listingCount: allListings.length,
      batchCount: totals.batchCount,
      roundCount: totals.roundCount,
      confidentCount: totals.confidentCount,
      needsReviewCount: totals.needsReviewCount,
    };
    this.logger.log(
      `SUPPLIER_LISTING_PRODUCT_CATEGORY_CLASSIFY done ${JSON.stringify(result)}`,
    );
    return result;
  }

  private async classifyListingsUntilNoneFaulty(
    initialListings: CatalogueProductSupplierListingEntity[],
    leafRefs: ProductCategoryLeafRef[],
    leafPathSet: Set<string>,
  ): Promise<{
    batchCount: number;
    roundCount: number;
    confidentCount: number;
    needsReviewCount: number;
  }> {
    let pending = initialListings;
    let roundCount = 0;
    let batchCount = 0;
    let confidentCount = 0;
    let needsReviewCount = 0;

    while (pending.length > 0) {
      roundCount += 1;
      this.assertRoundWithinLimit(roundCount, pending.length);

      const pass = await this.runClassificationPass(
        pending,
        leafRefs,
        leafPathSet,
        roundCount,
      );
      batchCount += pass.batchCount;
      confidentCount += pass.confidentCount;
      needsReviewCount += pass.needsReviewCount;

      if (pass.faultyIds.length === 0) {
        break;
      }

      this.logger.warn(
        `SUPPLIER_LISTING_PRODUCT_CATEGORY_CLASSIFY round=${roundCount} faultyCount=${pass.faultyIds.length} retrying`,
      );
      pending = await this.loadListingsByIds(pass.faultyIds);
    }

    return { batchCount, roundCount, confidentCount, needsReviewCount };
  }

  private async runClassificationPass(
    listings: CatalogueProductSupplierListingEntity[],
    leafRefs: ProductCategoryLeafRef[],
    leafPathSet: Set<string>,
    round: number,
  ): Promise<ClassificationPassResult> {
    const batches = chunkListings(
      listings,
      SUPPLIER_LISTING_PRODUCT_CATEGORY_BATCH_SIZE,
    );
    const faultyIds: string[] = [];
    let confidentCount = 0;
    let needsReviewCount = 0;

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i]!;
      this.logger.log(
        `SUPPLIER_LISTING_PRODUCT_CATEGORY_CLASSIFY round=${round} batch=${i + 1}/${batches.length} size=${batch.length}`,
      );

      const batchResult = await this.classifyAndPersistBatch(
        batch,
        leafRefs,
        leafPathSet,
      );
      if (batchResult.kind === 'faulty') {
        faultyIds.push(...batch.map((listing) => listing.id));
        continue;
      }

      confidentCount += batchResult.confidentCount;
      needsReviewCount += batchResult.needsReviewCount;
    }

    return {
      batchCount: batches.length,
      confidentCount,
      needsReviewCount,
      faultyIds,
    };
  }

  private async classifyAndPersistBatch(
    batch: CatalogueProductSupplierListingEntity[],
    leafRefs: ProductCategoryLeafRef[],
    leafPathSet: Set<string>,
  ): Promise<
    | { kind: 'ok'; confidentCount: number; needsReviewCount: number }
    | { kind: 'faulty' }
  > {
    try {
      const mappings = await this.classifyListingBatch(
        batch,
        leafRefs,
        leafPathSet,
      );
      await this.persistBatchMappings(mappings);
      return {
        kind: 'ok',
        ...countMappingStatuses(mappings),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `SUPPLIER_LISTING_PRODUCT_CATEGORY_CLASSIFY batchFailed size=${batch.length} error=${message}`,
      );
      return { kind: 'faulty' };
    }
  }

  private assertLeavesPresent(leafRefs: ProductCategoryLeafRef[]): void {
    if (leafRefs.length === 0) {
      throw new Error(
        'ProductCategory has no leaf paths; regenerate product-category.ts first',
      );
    }
  }

  private assertRoundWithinLimit(
    roundCount: number,
    pendingCount: number,
  ): void {
    if (roundCount <= SUPPLIER_LISTING_PRODUCT_CATEGORY_MAX_ROUNDS) {
      return;
    }
    throw new Error(
      `Product-category classification exceeded ${SUPPLIER_LISTING_PRODUCT_CATEGORY_MAX_ROUNDS} rounds with ${pendingCount} faulty listings still pending`,
    );
  }

  private async loadAllListingsForClassification(): Promise<
    CatalogueProductSupplierListingEntity[]
  > {
    return this.listingRepo.find({
      relations: { supplier: true, product: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  private async loadListingsByIds(
    ids: string[],
  ): Promise<CatalogueProductSupplierListingEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const listings = await this.listingRepo.find({
      where: { id: In(ids) },
      relations: { supplier: true, product: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    if (listings.length !== ids.length) {
      const found = new Set(listings.map((listing) => listing.id));
      const missing = ids.filter((id) => !found.has(id));
      throw new Error(
        `Failed to reload faulty listings for retry; missing ids=${JSON.stringify(missing)}`,
      );
    }

    return listings;
  }

  private async classifyListingBatch(
    listings: CatalogueProductSupplierListingEntity[],
    leafRefs: ProductCategoryLeafRef[],
    leafPathSet: Set<string>,
  ): Promise<ListingCategoryAiMapping[]> {
    const inputs = listings.map(toAiInput);
    const rawJson = await this.openAi.completeJsonWithWebSearch({
      systemPrompt: buildListingCategorySystemPrompt(leafRefs),
      userPrompt: buildListingCategoryUserPrompt(inputs),
      schemaName: 'supplier_listing_product_category_mappings',
      schema: listingCategoryAiJsonSchema,
    });
    return parseListingCategoryAiResponse(rawJson, inputs, leafPathSet);
  }

  private async persistBatchMappings(
    mappings: ListingCategoryAiMapping[],
  ): Promise<void> {
    for (const mapping of mappings) {
      await this.listingRepo.update(
        { id: mapping.listingId },
        {
          productCategory: mapping.productCategory,
          productCategoryStatus: mapping.productCategoryStatus,
        },
      );
    }
  }
}

function toAiInput(
  listing: CatalogueProductSupplierListingEntity,
): ListingCategoryAiInput {
  return {
    id: listing.id,
    name: listing.name,
    supplierProductId: listing.supplierProductId,
    supplierName: listing.supplier.name,
    listedPrice: listing.listedPrice,
    catalogueProductName: listing.product?.name ?? null,
  };
}

function countMappingStatuses(mappings: ListingCategoryAiMapping[]): {
  confidentCount: number;
  needsReviewCount: number;
} {
  let confidentCount = 0;
  let needsReviewCount = 0;
  for (const mapping of mappings) {
    if (mapping.productCategoryStatus === ProductCategoryStatus.Confident) {
      confidentCount += 1;
    } else {
      needsReviewCount += 1;
    }
  }
  return { confidentCount, needsReviewCount };
}
