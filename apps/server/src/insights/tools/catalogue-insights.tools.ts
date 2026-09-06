import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  Supplier,
  SupplierListingFilterFieldId,
  SupplierListingSupplierOperator,
  type CatalogueProductsListQuery,
  type CatalogueSupplierListingsQuery,
} from '@vetply/shared';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import { CatalogueManufacturerService } from '~/catalogue/services/catalogue-manufacturer.service';
import { CatalogueProductDetailService } from '~/catalogue/services/catalogue-product-detail.service';
import { CatalogueProductListService } from '~/catalogue/services/catalogue-product-list.service';
import { CatalogueSupplierListingListService } from '~/catalogue/services/catalogue-supplier-listing-list.service';
import { CatalogueInsightService } from '../services/catalogue-insight.service';
import {
  COMPARE_LISTED_PRICES_TOOL_NAME,
  compareListedPricesToolArgsSchema,
  compareListedPricesToolParameters,
} from './schemas/compare-prices-tool.schema';
import {
  GET_PRODUCT_WITH_LISTINGS_TOOL_NAME,
  getProductWithListingsToolArgsSchema,
  getProductWithListingsToolParameters,
} from './schemas/get-product-tool.schema';
import {
  LIST_MANUFACTURERS_ROW_CAP,
  LIST_MANUFACTURERS_TOOL_NAME,
  listManufacturersToolArgsSchema,
  listManufacturersToolParameters,
} from './schemas/list-manufacturers-tool.schema';
import {
  LIST_SUPPLIERS_TOOL_NAME,
  listSuppliersToolArgsSchema,
  listSuppliersToolParameters,
} from './schemas/list-suppliers-tool.schema';
import {
  SEARCH_CATALOGUE_PRODUCTS_ROW_CAP,
  SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
  searchCatalogueProductsToolArgsSchema,
  searchCatalogueProductsToolParameters,
} from './schemas/search-products-tool.schema';
import {
  SEARCH_SUPPLIER_LISTINGS_ROW_CAP,
  SEARCH_SUPPLIER_LISTINGS_TOOL_NAME,
  searchSupplierListingsToolArgsSchema,
  searchSupplierListingsToolParameters,
} from './schemas/search-supplier-listings-tool.schema';

@Injectable()
export class CatalogueInsightsTools {
  private readonly logger = new Logger(CatalogueInsightsTools.name);

  constructor(
    private readonly productListService: CatalogueProductListService,
    private readonly productDetailService: CatalogueProductDetailService,
    private readonly catalogueInsightService: CatalogueInsightService,
    private readonly supplierListingListService: CatalogueSupplierListingListService,
    private readonly manufacturerService: CatalogueManufacturerService,
  ) {}

  getToolDefinitions(): AiToolDefinition[] {
    return [
      {
        name: SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
        description:
          'Search catalogue products by name (optional manufacturer filter). Returns a capped list of candidates with id, name, manufacturer, and unit, plus distinctManufacturerNames aggregated from the returned rows. For "which manufacturers sell X?" questions, use this tool and report distinctManufacturerNames (and mention productsWithoutManufacturerCount if some rows lack a manufacturer).',
        parameters: searchCatalogueProductsToolParameters,
      },
      {
        name: GET_PRODUCT_WITH_LISTINGS_TOOL_NAME,
        description:
          'Fetch one catalogue product by id with all linked supplier listings and listed prices (null when missing). Use when you need full listing detail for a known product id.',
        parameters: getProductWithListingsToolParameters,
      },
      {
        name: COMPARE_LISTED_PRICES_TOOL_NAME,
        description:
          'Compare supplier listed prices for one catalogue product id. Server computes the cheapest listed price — never invent or recalculate prices yourself; trust this tool output.',
        parameters: compareListedPricesToolParameters,
      },
      {
        name: SEARCH_SUPPLIER_LISTINGS_TOOL_NAME,
        description:
          'Search raw supplier listings by name (optional supplier filter). Includes unmapped listings that catalogue product search may miss. Set unmappedOnly=true to only return listings not linked to a catalogue product.',
        parameters: searchSupplierListingsToolParameters,
      },
      {
        name: LIST_MANUFACTURERS_TOOL_NAME,
        description:
          'List catalogue manufacturers (optional name filter). Use to help disambiguate brand/manufacturer questions.',
        parameters: listManufacturersToolParameters,
      },
      {
        name: LIST_SUPPLIERS_TOOL_NAME,
        description:
          'List known supplier names in the catalogue (NVS, VEENAK, COVETRUS, MWIAH). Use for disambiguation when the user asks which suppliers exist.',
        parameters: listSuppliersToolParameters,
      },
    ];
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME:
        return this.searchCatalogueProducts(args);
      case GET_PRODUCT_WITH_LISTINGS_TOOL_NAME:
        return this.getProductWithListings(args);
      case COMPARE_LISTED_PRICES_TOOL_NAME:
        return this.compareListedPrices(args);
      case SEARCH_SUPPLIER_LISTINGS_TOOL_NAME:
        return this.searchSupplierListings(args);
      case LIST_MANUFACTURERS_TOOL_NAME:
        return this.listManufacturers(args);
      case LIST_SUPPLIERS_TOOL_NAME:
        return this.listSuppliers(args);
      default:
        this.logger.warn(`Unknown insights tool requested: ${name}`);
        return { error: `Unknown tool: ${name}` };
    }
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

