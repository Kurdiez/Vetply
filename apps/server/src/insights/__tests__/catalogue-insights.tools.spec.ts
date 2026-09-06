import { NotFoundException } from '@nestjs/common';
import { CatalogUnitType, Supplier } from '@vetply/shared';
import { CatalogueInsightService } from '../services/catalogue-insight.service';
import { CatalogueInsightsTools } from '../tools/catalogue-insights.tools';
import {
  COMPARE_LISTED_PRICES_TOOL_NAME,
  compareListedPricesToolArgsSchema,
} from '../tools/schemas/compare-prices-tool.schema';
import {
  GET_PRODUCT_WITH_LISTINGS_TOOL_NAME,
  getProductWithListingsToolArgsSchema,
} from '../tools/schemas/get-product-tool.schema';
import {
  LIST_MANUFACTURERS_TOOL_NAME,
  listManufacturersToolArgsSchema,
} from '../tools/schemas/list-manufacturers-tool.schema';
import { LIST_SUPPLIERS_TOOL_NAME } from '../tools/schemas/list-suppliers-tool.schema';
import {
  SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
  searchCatalogueProductsToolArgsSchema,
} from '../tools/schemas/search-products-tool.schema';
import {
  SEARCH_SUPPLIER_LISTINGS_TOOL_NAME,
  searchSupplierListingsToolArgsSchema,
} from '../tools/schemas/search-supplier-listings-tool.schema';

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

  it('rejects non-uuid productId for compare_listed_prices', () => {
    const parsed = compareListedPricesToolArgsSchema.safeParse({
      productId: 'not-a-uuid',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid get_product_with_listings args', () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    expect(
      getProductWithListingsToolArgsSchema.parse({ productId }).productId,
    ).toBe(productId);
  });

  it('accepts search_supplier_listings with supplier and unmappedOnly', () => {
    const parsed = searchSupplierListingsToolArgsSchema.parse({
      q: 'syringe',
      supplier: Supplier.NVS,
      unmappedOnly: true,
    });
    expect(parsed).toEqual({
      q: 'syringe',
      supplier: Supplier.NVS,
      unmappedOnly: true,
    });
  });

  it('accepts optional list_manufacturers q', () => {
    expect(listManufacturersToolArgsSchema.parse({ q: 'Zoetis' })).toEqual({
      q: 'Zoetis',
    });
    expect(listManufacturersToolArgsSchema.parse({})).toEqual({});
  });
});

describe('CatalogueInsightsTools', () => {
  const listProducts = jest.fn();
  const getProductDetail = jest.fn();
  const listSupplierListings = jest.fn();
  const listManufacturers = jest.fn();
  const insightService = new CatalogueInsightService();

  const tools = new CatalogueInsightsTools(
    { listProducts } as never,
    { getProductDetail } as never,
    insightService,
    { listSupplierListings } as never,
    { list: listManufacturers } as never,
  );

  beforeEach(() => {
    listProducts.mockReset();
    getProductDetail.mockReset();
    listSupplierListings.mockReset();
    listManufacturers.mockReset();
  });

  it('exposes the full v1 tool definitions', () => {
    const definitions = tools.getToolDefinitions();
    expect(definitions.map((d) => d.name).sort()).toEqual([
      COMPARE_LISTED_PRICES_TOOL_NAME,
      GET_PRODUCT_WITH_LISTINGS_TOOL_NAME,
      LIST_MANUFACTURERS_TOOL_NAME,
      LIST_SUPPLIERS_TOOL_NAME,
      SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME,
      SEARCH_SUPPLIER_LISTINGS_TOOL_NAME,
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
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Syringe 5ml',
          image: null,
          manufacturerName: 'Acme',
          unitType: CatalogUnitType.EA,
          unitQuantity: '1',
          covetrusPrice: null,
          nvsPrice: null,
          veenakPrice: null,
          mwiahPrice: null,
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Syringe Generic',
          image: null,
          manufacturerName: null,
          unitType: CatalogUnitType.EA,
          unitQuantity: '1',
          covetrusPrice: null,
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
        returnedCount: 3,
        truncated: true,
        distinctManufacturerNames: ['Acme'],
        productsWithManufacturerCount: 2,
        productsWithoutManufacturerCount: 1,
        products: [
          expect.objectContaining({
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Syringe 10ml',
            manufacturerName: 'Acme',
          }),
          expect.objectContaining({
            manufacturerName: 'Acme',
          }),
          expect.objectContaining({
            manufacturerName: null,
          }),
        ],
      }),
    );
  });

  it('returns empty products when search has no matches', async () => {
    listProducts.mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 15,
    });

    const result = await tools.execute(SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME, {
      q: 'zzzz-no-match',
    });

    expect(result).toEqual(
      expect.objectContaining({
        totalCount: 0,
        returnedCount: 0,
        truncated: false,
        distinctManufacturerNames: [],
        productsWithManufacturerCount: 0,
        productsWithoutManufacturerCount: 0,
        products: [],
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

  it('gets a product with listings including null prices', async () => {
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
          supplierName: 'MWIAH',
          supplierProductId: 'mw-1',
          name: 'Syringe Mw',
          listedPrice: null,
        },
      ],
    });

    const result = await tools.execute(GET_PRODUCT_WITH_LISTINGS_TOOL_NAME, {
      productId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'Syringe 10ml',
        listingsWithoutPriceCount: 1,
        listings: expect.arrayContaining([
          expect.objectContaining({
            supplierName: 'MWIAH',
            listedPrice: null,
          }),
        ]),
      }),
    );
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

  it('searches supplier listings with row cap and mapping flag', async () => {
    listSupplierListings.mockResolvedValue({
      items: [
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          name: 'Unmapped Syringe',
          supplierName: Supplier.NVS,
          supplierProductId: 'sku-1',
          listedPrice: '3.50',
          catalogProductName: null,
          thumbnailImage: null,
        },
      ],
      totalCount: 20,
      page: 1,
      pageSize: 15,
    });

    const result = await tools.execute(SEARCH_SUPPLIER_LISTINGS_TOOL_NAME, {
      q: 'syringe',
      unmappedOnly: true,
    });

    expect(listSupplierListings).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 15,
        q: 'syringe',
        filters: expect.arrayContaining([
          expect.objectContaining({ kind: 'catalogProductNotLinked' }),
        ]),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        truncated: true,
        listings: [
          expect.objectContaining({
            name: 'Unmapped Syringe',
            isMapped: false,
            listedPrice: '3.50',
          }),
        ],
      }),
    );
  });

  it('lists manufacturers with optional name filter', async () => {
    listManufacturers.mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111', name: 'Zoetis' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'Acme' },
    ]);

    const result = await tools.execute(LIST_MANUFACTURERS_TOOL_NAME, {
      q: 'zoe',
    });

    expect(result).toEqual(
      expect.objectContaining({
        totalCount: 1,
        returnedCount: 1,
        manufacturers: [
          expect.objectContaining({
            name: 'Zoetis',
          }),
        ],
      }),
    );
  });

  it('lists known suppliers from the Supplier enum', async () => {
    const result = await tools.execute(LIST_SUPPLIERS_TOOL_NAME, {});
    expect(result).toEqual({
      suppliers: Object.values(Supplier),
      returnedCount: Object.values(Supplier).length,
    });
  });
});
