import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import type {
  InsightsPostProcessModule,
  InsightsProcessModuleContext,
} from '../insights-process-module.types';

export const EMPTY_SEARCH_SUGGESTION_POST_MODULE_NAME =
  'post_suggest_empty_search_terms' as const;

const emptySearchArgsSchema = z.object({
  q: z.string().min(1),
  totalCount: z.number().int().nonnegative(),
});

@Injectable()
export class EmptySearchSuggestionPostModule implements InsightsPostProcessModule {
  readonly name = EMPTY_SEARCH_SUGGESTION_POST_MODULE_NAME;
  readonly phase = 'post' as const;
  readonly description =
    'Activate when a catalogue search returned totalCount=0. Returns alternate catalogue-style terms to offer the user for confirmation before searching again.';

  getToolDefinition(): AiToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'The search query that returned no matches.',
          },
          totalCount: {
            type: 'number',
            description: 'Must be 0 for this module to activate.',
          },
        },
        required: ['q', 'totalCount'],
        additionalProperties: false,
      },
    };
  }

  async execute(
    args: Record<string, unknown>,
    context: InsightsProcessModuleContext,
  ): Promise<unknown> {
    void context;
    const parsed = emptySearchArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        activated: false,
        suggestedTerms: [],
        reason: 'Invalid arguments.',
      };
    }

    if (parsed.data.totalCount !== 0) {
      return {
        activated: false,
        suggestedTerms: [],
        reason: 'Search was not empty.',
      };
    }

    const suggestedTerms = this.buildSuggestedTerms(parsed.data.q);
    return {
      activated: true,
      originalQuery: parsed.data.q,
      suggestedTerms,
      reason:
        'Exact search returned no matches; confirm an alternate term with the user before retrying.',
    };
  }

  private buildSuggestedTerms(q: string): string[] {
    const normalized = q.toLowerCase();
    const terms: string[] = [];

    if (normalized.includes('glove')) {
      terms.push('exam gloves', 'nitrile gloves', 'latex gloves', 'gloves');
    }
    if (normalized.includes('needle')) {
      terms.push('hypodermic needle', 'needle');
    }
    if (normalized.includes('eye')) {
      terms.push('eye drops', 'ophthalmic');
    }

    const tokens = normalized
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4);
    for (const token of tokens.slice(0, 3)) {
      if (!terms.includes(token)) {
        terms.push(token);
      }
    }

    return terms.slice(0, 5);
  }
}
