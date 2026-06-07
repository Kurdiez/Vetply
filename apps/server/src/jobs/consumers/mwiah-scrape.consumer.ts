import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { captureException } from '~/commons/error-handlers/capture-exception';
import { CustomException } from '~/commons/errors/custom-exception';
import {
  resolveWorkerScriptPath,
  runInChildProcess,
} from '~/commons/child-process/run-in-child-process';
import { CONSUMER_OPTIONS, JOBS, PRODUCER_OPTIONS, QUEUE } from '../const';
import type {
  MwiahDiscoverCategoriesJobData,
  MwiahScrapeCategoryProductsJobData,
  MwiahScrapeCategoryWorkerInput,
  MwiahScrapeCategoryWorkerOutput,
} from '../mwiah/mwiah-job.types';
import {
  collectMwiahMenuCategoryUrls,
  dedupeCategoryUrls,
  scrapeMwiahProductsMenuTree,
} from '../mwiah/mwiah-products-menu';
import { runWithAuthenticatedMwiahPage } from '../mwiah/mwiah-scrape-session';
import { MwiahSessionService } from '../mwiah/mwiah-session.service';

// Hard wall-clock limit per job. The child process is SIGKILL-ed if it
// exceeds this, guaranteeing BullMQ marks the job failed rather than leaving
// it Active indefinitely.
const JOB_HARD_DEADLINE_MS = 10 * 60_000;

@Processor(QUEUE.MWIAH_SCRAPE, {
  ...CONSUMER_OPTIONS,
  concurrency: 1,
  stalledInterval: 60_000,
  maxStalledCount: 1,
})
export class MwiahScrapeConsumer extends WorkerHost {
  private readonly logger = new Logger(MwiahScrapeConsumer.name);

  constructor(
    private readonly mwiahSession: MwiahSessionService,
    @InjectQueue(QUEUE.MWIAH_SCRAPE)
    private readonly mwiahQueue: Queue,
  ) {
    super();
  }

  async process(
    job: Job<
      MwiahDiscoverCategoriesJobData | MwiahScrapeCategoryProductsJobData
    >,
  ): Promise<void> {
    try {
      if (
        job.name === JOBS[QUEUE.MWIAH_SCRAPE].DISCOVER_CATEGORIES_AND_ENQUEUE
      ) {
        await this.processDiscoverCategoriesAndEnqueue(
          job as Job<MwiahDiscoverCategoriesJobData>,
        );
        return;
      }
      if (job.name === JOBS[QUEUE.MWIAH_SCRAPE].SCRAPE_CATEGORY_PRODUCTS) {
        await this.processScrapeCategoryProducts(
          job as Job<MwiahScrapeCategoryProductsJobData>,
        );
        return;
      }
      throw new Error(
        `Unsupported MWIAH job name "${job.name}". Expected ${JOBS[QUEUE.MWIAH_SCRAPE].DISCOVER_CATEGORIES_AND_ENQUEUE} or ${JOBS[QUEUE.MWIAH_SCRAPE].SCRAPE_CATEGORY_PRODUCTS}.`,
      );
    } catch (error) {
      const wrapped = this.wrapMwiahJobError(job, error);
      captureException({ error: wrapped, logger: this.logger });
      throw wrapped;
    }
  }

  private wrapMwiahJobError(
    job: Job<
      MwiahDiscoverCategoriesJobData | MwiahScrapeCategoryProductsJobData
    >,
    error: unknown,
  ): CustomException {
    return new CustomException('MWIAH scrape job failed', {
      error,
      queue: QUEUE.MWIAH_SCRAPE,
      jobId: job.id?.toString() ?? null,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      jobData: job.data,
    });
  }

  private async processDiscoverCategoriesAndEnqueue(
    job: Job<MwiahDiscoverCategoriesJobData>,
  ): Promise<void> {
    const storeUrl =
      job.data.startUrl?.trim() || this.mwiahSession.getDefaultStoreUrl();

    this.logger.log(`MWIAH discover starting jobId=${job.id} url=${storeUrl}`);

    const categoryJobIds = await runWithAuthenticatedMwiahPage(
      this.mwiahSession,
      storeUrl,
      async (page) => {
        const menu = await scrapeMwiahProductsMenuTree(page);
        const storeOrigin = this.mwiahSession.getStoreOrigin();
        const urls = dedupeCategoryUrls(
          collectMwiahMenuCategoryUrls(menu, storeOrigin),
        );
        this.logger.log(
          `MWIAH discover menu scraped jobId=${job.id} categoryUrls=${urls.length}`,
        );

        const jobIds: string[] = [];
        for (const url of urls) {
          const child = await this.mwiahQueue.add(
            JOBS[QUEUE.MWIAH_SCRAPE].SCRAPE_CATEGORY_PRODUCTS,
            { url } satisfies MwiahScrapeCategoryProductsJobData,
            { ...PRODUCER_OPTIONS },
          );
          if (child.id != null) {
            jobIds.push(child.id.toString());
          }
        }

        return { categoryJobsQueued: urls.length, categoryJobIds: jobIds };
      },
      { jobId: job.id?.toString() ?? null },
    );

    this.logger.log(
      `MWIAH discover finished jobId=${job.id} categoryJobsQueued=${categoryJobIds.categoryJobsQueued}`,
    );
  }

  private async processScrapeCategoryProducts(
    job: Job<MwiahScrapeCategoryProductsJobData>,
  ): Promise<void> {
    const categoryUrl = job.data.url.trim();
    const jobId = job.id?.toString() ?? null;

    const workerPath = resolveWorkerScriptPath(
      __dirname,
      '../mwiah/mwiah-category-scrape-worker',
    );

    const result = await runInChildProcess<
      MwiahScrapeCategoryWorkerInput,
      MwiahScrapeCategoryWorkerOutput
    >(workerPath, { categoryUrl, jobId }, { timeoutMs: JOB_HARD_DEADLINE_MS });

    if (!result.skippedCategoryDetails) {
      this.logger.log(
        `MWIAH category scrape done jobId=${jobId} url=${categoryUrl} pages=${result.listPagesVisited} processed=${result.productsProcessed} imported=${result.imported} skipped=${result.skipped}`,
      );
    }
  }
}
