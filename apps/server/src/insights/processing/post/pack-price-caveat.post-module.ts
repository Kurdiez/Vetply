import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import type {
  InsightsPostProcessModule,
  InsightsProcessModuleContext,
} from '../insights-process-module.types';

export const PACK_PRICE_CAVEAT_POST_MODULE_NAME =
  'post_warn_pack_price_mix' as const;

const packPriceArgsSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string(),
        unitType: z.string().nullable().optional(),
        unitQuantity: z.union([z.string(), z.number()]).nullable().optional(),
        listedPrice: z.union([z.string(), z.number()]).nullable().optional(),
      }),
    )
    .default([]),
});

@Injectable()
export class PackPriceCaveatPostModule implements InsightsPostProcessModule {
  readonly name = PACK_PRICE_CAVEAT_POST_MODULE_NAME;
  readonly phase = 'post' as const;
  readonly description =
    'Activate when presenting cheapest/ranked products that use different pack sizes or unit quantities. Returns a caveat that absolute listed price is not the same as per-unit price.';

  getToolDefinition(): AiToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                unitType: { type: ['string', 'null'] },
                unitQuantity: { type: ['string', 'number', 'null'] },
                listedPrice: { type: ['string', 'number', 'null'] },
              },
              required: ['name'],
              additionalProperties: false,
            },
          },
        },
        required: ['products'],
        additionalProperties: false,
      },
    };
  }

  async execute(
    args: Record<string, unknown>,
    context: InsightsProcessModuleContext,
  ): Promise<unknown> {
    void context;
    const parsed = packPriceArgsSchema.safeParse(args);
    if (!parsed.success || parsed.data.products.length < 2) {
      return {
        activated: false,
        caveat: null,
        reason: 'Need at least two products to compare pack mix.',
      };
    }

    const packKeys = new Set(
      parsed.data.products.map(
        (product) =>
          `${product.unitType ?? 'unknown'}:${String(product.unitQuantity ?? 'unknown')}`,
      ),
    );

    if (packKeys.size <= 1) {
      return {
        activated: false,
        caveat: null,
        reason: 'Compared products share the same pack signature.',
      };
    }

    return {
      activated: true,
      distinctPackSignatures: [...packKeys],
      caveat:
        'Listed prices span different pack sizes/units, so the lowest absolute price may not be the lowest per-unit price.',
      reason: 'Mixed pack signatures in the compared set.',
    };
  }
}
