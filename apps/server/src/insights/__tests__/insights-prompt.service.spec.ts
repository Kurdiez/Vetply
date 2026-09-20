import { InsightsPromptService } from '../services/insights-prompt.service';

describe('InsightsPromptService', () => {
  const promptService = new InsightsPromptService();

  it('builds a pre-process prompt that requires decide_turn_action', () => {
    const prompt = promptService.getPreProcessPrompt();
    expect(prompt).toContain('## Pre-process phase');
    expect(prompt).toContain('pre_decide_turn_action');
    expect(prompt).toContain('ask_user');
  });

  it('builds catalogue and post prompts with phase guidance', () => {
    const catalogue = promptService.getCataloguePhasePrompt({
      searchHints: ['exam gloves'],
      activatedModuleNames: ['pre_suggest_search_terms'],
    });
    expect(catalogue).toContain('exam gloves');
    expect(catalogue).toContain('## When a search returns no matches');

    const post = promptService.getPostProcessPrompt({
      searchHints: [],
      catalogueReplyDraft: 'Draft answer',
    });
    expect(post).toContain('## Post-process phase');
    expect(post).toContain('Draft answer');
  });
});
