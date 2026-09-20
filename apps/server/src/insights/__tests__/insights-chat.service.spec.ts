import type { InsightsChatStreamEvent } from '@vetply/shared';
import { InsightsChatPipelineService } from '../processing/insights-chat-pipeline.service';
import { InsightsChatService } from '../services/insights-chat.service';

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
  it('streams pipeline events and logs tool activity', async () => {
    async function* run() {
      yield {
        type: 'tool_status' as const,
        name: 'pre_assess_vague_query',
        status: 'started' as const,
      };
      yield {
        type: 'tool_status' as const,
        name: 'pre_assess_vague_query',
        status: 'completed' as const,
      };
      yield { type: 'text_delta' as const, text: 'Which pack size?' };
      yield { type: 'done' as const };
    }

    const pipeline = {
      run: jest.fn().mockReturnValue(run()),
    } as unknown as InsightsChatPipelineService;

    const service = new InsightsChatService(pipeline);
    const events = await collectEvents(service, [
      { role: 'user', content: 'cheapest syringe?' },
    ]);

    expect(events).toEqual([
      {
        type: 'tool_status',
        name: 'pre_assess_vague_query',
        status: 'started',
      },
      {
        type: 'tool_status',
        name: 'pre_assess_vague_query',
        status: 'completed',
      },
      { type: 'text_delta', text: 'Which pack size?' },
      { type: 'done' },
    ]);
    expect(pipeline.run).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: '11111111-1111-1111-1111-111111111111',
        userId: 'user-1',
      }),
    );
  });

  it('emits INSIGHTS_AI_NOT_CONFIGURED when the API key is missing', async () => {
    const pipeline = {
      run: jest.fn().mockImplementation(async function* () {
        throw new Error(
          'OPENAI_API_KEY is not configured; set it in the server environment',
        );
      }),
    } as unknown as InsightsChatPipelineService;

    const service = new InsightsChatService(pipeline);
    const events = await collectEvents(service, [
      { role: 'user', content: 'hi' },
    ]);

    expect(events).toEqual([
      { type: 'error', failReason: 'INSIGHTS_AI_NOT_CONFIGURED' },
    ]);
  });
});
