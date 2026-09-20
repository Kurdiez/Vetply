import { EmptySearchSuggestionPostModule } from '../processing/post/empty-search-suggestion.post-module';
import { PackPriceCaveatPostModule } from '../processing/post/pack-price-caveat.post-module';
import { TruncationDisclosurePostModule } from '../processing/post/truncation-disclosure.post-module';
import { PreDecideTurnTool } from '../processing/pre/pre-decide-turn.tool';
import { SearchTermSuggestionPreModule } from '../processing/pre/search-term-suggestion.pre-module';
import { VagueQueryPreModule } from '../processing/pre/vague-query.pre-module';
import type { InsightsProcessModuleContext } from '../processing/insights-process-module.types';

const context: InsightsProcessModuleContext = {
  sessionId: 's1',
  turnId: 't1',
  userId: 'u1',
  userPrompt: '',
  conversationSummary: '',
};

describe('Insights process modules', () => {
  it('activates vague-query pre module for multi-category cheapest asks', async () => {
    const module = new VagueQueryPreModule();
    const result = await module.execute(
      {},
      {
        ...context,
        userPrompt:
          'I want to buy a syringe, some eye drops and also some advocate. Please give me a list of the 3 cheapest products of each category.',
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        activated: true,
        matchedCategories: expect.arrayContaining([
          'syringe',
          'eye drops',
          'advocate',
        ]),
      }),
    );
  });

  it('suggests catalogue-style glove search terms for use-context prompts', async () => {
    const module = new SearchTermSuggestionPreModule();
    const result = await module.execute(
      {},
      {
        ...context,
        userPrompt: 'I need some gloves to perform a dog examination',
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        activated: true,
        suggestedTerms: expect.arrayContaining([
          expect.objectContaining({ term: 'exam gloves' }),
        ]),
      }),
    );
  });

  it('validates pre_decide_turn_action ask_user payloads', () => {
    const tool = new PreDecideTurnTool();
    expect(
      tool.execute({
        action: 'ask_user',
        clarifyingMessage: 'Try exam gloves?',
        activatedModuleNames: ['pre_suggest_search_terms'],
      }),
    ).toEqual({
      action: 'ask_user',
      clarifyingMessage: 'Try exam gloves?',
      searchHints: [],
      activatedModuleNames: ['pre_suggest_search_terms'],
    });
  });

  it('discloses truncation for capped searches', async () => {
    const module = new TruncationDisclosurePostModule();
    const result = await module.execute(
      {
        searches: [
          { q: 'syringe', totalCount: 361, returnedCount: 15, truncated: true },
        ],
      },
      context,
    );

    expect(result).toEqual(
      expect.objectContaining({
        activated: true,
        disclosure: expect.stringContaining('capped sample'),
      }),
    );
  });

  it('suggests alternate terms for empty searches', async () => {
    const module = new EmptySearchSuggestionPostModule();
    const result = await module.execute(
      { q: 'dog examination gloves', totalCount: 0 },
      context,
    );

    expect(result).toEqual(
      expect.objectContaining({
        activated: true,
        suggestedTerms: expect.arrayContaining(['exam gloves', 'gloves']),
      }),
    );
  });

  it('warns when cheapest list mixes pack sizes', async () => {
    const module = new PackPriceCaveatPostModule();
    const result = await module.execute(
      {
        products: [
          { name: 'Advocate 3 pip', unitType: 'EA', unitQuantity: 1 },
          { name: 'Advocate 21 pack', unitType: 'PK', unitQuantity: 21 },
        ],
      },
      context,
    );

    expect(result).toEqual(
      expect.objectContaining({
        activated: true,
        caveat: expect.stringContaining('per-unit'),
      }),
    );
  });
});
