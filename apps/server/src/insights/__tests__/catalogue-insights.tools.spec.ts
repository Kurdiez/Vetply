import {
  COMPARE_LISTED_PRICES_TOOL_NAME,
  compareListedPricesToolArgsSchema,
} from '../tools/schemas/compare-prices-tool.schema';
import {
  SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
  searchCatalogueProductsToolArgsSchema,
} from '../tools/schemas/search-products-tool.schema';
import { CatalogueInsightsTools } from '../tools/catalogue-insights.tools';
import { CatalogueInsightService } from '../services/catalogue-insight.service';
import { CatalogUnitType } from '@vetply/shared';
import { NotFoundException } from '@nestjs/common';

describe('insights catalogue tool schemas', () => {
  it('accepts valid search_catalogue_products args', () => {
    const parsed = searchCatalogueProductsToolArgsSchema.parse({
      q: 'syringe',
      manufacturerName: 'Acme',
    });
    expect(parsed).toEqual({ q: 'syringe', manufacturerName: 'Acme' });
  });

  it('rejects empty search query', () => {
    const parsed = searchCatalogueProductsToolArgsSchema.safeParse({ q: '' });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid compare_listed_prices args', () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    const parsed = compareListedPricesToolArgsSchema.parse({ productId });
    expect(parsed.productId).toBe(productId);
  });

  it('rejects non-uuid productId', () => {
    const parsed = compareListedPricesToolArgsSchema.safeParse({
      productId: 'not-a-uuid',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('CatalogueInsightsTools', () => {
  const listProducts = jest.fn();
  const getProductDetail = jest.fn();
  const insightService = new CatalogueInsightService();

  const tools = new CatalogueInsightsTools(
    { listProducts } as never,
    { getProductDetail } as never,
    insightService,
  );

  beforeEach(() => {
    listProducts.mockReset();
    getProductDetail.mockReset();
  });

  it('exposes the phase 1b tool definitions', () => {
    const definitions = tools.getToolDefinitions();
    expect(definitions.map((d) => d.name).sort()).toEqual([
      COMPARE_LISTED_PRICES_TOOL_NAME,
      SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
    ]);
  });

  it('searches products with a row cap and maps slim fields', async () => {
    listProducts.mockResolvedValue({
      items: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Syringe 10ml',
          image: null,
          manufacturerName: 'Acme',
          unitType: CatalogUnitType.EA,
          unitQuantity: '1',
          covetrusPrice: '9.00',
          nvsPrice: null,
          veenakPrice: null,
          mwiahPrice: null,
        },
      ],
      totalCount: 40,
      page: 1,
      pageSize: 15,
    });

    const result = await tools.execute(SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME, {
      q: 'syringe',
    });

    expect(listProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 15,
        q: 'syringe',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        totalCount: 40,
        returnedCount: 1,
        truncated: true,
        products: [
          expect.objectContaining({
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Syringe 10ml',
            manufacturerName: 'Acme',
          }),
        ],
      }),
    );
  });

  it('returns validation error for bad search args', async () => {
    const result = await tools.execute(SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME, {
      q: '',
    });
    expect(result).toEqual(
      expect.objectContaining({
        error: 'Invalid arguments for search_catalogue_products',
      }),
    );
    expect(listProducts).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only search query after trim', async () => {
    const result = await tools.execute(SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME, {
      q: '   ',
    });
    expect(result).toEqual(
      expect.objectContaining({
        error: 'Invalid arguments for search_catalogue_products',
      }),
    );
    expect(listProducts).not.toHaveBeenCalled();
  });

  it('compares listed prices via CatalogueInsightService', async () => {
    getProductDetail.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Syringe 10ml',
      image: null,
      manufacturerId: null,
      manufacturerName: 'Acme',
      salesCategory: null,
      legalCategory: null,
      pom: null,
      unitType: CatalogUnitType.EA,
      unitQuantity: '1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      listings: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          supplierName: 'NVS',
          supplierProductId: 'nvs-1',
          name: 'Syringe NVS',
          listedPrice: '11.00',
        },
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          supplierName: 'COVETRUS',
          supplierProductId: 'cov-1',
          name: 'Syringe Cov',
          listedPrice: '9.50',
        },
      ],
    });

    const result = await tools.execute(COMPARE_LISTED_PRICES_TOOL_NAME, {
      productId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual(
      expect.objectContaining({
        cheapestListedPrice: '9.50',
        cheapestOffers: [
          expect.objectContaining({
            supplierName: 'COVETRUS',
            listedPrice: '9.50',
          }),
        ],
      }),
    );
  });

  it('returns a tool error when the product is missing', async () => {
    getProductDetail.mockRejectedValue(new NotFoundException());

    const result = await tools.execute(COMPARE_LISTED_PRICES_TOOL_NAME, {
      productId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual({
      error: 'Product not found',
      productId: '11111111-1111-4111-8111-111111111111',
    });
  });
});
