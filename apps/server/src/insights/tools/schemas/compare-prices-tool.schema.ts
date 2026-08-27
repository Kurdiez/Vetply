import { z } from 'zod';

export const COMPARE_LISTED_PRICES_TOOL_NAME = 'compare_listed_prices' as const;

export const compareListedPricesToolArgsSchema = z.object({
  productId: z.string().uuid(),
});

export type CompareListedPricesToolArgs = z.infer<
  typeof compareListedPricesToolArgsSchema
>;

export const compareListedPricesToolParameters: Record<string, unknown> = {
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      format: 'uuid',
      description: 'Catalogue product id to compare listed prices for',
    },
  },
  required: ['productId'],
  additionalProperties: false,
};
