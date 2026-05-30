import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Queue } from 'bullmq';

import { ZodValidationPipe } from '~/commons/validations';
import { JOBS, PRODUCER_OPTIONS, QUEUE } from '~/jobs/const';
import type {
  MwiahDiscoverCategoriesJobData,
  MwiahScrapeCategoryProductsJobData,
} from '~/jobs/mwiah/mwiah-job.types';
import { SystemGuard } from '~/system/auth/system.guard';

import {
  mwiahEnqueueAllScrapeBodySchema,
  type MwiahEnqueueAllScrapeBody,
  type MwiahEnqueueAllScrapeRes,
} from './mwiah-enqueue-all-scrape.schemas';
import {
  mwiahEnqueueCategoryProductsScrapeBodySchema,
  type MwiahEnqueueCategoryProductsScrapeBody,
  type MwiahEnqueueCategoryProductsScrapeRes,
} from './mwiah-enqueue-category-products-scrape.schemas';

@Controller('system/jobs/mwiah')
@UseGuards(SystemGuard)
export class MwiahJobsController {
  constructor(
    @InjectQueue(QUEUE.MWIAH_SCRAPE)
    private readonly mwiahQueue: Queue,
  ) {}

  @Post('enqueue-all-scrape')
  async enqueueAllMwiahScrape(
    @Body(new ZodValidationPipe(mwiahEnqueueAllScrapeBodySchema))
    body: MwiahEnqueueAllScrapeBody = {},
  ): Promise<MwiahEnqueueAllScrapeRes> {
    const jobData: MwiahDiscoverCategoriesJobData = {};
    if (body.startUrl !== undefined) {
      jobData.startUrl = body.startUrl;
    }

    const job = await this.mwiahQueue.add(
      JOBS[QUEUE.MWIAH_SCRAPE].DISCOVER_CATEGORIES_AND_ENQUEUE,
      jobData,
      { ...PRODUCER_OPTIONS },
    );

    if (job.id == null) {
      throw new Error('MWIAH discover job id missing after enqueue');
    }

    return { ok: true, discoverJobId: job.id.toString() };
  }

  @Post('enqueue-category-products-scrape')
  async enqueueMwiahCategoryProductsScrape(
    @Body(new ZodValidationPipe(mwiahEnqueueCategoryProductsScrapeBodySchema))
    body: MwiahEnqueueCategoryProductsScrapeBody,
  ): Promise<MwiahEnqueueCategoryProductsScrapeRes> {
    const job = await this.mwiahQueue.add(
      JOBS[QUEUE.MWIAH_SCRAPE].SCRAPE_CATEGORY_PRODUCTS,
      { url: body.url } satisfies MwiahScrapeCategoryProductsJobData,
      { ...PRODUCER_OPTIONS },
    );

    if (job.id == null) {
      throw new Error('MWIAH category scrape job id missing after enqueue');
    }

    return { ok: true, jobId: job.id.toString() };
  }
}
