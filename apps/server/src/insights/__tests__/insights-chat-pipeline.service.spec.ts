import type { InsightsChatStreamEvent } from '@vetply/shared';
import type { AiAgentRunnerService } from '~/ai/services/ai-agent-runner.service';
import type { AiStreamEvent } from '~/ai/types/ai-stream-event.types';
import { InsightsChatPipelineService } from '../processing/insights-chat-pipeline.service';
import type { InsightsProcessModuleRegistry } from '../processing/insights-process-module.registry';
import type { InsightsPromptService } from '../services/insights-prompt.service';
import type { InsightsToolRegistry } from '../tools/insights-tool.registry';

async function collect(
  pipeline: InsightsChatPipelineService,
): Promise<InsightsChatStreamEvent[]> {
  const events: InsightsChatStreamEvent[] = [];
  for await (const event of pipeline.run({
    sessionId: '11111111-1111-1111-1111-111111111111',
    turnId: 'abcd1234',
    userId: 'user-1',
    messages: [
      { role: 'user', content: 'I need gloves for a dog examination' },
    ],
  })) {
    events.push(event);
  }
  return events;
}

describe('InsightsChatPipelineService', () => {
  const promptService = {
    getPreProcessPrompt: jest.fn().mockReturnValue('pre'),
    getCataloguePhasePrompt: jest.fn().mockReturnValue('catalogue'),
    getPostProcessPrompt: jest.fn().mockReturnValue('post'),
  } as unknown as InsightsPromptService;

  const catalogueToolRegistry = {
    getToolDefinitions: jest
      .fn()
      .mockReturnValue([{ name: 'search_catalogue_products' }]),
    createExecutor: jest.fn().mockReturnValue(jest.fn()),
  } as unknown as InsightsToolRegistry;

  it('stops after pre-process ask_user without running catalogue tools', async () => {
    async function* preRun(): AsyncGenerator<AiStreamEvent> {
      yield {
        type: 'tool_call',
        id: '1',
        name: 'pre_suggest_search_terms',
        arguments: {},
      };
      yield {
        type: 'tool_result',
        id: '1',
        name: 'pre_suggest_search_terms',
        result: { activated: true },
      };
      yield {
        type: 'tool_call',
        id: '2',
        name: 'pre_decide_turn_action',
        arguments: { action: 'ask_user' },
      };
      yield {
        type: 'tool_result',
        id: '2',
        name: 'pre_decide_turn_action',
        result: {
          action: 'ask_user',
          clarifyingMessage: 'Did you mean exam gloves?',
          searchHints: [],
          activatedModuleNames: ['pre_suggest_search_terms'],
        },
      };
      yield { type: 'done' };
    }

    const agentRunner = {
      run: jest.fn().mockReturnValueOnce(preRun()),
    } as unknown as AiAgentRunnerService;

    const processModuleRegistry = {
      getPreToolDefinitions: jest.fn().mockReturnValue([]),
      createPreExecutor: jest.fn().mockReturnValue(jest.fn()),
      isPreDecideTool: jest.fn(
        (name: string) => name === 'pre_decide_turn_action',
      ),
      asPreDecideResult: jest.fn((result: unknown) => result),
      getPostToolDefinitions: jest.fn(),
      createPostExecutor: jest.fn(),
    } as unknown as InsightsProcessModuleRegistry;

    const pipeline = new InsightsChatPipelineService(
      promptService,
      processModuleRegistry,
      catalogueToolRegistry,
      agentRunner,
    );

    const events = await collect(pipeline);

    expect(events).toEqual([
      {
        type: 'tool_status',
        name: 'pre_suggest_search_terms',
        status: 'started',
      },
      {
        type: 'tool_status',
        name: 'pre_suggest_search_terms',
        status: 'completed',
      },
      {
        type: 'tool_status',
        name: 'pre_decide_turn_action',
        status: 'started',
      },
      {
        type: 'tool_status',
        name: 'pre_decide_turn_action',
        status: 'completed',
      },
      { type: 'text_delta', text: 'Did you mean exam gloves?' },
      { type: 'done' },
    ]);
    expect(agentRunner.run).toHaveBeenCalledTimes(1);
    expect(catalogueToolRegistry.getToolDefinitions).not.toHaveBeenCalled();
  });

  it('runs catalogue then post when pre-process proceeds', async () => {
    async function* preRun(): AsyncGenerator<AiStreamEvent> {
      yield {
        type: 'tool_result',
        id: 'd1',
        name: 'pre_decide_turn_action',
        result: {
          action: 'proceed_to_search',
          clarifyingMessage: null,
          searchHints: ['exam gloves'],
          activatedModuleNames: [],
        },
      };
      yield { type: 'done' };
    }
    async function* catalogueRun(): AsyncGenerator<AiStreamEvent> {
      yield {
        type: 'tool_call',
        id: 'c1',
        name: 'search_catalogue_products',
        arguments: { q: 'exam gloves' },
      };
      yield {
        type: 'tool_result',
        id: 'c1',
        name: 'search_catalogue_products',
        result: { totalCount: 10, returnedCount: 10, truncated: false },
      };
      yield { type: 'text_delta', text: 'Draft gloves answer' };
      yield { type: 'done' };
    }
    async function* postRun(): AsyncGenerator<AiStreamEvent> {
      yield { type: 'text_delta', text: 'Final gloves answer' };
      yield { type: 'done' };
    }

    const agentRunner = {
      run: jest
        .fn()
        .mockReturnValueOnce(preRun())
        .mockReturnValueOnce(catalogueRun())
        .mockReturnValueOnce(postRun()),
    } as unknown as AiAgentRunnerService;

    const processModuleRegistry = {
      getPreToolDefinitions: jest.fn().mockReturnValue([]),
      createPreExecutor: jest.fn().mockReturnValue(jest.fn()),
      isPreDecideTool: jest.fn(
        (name: string) => name === 'pre_decide_turn_action',
      ),
      asPreDecideResult: jest.fn((result: unknown) => result),
      getPostToolDefinitions: jest.fn().mockReturnValue([]),
      createPostExecutor: jest.fn().mockReturnValue(jest.fn()),
    } as unknown as InsightsProcessModuleRegistry;

    const pipeline = new InsightsChatPipelineService(
      promptService,
      processModuleRegistry,
      catalogueToolRegistry,
      agentRunner,
    );

    const events = await collect(pipeline);

    expect(events).toEqual([
      {
        type: 'tool_status',
        name: 'pre_decide_turn_action',
        status: 'completed',
      },
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
      { type: 'text_delta', text: 'Final gloves answer' },
      { type: 'done' },
    ]);
    expect(agentRunner.run).toHaveBeenCalledTimes(3);
  });
});