    const query = this.buildProductSearchQuery({
      q,
      manufacturerName:
        manufacturerName && manufacturerName.length > 0
          ? manufacturerName
          : undefined,
    });
    const result = await this.productListService.listProducts(query);
    const products = result.items.map((item) => ({
      id: item.id,
      name: item.name,
      manufacturerName: item.manufacturerName,
      unitType: item.unitType,
      unitQuantity: item.unitQuantity,
      image: item.image,
    }));
    const manufacturerSummary =
      this.summarizeManufacturersFromProducts(products);

    return {
      q,
      manufacturerName: manufacturerName ?? null,
      totalCount: result.totalCount,
      returnedCount: products.length,
      rowCap: SEARCH_CATALOGUE_PRODUCTS_ROW_CAP,
      truncated: result.totalCount > products.length,
      ...manufacturerSummary,
      products,
    };
  }

  private summarizeManufacturersFromProducts(
    products: Array<{ manufacturerName: string | null }>,
  ): {
    distinctManufacturerNames: string[];
    productsWithManufacturerCount: number;
    productsWithoutManufacturerCount: number;
  } {
    const names = new Set<string>();
    let productsWithManufacturerCount = 0;
    let productsWithoutManufacturerCount = 0;

    for (const product of products) {
      const name = product.manufacturerName?.trim();
      if (name === undefined || name.length === 0) {
        productsWithoutManufacturerCount += 1;
        continue;
      }
      productsWithManufacturerCount += 1;
      names.add(name);
    }

    return {
      distinctManufacturerNames: [...names].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
      productsWithManufacturerCount,
      productsWithoutManufacturerCount,
    };
  }

  private async getProductWithListings(
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const parsed = getProductWithListingsToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        error: 'Invalid arguments for get_product_with_listings',
        issues: parsed.error.issues,
      };
    }

    try {
      const detail = await this.productDetailService.getProductDetail(
        parsed.data.productId,
      );
      return {
        id: detail.id,
        name: detail.name,
        manufacturerName: detail.manufacturerName,
        salesCategory: detail.salesCategory,
        unitType: detail.unitType,
        unitQuantity: detail.unitQuantity,
        listings: detail.listings.map((listing) => ({
          id: listing.id,
          supplierName: listing.supplierName,
          supplierProductId: listing.supplierProductId,
          name: listing.name,
          listedPrice: listing.listedPrice,
        })),
        listingsWithoutPriceCount: detail.listings.filter(
          (listing) => listing.listedPrice === null,
        ).length,
      };
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

  private async searchSupplierListings(
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const parsed = searchSupplierListingsToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        error: 'Invalid arguments for search_supplier_listings',
        issues: parsed.error.issues,
      };
    }

    const q = parsed.data.q.trim();
    if (q.length === 0) {
      return {
        error: 'Invalid arguments for search_supplier_listings',
        issues: [{ message: 'q must not be blank' }],
      };
    }

    const query = this.buildSupplierListingSearchQuery({
      q,
      supplier: parsed.data.supplier,
      unmappedOnly: parsed.data.unmappedOnly === true,
    });
    const result =
      await this.supplierListingListService.listSupplierListings(query);

    return {
      q,
      supplier: parsed.data.supplier ?? null,
      unmappedOnly: parsed.data.unmappedOnly === true,
      totalCount: result.totalCount,
      returnedCount: result.items.length,
      rowCap: SEARCH_SUPPLIER_LISTINGS_ROW_CAP,
      truncated: result.totalCount > result.items.length,
      listings: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        supplierName: item.supplierName,
        supplierProductId: item.supplierProductId,
        listedPrice: item.listedPrice,
        catalogProductName: item.catalogProductName,
        isMapped: item.catalogProductName !== null,
      })),
    };
  }

  private async listManufacturers(
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const parsed = listManufacturersToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        error: 'Invalid arguments for list_manufacturers',
        issues: parsed.error.issues,
      };
    }

    const q = parsed.data.q?.trim();
    const all = await this.manufacturerService.list();
    const filtered =
      q === undefined || q.length === 0
        ? all
        : all.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
    const manufacturers = filtered.slice(0, LIST_MANUFACTURERS_ROW_CAP);

    return {
      q: q && q.length > 0 ? q : null,
      totalCount: filtered.length,
      returnedCount: manufacturers.length,
      rowCap: LIST_MANUFACTURERS_ROW_CAP,
      truncated: filtered.length > manufacturers.length,
      manufacturers,
    };
  }

  private listSuppliers(args: Record<string, unknown>): unknown {
    const parsed = listSuppliersToolArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        error: 'Invalid arguments for list_suppliers',
        issues: parsed.error.issues,
      };
    }

    const suppliers = Object.values(Supplier);
    return {
      suppliers,
      returnedCount: suppliers.length,
    };
  }

  private buildProductSearchQuery(args: {
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

  private buildSupplierListingSearchQuery(args: {
    q: string;
    supplier?: Supplier;
    unmappedOnly: boolean;
  }): CatalogueSupplierListingsQuery {
    const filters: CatalogueSupplierListingsQuery['filters'] = [];
    if (args.supplier !== undefined) {
      filters.push({
        kind: 'supplier',
        fieldId: SupplierListingFilterFieldId.Supplier,
        operator: SupplierListingSupplierOperator.IsExactly,
        value: args.supplier,
      });
    }
    if (args.unmappedOnly) {
      filters.push({ kind: 'catalogProductNotLinked' });
    }

    return {
      page: 1,
      pageSize: SEARCH_SUPPLIER_LISTINGS_ROW_CAP,
      q: args.q,
      filters: filters.length > 0 ? filters : undefined,
    };
  }
}
