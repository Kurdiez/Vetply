import { z } from 'zod';

export const SEARCH_CATALOGUE_PRODUCTS_TOOL_NAME =
  'search_catalogue_products' as const;

export const SEARCH_CATALOGUE_PRODUCTS_ROW_CAP = 15;

export type SearchCatalogueProductsToolArgs = {
  q: string;
  manufacturerName?: string;
};

export const searchCatalogueProductsToolArgsSchema = z.object({
  q: z.string().min(1).max(512),
  manufacturerName: z.string().min(1).max(256).optional(),
});

export const searchCatalogueProductsToolParameters: Record<string, unknown> = {
  type: 'object',
  properties: {
    q: {
      type: 'string',
      description: 'Product name search text (ILIKE contains)',
      minLength: 1,
      maxLength: 512,
    },
    manufacturerName: {
      type: 'string',
      description: 'Optional manufacturer name filter (contains)',
      minLength: 1,
      maxLength: 256,
    },
  },
  required: ['q'],
  additionalProperties: false,
};
