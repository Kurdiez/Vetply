import { Module } from '@nestjs/common';
import { AiModule } from '~/ai/ai.module';
import { CatalogueModule } from '~/catalogue/catalogue.module';
import { ConfigModule } from '~/config';
import { InsightsController } from './controllers/insights.controller';
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
    InsightsChatService,
  ],
})
export class InsightsModule {}
