import { Module } from '@nestjs/common';
import { ConfigModule } from '~/config';
import { AI_MODEL_CLIENT } from './ai.tokens';
import { OpenAiModelClient } from './clients/openai-model.client';
import { AiAgentRunnerService } from './services/ai-agent-runner.service';

@Module({
  imports: [ConfigModule],
  providers: [
    OpenAiModelClient,
    {
      provide: AI_MODEL_CLIENT,
      useExisting: OpenAiModelClient,
    },
    AiAgentRunnerService,
  ],
  exports: [AI_MODEL_CLIENT, AiAgentRunnerService],
})
export class AiModule {}
