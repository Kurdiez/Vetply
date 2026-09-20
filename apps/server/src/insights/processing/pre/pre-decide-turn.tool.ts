import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiToolDefinition } from '~/ai/types/ai-tool.types';
import type { PreDecideTurnResult } from '../insights-process-module.types';

export const PRE_DECIDE_TURN_ACTION_TOOL_NAME =
  'pre_decide_turn_action' as const;

const preDecideTurnArgsSchema = z.object({
  action: z.enum(['ask_user', 'proceed_to_search']),
  clarifyingMessage: z.string().min(1).nullable().optional(),
  searchHints: z.array(z.string().min(1)).optional(),
  activatedModuleNames: z.array(z.string().min(1)).optional(),
});

@Injectable()
export class PreDecideTurnTool {
  readonly name = PRE_DECIDE_TURN_ACTION_TOOL_NAME;

  getToolDefinition(): AiToolDefinition {
    return {
      name: this.name,
      description:
        'Required end-of-pre-process decision. Call after reviewing activated pre-module outputs. Use ask_user when clarification or search-term confirmation is needed (do not search yet). Use proceed_to_search only when ready to run catalogue tools.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['ask_user', 'proceed_to_search'],
            description:
              'Whether to stop and ask the user, or continue to catalogue search.',
          },
          clarifyingMessage: {
            type: ['string', 'null'],
            description:
              'User-facing message when action is ask_user. Include suggested options when recommending search terms.',
          },
          searchHints: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Optional catalogue search hints when proceeding (confirmed or clear terms only).',
          },
          activatedModuleNames: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Names of pre-modules whose activated=true outputs you relied on.',
          },
        },
        required: ['action'],
        additionalProperties: false,
      },
    };
  }

  execute(args: Record<string, unknown>): PreDecideTurnResult {
    const parsed = preDecideTurnArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        action: 'proceed_to_search',
        clarifyingMessage: null,
        searchHints: [],
        activatedModuleNames: [],
      };
    }

    const clarifyingMessage =
      parsed.data.action === 'ask_user'
        ? (parsed.data.clarifyingMessage ??
          'Could you confirm a more specific product type, size, or pack before I search?')
        : null;

    return {
      action: parsed.data.action,
      clarifyingMessage,
      searchHints: parsed.data.searchHints ?? [],
      activatedModuleNames: parsed.data.activatedModuleNames ?? [],
    };
  }
}
