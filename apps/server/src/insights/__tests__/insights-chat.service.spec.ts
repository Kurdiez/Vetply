import type { InsightsChatStreamEvent } from '@vetply/shared';
import { InsightsChatService } from '../services/insights-chat.service';
import { InsightsPromptService } from '../services/insights-prompt.service';
import type { InsightsToolRegistry } from '../tools/insights-tool.registry';
import type { AiAgentRunnerService } from '~/ai/services/ai-agent-runner.service';
import type { AiStreamEvent } from '~/ai/types/ai-stream-event.types';

async function collectEvents(
  service: InsightsChatService,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<InsightsChatStreamEvent[]> {
  const events: InsightsChatStreamEvent[] = [];
  for await (const event of service.streamChat({
    sessionId: '11111111-1111-1111-1111-111111111111',
    userId: 'user-1',
    messages,
  })) {
    events.push(event);
  }
  return events;
}

describe('InsightsChatService', () => {
  const promptService = new InsightsPromptService();
  const executeTool = jest.fn();
  const toolRegistry = {
    getToolDefinitions: jest.fn().mockReturnValue([]),
    createExecutor: jest.fn().mockReturnValue(executeTool),
  } as unknown as InsightsToolRegistry;

  it('maps agent stream events to insights SSE events', async () => {
    async function* run(): AsyncGenerator<AiStreamEvent> {
      yield {
        type: 'tool_call',
        id: 'c1',
        name: 'search_catalogue_products',
        arguments: { q: 'syringe' },
      };
      yield {
        type: 'tool_result',
        id: 'c1',
        name: 'search_catalogue_products',
        result: { products: [] },
      };
      yield { type: 'text_delta', text: 'Which syringe pack?' };
      yield { type: 'done' };
    }

    const agentRunner = {
      run: jest.fn().mockReturnValue(run()),
    } as unknown as AiAgentRunnerService;

    const service = new InsightsChatService(
      promptService,
      toolRegistry,
      agentRunner,
    );

    const events = await collectEvents(service, [
      { role: 'user', content: 'cheapest syringe?' },
    ]);

    expect(events).toEqual([
      {
        type: 'tool_status',
        name: 'search_catalogue_products',
        status: 'started',
      },
      {
        type: 'tool_status',
        name: 'search_catalogue_products',
        status: 'completed',
      },
      { type: 'text_delta', text: 'Which syringe pack?' },
      { type: 'done' },
    ]);
    expect(agentRunner.run).toHaveBeenCalledWith(
      expect.objectContaining({ maxToolRounds: 4 }),
    );
  });

  it('emits INSIGHTS_AI_NOT_CONFIGURED when the API key is missing', async () => {
    const agentRunner = {
      run: jest.fn().mockImplementation(async function* () {
        throw new Error(
          'OPENAI_API_KEY is not configured; set it in the server environment',
        );
      }),
    } as unknown as AiAgentRunnerService;

    const service = new InsightsChatService(
      promptService,
      toolRegistry,
      agentRunner,
    );

    const events = await collectEvents(service, [
      { role: 'user', content: 'hi' },
    ]);

    expect(events).toEqual([
      { type: 'error', failReason: 'INSIGHTS_AI_NOT_CONFIGURED' },
    ]);
  });
});
