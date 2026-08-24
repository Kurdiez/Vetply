import { AiAgentRunnerService } from '../services/ai-agent-runner.service';
import type { AiModelClient } from '../clients/ai-model.client';
import type { AiStreamEvent } from '../types/ai-stream-event.types';
import type { AiToolDefinition } from '../types/ai-tool.types';

async function collectEvents(
  runner: AiAgentRunnerService,
  options: Parameters<AiAgentRunnerService['run']>[0],
): Promise<AiStreamEvent[]> {
  const events: AiStreamEvent[] = [];
  for await (const event of runner.run(options)) {
    events.push(event);
  }
  return events;
}

describe('AiAgentRunnerService', () => {
  const echoTool: AiToolDefinition = {
    name: 'echo',
    description: 'Echoes the provided message',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  };

  it('streams a plain text reply when the model returns content', async () => {
    const modelClient: AiModelClient = {
      complete: jest.fn().mockResolvedValue({
        content: 'hello from model',
        toolCalls: [],
      }),
    };
    const runner = new AiAgentRunnerService(modelClient);

    const events = await collectEvents(runner, {
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(events).toEqual([
      { type: 'text_delta', text: 'hello from model' },
      { type: 'done' },
    ]);
    expect(modelClient.complete).toHaveBeenCalledTimes(1);
  });

  it('runs a dummy tool call then returns the follow-up text', async () => {
    const modelClient: AiModelClient = {
      complete: jest
        .fn()
        .mockResolvedValueOnce({
          content: null,
          toolCalls: [
            {
              id: 'call_1',
              name: 'echo',
              argumentsJson: JSON.stringify({ message: 'syringe' }),
            },
          ],
        })
        .mockResolvedValueOnce({
          content: 'Echoed syringe',
          toolCalls: [],
        }),
    };
    const executeTool = jest.fn().mockResolvedValue({ echoed: 'syringe' });
    const runner = new AiAgentRunnerService(modelClient);

    const events = await collectEvents(runner, {
      messages: [{ role: 'user', content: 'echo syringe' }],
      tools: [echoTool],
      executeTool,
    });

    expect(executeTool).toHaveBeenCalledWith('echo', { message: 'syringe' });
    expect(events).toEqual([
      {
        type: 'tool_call',
        id: 'call_1',
        name: 'echo',
        arguments: { message: 'syringe' },
      },
      {
        type: 'tool_result',
        id: 'call_1',
        name: 'echo',
        result: { echoed: 'syringe' },
      },
      { type: 'text_delta', text: 'Echoed syringe' },
      { type: 'done' },
    ]);
    expect(modelClient.complete).toHaveBeenCalledTimes(2);
  });

  it('throws when the model requests a tool without an executor', async () => {
    const modelClient: AiModelClient = {
      complete: jest.fn().mockResolvedValue({
        content: null,
        toolCalls: [
          {
            id: 'call_1',
            name: 'echo',
            argumentsJson: '{}',
          },
        ],
      }),
    };
    const runner = new AiAgentRunnerService(modelClient);

    await expect(
      collectEvents(runner, {
        messages: [{ role: 'user', content: 'call a tool' }],
        tools: [echoTool],
      }),
    ).rejects.toThrow(
      'Model requested a tool call but no executeTool handler was provided',
    );
  });
});
