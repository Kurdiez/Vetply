import { Injectable } from '@nestjs/common';
import type {
  AiToolDefinition,
  AiToolExecutor,
} from '~/ai/types/ai-tool.types';
import type {
  InsightsPostProcessModule,
  InsightsPreProcessModule,
  InsightsProcessModule,
  InsightsProcessModuleContext,
  PreDecideTurnResult,
} from './insights-process-module.types';
import { EmptySearchSuggestionPostModule } from './post/empty-search-suggestion.post-module';
import { PackPriceCaveatPostModule } from './post/pack-price-caveat.post-module';
import { TruncationDisclosurePostModule } from './post/truncation-disclosure.post-module';
import {
  PRE_DECIDE_TURN_ACTION_TOOL_NAME,
  PreDecideTurnTool,
} from './pre/pre-decide-turn.tool';
import { SearchTermSuggestionPreModule } from './pre/search-term-suggestion.pre-module';
import { VagueQueryPreModule } from './pre/vague-query.pre-module';

@Injectable()
export class InsightsProcessModuleRegistry {
  private readonly preModules: InsightsPreProcessModule[];
  private readonly postModules: InsightsPostProcessModule[];

  constructor(
    vagueQueryPreModule: VagueQueryPreModule,
    searchTermSuggestionPreModule: SearchTermSuggestionPreModule,
    private readonly preDecideTurnTool: PreDecideTurnTool,
    truncationDisclosurePostModule: TruncationDisclosurePostModule,
    emptySearchSuggestionPostModule: EmptySearchSuggestionPostModule,
    packPriceCaveatPostModule: PackPriceCaveatPostModule,
  ) {
    this.preModules = [vagueQueryPreModule, searchTermSuggestionPreModule];
    this.postModules = [
      truncationDisclosurePostModule,
      emptySearchSuggestionPostModule,
      packPriceCaveatPostModule,
    ];
  }

  getPreToolDefinitions(): AiToolDefinition[] {
    return [
      ...this.preModules.map((module) => module.getToolDefinition()),
      this.preDecideTurnTool.getToolDefinition(),
    ];
  }

  getPostToolDefinitions(): AiToolDefinition[] {
    return this.postModules.map((module) => module.getToolDefinition());
  }

  createPreExecutor(context: InsightsProcessModuleContext): AiToolExecutor {
    return async (name, args) => {
      if (name === PRE_DECIDE_TURN_ACTION_TOOL_NAME) {
        return this.preDecideTurnTool.execute(args);
      }
      return this.executeModule(this.preModules, name, args, context);
    };
  }

  createPostExecutor(context: InsightsProcessModuleContext): AiToolExecutor {
    return async (name, args) =>
      this.executeModule(this.postModules, name, args, context);
  }

  isPreDecideTool(name: string): boolean {
    return name === PRE_DECIDE_TURN_ACTION_TOOL_NAME;
  }

  asPreDecideResult(result: unknown): PreDecideTurnResult | null {
    if (!result || typeof result !== 'object') {
      return null;
    }
    const record = result as Record<string, unknown>;
    if (record.action !== 'ask_user' && record.action !== 'proceed_to_search') {
      return null;
    }
    return {
      action: record.action,
      clarifyingMessage:
        typeof record.clarifyingMessage === 'string'
          ? record.clarifyingMessage
          : null,
      searchHints: Array.isArray(record.searchHints)
        ? record.searchHints.filter(
            (hint): hint is string => typeof hint === 'string',
          )
        : [],
      activatedModuleNames: Array.isArray(record.activatedModuleNames)
        ? record.activatedModuleNames.filter(
            (moduleName): moduleName is string =>
              typeof moduleName === 'string',
          )
        : [],
    };
  }

  private async executeModule(
    modules: InsightsProcessModule[],
    name: string,
    args: Record<string, unknown>,
    context: InsightsProcessModuleContext,
  ): Promise<unknown> {
    const module = modules.find((candidate) => candidate.name === name);
    if (!module) {
      return { error: `Unknown process module: ${name}` };
    }
    return module.execute(args, context);
  }
}
