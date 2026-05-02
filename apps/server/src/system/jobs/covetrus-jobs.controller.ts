import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Post, UseGuards } from '@nestjs/common';
import { SalesCategory } from '@vetply/shared';
import { Queue } from 'bullmq';

import { JOBS, PRODUCER_OPTIONS, QUEUE } from '~/jobs/const';
import type { CovetrusScrapeCategoryJobData } from '~/jobs/covetrus/covetrus-job.types';

import { SystemGuard } from '~/system/auth/system.guard';

@Controller('system/jobs/covetrus')
@UseGuards(SystemGuard)
export class CovetrusJobsController {
  constructor(
    @InjectQueue(QUEUE.COVETRUS_SCRAPE)
    private readonly covetrusQueue: Queue,
  ) {}

  @Post('enqueue')
  async enqueueCovetrusScrape(): Promise<{
    ok: true;
    scrapeJobsQueued: number;
    jobIds: string[];
  }> {
    const labels = Object.values(SalesCategory);
    const jobIds: string[] = [];
    for (const categoryLabel of labels) {
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
      scrapeJobsQueued: labels.length,
      jobIds,
    };
  }
}
