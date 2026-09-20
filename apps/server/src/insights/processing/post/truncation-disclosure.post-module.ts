import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import type {
  InsightsPostProcessModule,
  InsightsProcessModuleContext,
} from '../insights-process-module.types';

export const TRUNCATION_DISCLOSURE_POST_MODULE_NAME =
  'post_disclose_truncation' as const;

const truncationArgsSchema = z.object({
  searches: z
    .array(
      z.object({
        q: z.string(),
        totalCount: z.number().nullable().optional(),
        returnedCount: z.number().nullable().optional(),
        truncated: z.boolean().nullable().optional(),
      }),
    )
    .default([]),
});

@Injectable()
export class TruncationDisclosurePostModule implements InsightsPostProcessModule {
  readonly name = TRUNCATION_DISCLOSURE_POST_MODULE_NAME;
  readonly phase = 'post' as const;
  readonly description =
    'Activate when any catalogue search was truncated (truncated=true or totalCount > returnedCount). Returns wording to disclose that cheapest/listed results are from a capped sample, not the full catalogue.';

  getToolDefinition(): AiToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          searches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                q: { type: 'string' },
                totalCount: { type: ['number', 'null'] },
                returnedCount: { type: ['number', 'null'] },
                truncated: { type: ['boolean', 'null'] },
              },
              required: ['q'],
              additionalProperties: false,
            },
          },
        },
        required: ['searches'],
        additionalProperties: false,
      },
    };
  }

  async execute(
    args: Record<string, unknown>,
    context: InsightsProcessModuleContext,
  ): Promise<unknown> {
    void context;
    const parsed = truncationArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        activated: false,
        truncatedSearches: [],
        disclosure: null,
        reason: 'Invalid arguments.',
      };
    }

    const truncatedSearches = parsed.data.searches.filter((search) => {
      if (search.truncated === true) {
        return true;
      }
      if (
        typeof search.totalCount === 'number' &&
        typeof search.returnedCount === 'number'
      ) {
        return search.totalCount > search.returnedCount;
      }
      return false;
    });

    if (truncatedSearches.length === 0) {
      return {
        activated: false,
        truncatedSearches: [],
        disclosure: null,
        reason: 'No truncated searches provided.',
      };
    }

    const parts = truncatedSearches.map((search) => {
      const total =
        typeof search.totalCount === 'number' ? String(search.totalCount) : '?';
      const returned =
        typeof search.returnedCount === 'number'
          ? String(search.returnedCount)
          : '?';
      return `"${search.q}" (${returned} of ${total})`;
    });

    return {
      activated: true,
      truncatedSearches,
      disclosure: `These recommendations are from a capped sample of catalogue matches (${parts.join('; ')}), not a full catalogue sort by price.`,
      reason: 'One or more searches exceeded the row cap.',
    };
  }
}
