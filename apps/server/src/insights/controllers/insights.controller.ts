import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { InsightsChatSendReq, insightsChatSendReqSchema } from '@vetply/shared';
import { CurrentUserId } from '~/auth/current-user-id.decorator';
import { ZodValidationPipe } from '~/commons/validations';
import { ConfigService } from '~/config';
import { InsightsChatService } from '../services/insights-chat.service';

@Controller('insights')
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);

  constructor(
    private readonly insightsChatService: InsightsChatService,
    private readonly configService: ConfigService,
  ) {}

  @Post('chat/send')
  async sendChat(
    @Body(new ZodValidationPipe(insightsChatSendReqSchema))
    body: InsightsChatSendReq,
    @CurrentUserId() userId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (body.messages.length === 0) {
      throw new BadRequestException({
        failReason: 'INSIGHTS_CHAT_EMPTY_MESSAGES',
      });
    }

    if (!this.configService.get('OPENAI_API_KEY')) {
      throw new BadRequestException({
        failReason: 'INSIGHTS_AI_NOT_CONFIGURED',
      });
    }

    this.writeSseHeaders(res);

    try {
      for await (const event of this.insightsChatService.streamChat({
        userId,
        messages: body.messages,
      })) {
        this.writeSseEvent(res, event);
        if (event.type === 'done' || event.type === 'error') {
          break;
        }
      }
    } catch (error) {
      this.logger.error(
        `Insights SSE failed for userId=${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.writeSseEvent(res, {
        type: 'error',
        failReason: 'INSIGHTS_CHAT_FAILED',
      });
    } finally {
      res.end();
    }
  }

  private writeSseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  }

  private writeSseEvent(res: Response, payload: unknown): void {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
