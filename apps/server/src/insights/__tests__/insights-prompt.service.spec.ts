import { InsightsPromptService } from '../services/insights-prompt.service';

describe('InsightsPromptService', () => {
  const promptService = new InsightsPromptService();

  it('instructs confirmation before retrying empty searches', () => {
    const prompt = promptService.getSystemPrompt();

    expect(prompt).toContain('## When a search returns no matches');
    expect(prompt).toContain(
      'Do not silently broaden, rewrite, or re-run the search with assumed terms.',
    );
    expect(prompt).toContain(
      'Ask which term to try next, and wait for the user to confirm or supply their own term before calling search again.',
    );
    expect(prompt).toContain(
      'Never assume the user meant a broader or different product category without confirmation.',
    );
  });
});
