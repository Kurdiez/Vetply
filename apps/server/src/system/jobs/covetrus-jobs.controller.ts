import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Queue } from 'bullmq';

import { ZodValidationPipe } from '~/commons/validations';
import { JOBS, PRODUCER_OPTIONS, QUEUE } from '~/jobs/const';
import type { CovetrusScrapeCategoryJobData } from '~/jobs/covetrus/covetrus-job.types';
import { SystemGuard } from '~/system/auth/system.guard';

import {
  covetrusScrapeEnqueueBodySchema,
  resolveCovetrusScrapeCategoryLabels,
  type CovetrusScrapeEnqueueBody,
  type CovetrusScrapeEnqueueRes,
} from './covetrus-scrape-enqueue.schemas';

@Controller('system/jobs/covetrus')
@UseGuards(SystemGuard)
export class CovetrusJobsController {
  constructor(
    @InjectQueue(QUEUE.COVETRUS_SCRAPE)
    private readonly covetrusQueue: Queue,
  ) {}

  @Post('enqueue-all-scrape')
  async enqueueCovetrusScrape(
    @Body(new ZodValidationPipe(covetrusScrapeEnqueueBodySchema))
    body: CovetrusScrapeEnqueueBody = {},
  ): Promise<CovetrusScrapeEnqueueRes> {
    const categoryLabels = resolveCovetrusScrapeCategoryLabels(body.categories);

    const jobIds: string[] = [];
    for (const categoryLabel of categoryLabels) {
      const job = await this.covetrusQueue.add(
        JOBS[QUEUE.COVETRUS_SCRAPE].SCRAPE_CATEGORY,
        { categoryLabel } satisfies CovetrusScrapeCategoryJobData,
        { ...PRODUCER_OPTIONS },
      );
      if (job.id != null) {
        jobIds.push(job.id.toString());
      }
    }

    return {
      ok: true,
      scrapeJobsQueued: categoryLabels.length,
      categoryLabels,
      jobIds,
    };
  }
}
