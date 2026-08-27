import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  type CatalogueProductsListQuery,
} from '@vetply/shared';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import { CatalogueProductDetailService } from '~/catalogue/services/catalogue-product-detail.service';
import { CatalogueProductListService } from '~/catalogue/services/catalogue-product-list.service';
import { CatalogueInsightService } from '../services/catalogue-insight.service';
import {
  COMPARE_LISTED_PRICES_TOOL_NAME,
  compareListedPricesToolArgsSchema,
  compareListedPricesToolParameters,
} from './schemas/compare-prices-tool.schema';
import {
  SEARCH_CATALOGUE_PRODUCTS_ROW_CAP,
  SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
  searchCatalogueProductsToolArgsSchema,
  searchCatalogueProductsToolParameters,
} from './schemas/search-products-tool.schema';

@Injectable()
export class CatalogueInsightsTools {
  private readonly logger = new Logger(CatalogueInsightsTools.name);

  constructor(
    private readonly productListService: CatalogueProductListService,
    private readonly productDetailService: CatalogueProductDetailService,
    private readonly catalogueInsightService: CatalogueInsightService,
  ) {}

  getToolDefinitions(): AiToolDefinition[] {
    return [
      {
        name: SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
        description:
          'Search catalogue products by name (optional manufacturer filter). Returns a capped list of candidates with id, name, manufacturer, and unit. Use this before comparing prices when the user has not named a specific product id.',
        parameters: searchCatalogueProductsToolParameters,
      },
      {
        name: COMPARE_LISTED_PRICES_TOOL_NAME,
        description:
          'Compare supplier listed prices for one catalogue product id. Server computes the cheapest listed price — never invent or recalculate prices yourself; trust this tool output.',
        parameters: compareListedPricesToolParameters,
      },
    ];
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (name === SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME) {
      return this.searchCatalogueProducts(args);
    }
    if (name === COMPARE_LISTED_PRICES_TOOL_NAME) {
      return this.compareListedPrices(args);
    }
    this.logger.warn(`Unknown insights tool requested: ${name}`);
    return { error: `Unknown tool: ${name}` };
  }

  private async searchCatalogueProducts(
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const parsed = searchCatalogueProductsToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        error: 'Invalid arguments for search_catalogue_products',
        issues: parsed.error.issues,
      };
    }

    const raw = parsed.data;
    const q = raw.q.trim();
    const manufacturerName = raw.manufacturerName?.trim();
    if (q.length === 0) {
      return {
        error: 'Invalid arguments for search_catalogue_products',
        issues: [{ message: 'q must not be blank' }],
      };
    }

    const query = this.buildSearchQuery({
      q,
      manufacturerName:
        manufacturerName && manufacturerName.length > 0
          ? manufacturerName
          : undefined,
    });
    const result = await this.productListService.listProducts(query);

    return {
      q,
      manufacturerName: manufacturerName ?? null,
      totalCount: result.totalCount,
      returnedCount: result.items.length,
      rowCap: SEARCH_CATALOGUE_PRODUCTS_ROW_CAP,
      truncated: result.totalCount > result.items.length,
      products: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        manufacturerName: item.manufacturerName,
        unitType: item.unitType,
        unitQuantity: item.unitQuantity,
        image: item.image,
      })),
    };
  }

  private async compareListedPrices(
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const parsed = compareListedPricesToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        error: 'Invalid arguments for compare_listed_prices',
        issues: parsed.error.issues,
      };
    }

    try {
      const detail = await this.productDetailService.getProductDetail(
        parsed.data.productId,
      );
      return this.catalogueInsightService.compareListedPricesForProduct(detail);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          error: 'Product not found',
          productId: parsed.data.productId,
        };
      }
      throw error;
    }
  }

  private buildSearchQuery(args: {
    q: string;
    manufacturerName?: string;
  }): CatalogueProductsListQuery {
    const filters: CatalogueProductsListQuery['filters'] =
      args.manufacturerName === undefined
        ? undefined
        : [
            {
              kind: 'string',
              fieldId: CatalogueFilterFieldId.ManufacturerName,
              operator: CatalogueFilterOperator.Contains,
              value: args.manufacturerName,
            },
          ];

    return {
      page: 1,
      pageSize: SEARCH_CATALOGUE_PRODUCTS_ROW_CAP,
      q: args.q,
      filters,
    };
  }
}
