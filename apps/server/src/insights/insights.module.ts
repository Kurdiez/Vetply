import { Module } from '@nestjs/common';
import { AiModule } from '~/ai/ai.module';
import { CatalogueModule } from '~/catalogue/catalogue.module';
import { ConfigModule } from '~/config';
import { InsightsController } from './controllers/insights.controller';
import { InsightsChatPipelineService } from './processing/insights-chat-pipeline.service';
import { InsightsProcessModuleRegistry } from './processing/insights-process-module.registry';
import { EmptySearchSuggestionPostModule } from './processing/post/empty-search-suggestion.post-module';
import { PackPriceCaveatPostModule } from './processing/post/pack-price-caveat.post-module';
import { TruncationDisclosurePostModule } from './processing/post/truncation-disclosure.post-module';
import { PreDecideTurnTool } from './processing/pre/pre-decide-turn.tool';
import { SearchTermSuggestionPreModule } from './processing/pre/search-term-suggestion.pre-module';
import { VagueQueryPreModule } from './processing/pre/vague-query.pre-module';
import { CatalogueInsightService } from './services/catalogue-insight.service';
import { InsightsChatService } from './services/insights-chat.service';
import { InsightsPromptService } from './services/insights-prompt.service';
import { CatalogueInsightsTools } from './tools/catalogue-insights.tools';
import { InsightsToolRegistry } from './tools/insights-tool.registry';

@Module({
  imports: [AiModule, CatalogueModule, ConfigModule],
  controllers: [InsightsController],
  providers: [
    InsightsPromptService,
    CatalogueInsightService,
    CatalogueInsightsTools,
    InsightsToolRegistry,
    VagueQueryPreModule,
    SearchTermSuggestionPreModule,
    PreDecideTurnTool,
    TruncationDisclosurePostModule,
    EmptySearchSuggestionPostModule,
    PackPriceCaveatPostModule,
    InsightsProcessModuleRegistry,
    InsightsChatPipelineService,
    InsightsChatService,
  ],
})
export class InsightsModule {}
