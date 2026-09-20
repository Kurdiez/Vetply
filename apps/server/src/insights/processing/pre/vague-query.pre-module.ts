import { Injectable } from '@nestjs/common';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import type {
  InsightsPreProcessModule,
  InsightsProcessModuleContext,
} from '../insights-process-module.types';

export const VAGUE_QUERY_PRE_MODULE_NAME = 'pre_assess_vague_query' as const;

const PRODUCT_CATEGORY_HINTS = [
  'syringe',
  'syringes',
  'needle',
  'needles',
  'glove',
  'gloves',
  'collar',
  'collars',
  'eye drop',
  'eye drops',
  'eyedrop',
  'advocate',
  'tablet',
  'tablets',
  'catheter',
  'bandage',
] as const;

@Injectable()
export class VagueQueryPreModule implements InsightsPreProcessModule {
  readonly name = VAGUE_QUERY_PRE_MODULE_NAME;
  readonly phase = 'pre' as const;
  readonly description =
    'Activate when the user asks about one or more product categories without enough buying criteria (size, pack, species, brand, strength). Returns whether clarification is recommended before searching.';

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
    return this.assessVagueQuery(context.userPrompt);
  }

  private assessVagueQuery(userPrompt: string): {
    activated: boolean;
    matchedCategories: string[];
    missingCriteria: string[];
    suggestedQuestions: string[];
    reason: string;
  } {
    const normalized = userPrompt.toLowerCase();
    const matchedCategories = PRODUCT_CATEGORY_HINTS.filter((hint) =>
      normalized.includes(hint),
    );

    const uniqueCategories = this.uniqueCategoryLabels(matchedCategories);
    if (uniqueCategories.length === 0) {
      return {
        activated: false,
        matchedCategories: [],
        missingCriteria: [],
        suggestedQuestions: [],
        reason: 'No broad product category detected.',
      };
    }

    const missingCriteria = this.detectMissingCriteria(normalized);
    const activated = missingCriteria.length > 0;
    return {
      activated,
      matchedCategories: uniqueCategories,
      missingCriteria,
      suggestedQuestions: activated
        ? this.buildSuggestedQuestions(uniqueCategories, missingCriteria)
        : [],
      reason: activated
        ? 'User named product categories without enough specificity for accurate cheapest/match answers.'
        : 'Categories appear specific enough to search.',
    };
  }

  private uniqueCategoryLabels(matchedHints: string[]): string[] {
    const labels = new Set<string>();
    for (const hint of matchedHints) {
      if (hint.startsWith('syringe')) {
        labels.add('syringe');
      } else if (hint.startsWith('needle')) {
        labels.add('needle');
      } else if (hint.startsWith('glove')) {
        labels.add('gloves');
      } else if (hint.startsWith('collar')) {
        labels.add('collar');
      } else if (hint.includes('eye')) {
        labels.add('eye drops');
      } else if (hint === 'advocate') {
        labels.add('advocate');
      } else if (hint.startsWith('tablet')) {
        labels.add('tablets');
      } else {
        labels.add(hint);
      }
    }
    return [...labels];
  }

  private detectMissingCriteria(normalizedPrompt: string): string[] {
    const missing: string[] = [];
    const hasSize =
      /\b(\d+(\.\d+)?\s?(ml|mg|kg|mm|g|iu)|size\s?\d|sz\s?\d)\b/i.test(
        normalizedPrompt,
      );
    const hasPack = /\b(pack|box|pk|prs|pair|pip|pipette|bottle|btl)\b/i.test(
      normalizedPrompt,
    );
    const hasSpecies =
      /\b(dog|cat|canine|feline|equine|horse|puppy|kitten)\b/i.test(
        normalizedPrompt,
      );
    const hasBrand =
      /\b(terumo|bd|nipro|krutex|systane|tears|elanco|zoetis)\b/i.test(
        normalizedPrompt,
      );

    if (!hasSize) {
      missing.push('size_or_strength');
    }
    if (!hasPack) {
      missing.push('pack_or_unit');
    }
    if (
      !hasSpecies &&
      /\b(advocate|spot.?on|wormer)\b/i.test(normalizedPrompt)
    ) {
      missing.push('species_or_weight_band');
    }
    if (!hasBrand && missing.length > 0) {
      missing.push('brand_preference');
    }
    return missing;
  }

  private buildSuggestedQuestions(
    categories: string[],
    missingCriteria: string[],
  ): string[] {
    const questions: string[] = [];
    if (categories.length > 1) {
      questions.push(
        `For ${categories.join(', ')}: which size/strength and pack do you need for each?`,
      );
    } else {
      questions.push(
        `For ${categories[0]}: which size/strength and pack are you looking for?`,
      );
    }
    if (missingCriteria.includes('species_or_weight_band')) {
      questions.push('Which species and weight band should we use?');
    }
    if (missingCriteria.includes('brand_preference')) {
      questions.push(
        'Do you have a preferred brand, or should we compare across brands?',
      );
    }
    return questions;
  }
}
