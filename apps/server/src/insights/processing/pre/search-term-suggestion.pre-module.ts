import { Injectable } from '@nestjs/common';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import type {
  InsightsPreProcessModule,
  InsightsProcessModuleContext,
} from '../insights-process-module.types';

export const SEARCH_TERM_SUGGESTION_PRE_MODULE_NAME =
  'pre_suggest_search_terms' as const;

type SuggestedSearchTerm = {
  term: string;
  reason: string;
};

@Injectable()
export class SearchTermSuggestionPreModule implements InsightsPreProcessModule {
  readonly name = SEARCH_TERM_SUGGESTION_PRE_MODULE_NAME;
  readonly phase = 'pre' as const;
  readonly description =
    'Activate when the user prompt mixes use-context words (species, procedure, intent) with a product type in a way that may fail literal catalogue ILIKE search. Returns alternate catalogue-style search terms for the user to confirm — does not search.';

  getToolDefinition(): AiToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    };
  }

  async execute(
    _args: Record<string, unknown>,
    context: InsightsProcessModuleContext,
  ): Promise<unknown> {
    return this.suggestSearchTerms(context.userPrompt);
  }

  private suggestSearchTerms(userPrompt: string): {
    activated: boolean;
    originalPrompt: string;
    suggestedTerms: SuggestedSearchTerm[];
    reason: string;
  } {
    const normalized = userPrompt.toLowerCase();
    const suggestions: SuggestedSearchTerm[] = [];

    if (
      /\bglove/.test(normalized) &&
      /\b(dog|cat|exam|examination|surgery|surgical|procedure)\b/.test(
        normalized,
      )
    ) {
      suggestions.push(
        {
          term: 'exam gloves',
          reason:
            'Catalogue names use exam/examination glove wording more often than species.',
        },
        {
          term: 'nitrile gloves',
          reason: 'Common exam-glove material filter.',
        },
        {
          term: 'latex gloves',
          reason: 'Common exam-glove material filter.',
        },
      );
    }

    if (
      /\b(needle|needles)\b/.test(normalized) &&
      /\b(hypodermic|injection)\b/.test(normalized) === false
    ) {
      suggestions.push({
        term: 'hypodermic needle',
        reason: 'Broader catalogue wording for injectable needles.',
      });
    }

    if (suggestions.length === 0) {
      return {
        activated: false,
        originalPrompt: userPrompt,
        suggestedTerms: [],
        reason: 'No use-context / catalogue wording mismatch detected.',
      };
    }

    return {
      activated: true,
      originalPrompt: userPrompt,
      suggestedTerms: suggestions,
      reason:
        'Prompt may be too literal for ILIKE contains search; confirm a catalogue-style term before searching.',
    };
  }
}
