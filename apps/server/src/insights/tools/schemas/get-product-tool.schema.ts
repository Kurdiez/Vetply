import { z } from 'zod';

export const GET_PRODUCT_WITH_LISTINGS_TOOL_NAME =
  'get_product_with_listings' as const;

export const getProductWithListingsToolArgsSchema = z.object({
  productId: z.string().uuid(),
});

export type GetProductWithListingsToolArgs = z.infer<
  typeof getProductWithListingsToolArgsSchema
>;

export const getProductWithListingsToolParameters: Record<string, unknown> = {
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      format: 'uuid',
      description: 'Catalogue product id to fetch with all supplier listings',
    },
  },
  required: ['productId'],
  additionalProperties: false,
};
