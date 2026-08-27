import { Injectable } from '@nestjs/common';
import type {
  AiToolDefinition,
  AiToolExecutor,
} from '~/ai/types/ai-tool.types';
import { CatalogueInsightsTools } from './catalogue-insights.tools';

@Injectable()
export class InsightsToolRegistry {
  constructor(
    private readonly catalogueInsightsTools: CatalogueInsightsTools,
  ) {}

  getToolDefinitions(): AiToolDefinition[] {
    return this.catalogueInsightsTools.getToolDefinitions();
  }

  createExecutor(): AiToolExecutor {
    return (name, args) => this.catalogueInsightsTools.execute(name, args);
  }
}
