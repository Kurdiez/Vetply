import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Supplier } from '@vetply/shared';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';

import { captureException } from '~/commons/error-handlers/capture-exception';
import { CustomException } from '~/commons/errors/custom-exception';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CONSUMER_OPTIONS, JOBS, PRODUCER_OPTIONS, QUEUE } from '../const';
import { importMwiahPreviewRow } from '../mwiah/mwiah-catalogue-importer';
import {
  createMwiahProductApiCapture,
  scrapeMwiahCategoryProducts,
} from '../mwiah/mwiah-category-products';
import { createMwiahCategoryScrapeTracer } from '../mwiah/mwiah-category-scrape-trace';
import { createMwiahJobWatchdog } from '../mwiah/mwiah-hang-forensics';
import type {
  MwiahDiscoverCategoriesJobData,
  MwiahScrapeCategoryProductsJobData,
} from '../mwiah/mwiah-job.types';
import {
  collectMwiahMenuCategoryUrls,
  dedupeCategoryUrls,
  scrapeMwiahProductsMenuTree,
} from '../mwiah/mwiah-products-menu';
import { runWithAuthenticatedMwiahPage } from '../mwiah/mwiah-scrape-session';
import { MwiahSessionService } from '../mwiah/mwiah-session.service';

// Hard wall-clock limit per job. Playwright timeouts can fail to fire when
// CDP/Chromium wedges; this guarantee that BullMQ marks the job failed
// rather than leaving it Active indefinitely.
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
    @InjectDataSource() private readonly dataSource: DataSource,
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
    const storeUrl = this.mwiahSession.getDefaultStoreUrl();
    const storeOrigin = this.mwiahSession.getStoreOrigin();

    const logCtx = `MWIAH category scrape jobId=${jobId} url=${categoryUrl}`;

    const watchdog = createMwiahJobWatchdog({
      jobId,
      categoryUrl,
      logger: this.logger,
    });

    // Composite tracer: logs the step AND keeps the watchdog's stall clock alive.
    const baseTrace = createMwiahCategoryScrapeTracer(this.logger, logCtx);
    const trace = {
      step: (name: string, details?: Record<string, unknown>) => {
        baseTrace.step(name, details);
        watchdog.notifyStep(name);
      },
    };

    let deadlineTimer: NodeJS.Timeout | null = null;
    const deadlinePromise = new Promise<never>((_, reject) => {
      deadlineTimer = setTimeout(() => {
        reject(
          new CustomException('MWIAH job hard deadline exceeded', {
            jobId,
            categoryUrl,
            deadlineMs: JOB_HARD_DEADLINE_MS,
          }),
        );
      }, JOB_HARD_DEADLINE_MS);
    });

    try {
      await Promise.race([
        this.runScrapeCategoryWork(
          job,
          jobId,
          categoryUrl,
          storeUrl,
          storeOrigin,
          logCtx,
          trace,
          watchdog,
        ),
        deadlinePromise,
      ]);
    } finally {
      if (deadlineTimer !== null) clearTimeout(deadlineTimer);
      watchdog.dispose();
    }
  }

  private async runScrapeCategoryWork(
    job: Job<MwiahScrapeCategoryProductsJobData>,
    jobId: string | null,
    categoryUrl: string,
    storeUrl: string,
    storeOrigin: string,
    logCtx: string,
    trace: { step: (name: string, details?: Record<string, unknown>) => void },
    watchdog: ReturnType<typeof createMwiahJobWatchdog>,
  ): Promise<void> {
    trace.step('job_start', { attemptsMade: job.attemptsMade });

    trace.step('supplier_lookup_start');
    const supplier = await this.dataSource
      .getRepository(CatalogueSupplierEntity)
      .findOne({ where: { name: Supplier.MWIAH } });
    if (!supplier) {
      this.logger.error(
        `MWIAH supplier row missing (expected catalogue_suppliers.name=${Supplier.MWIAH}).`,
      );
      return;
    }
    trace.step('supplier_lookup_done', { supplierId: supplier.id });

    let jobTotals = {
      listPagesVisited: 0,
      productsProcessed: 0,
      imported: 0,
      skipped: 0,
      skippedCategoryDetails: false,
    };

    trace.step('authenticated_session_start', { storeUrl });
    await runWithAuthenticatedMwiahPage(
      this.mwiahSession,
      storeUrl,
      async (page) => {
        watchdog.setPage(page);

        trace.step('api_capture_attach_start');
        const capture = createMwiahProductApiCapture();
        capture.attach(page);
        trace.step('api_capture_attach_done');

        jobTotals = await scrapeMwiahCategoryProducts(
          page,
          categoryUrl,
          storeOrigin,
          capture,
          {
            trace,
            persistPagePreviews: async (previews) => {
              let imported = 0;
              let skipped = 0;
              await this.dataSource.transaction(async (manager) => {
                for (const preview of previews) {
                  const result = await importMwiahPreviewRow(
                    manager,
                    preview,
                    supplier.id,
                  );
                  if (result === 'imported') {
                    imported += 1;
                  } else {
                    skipped += 1;
                  }
                }
              });
              return { imported, skipped };
            },
            onListPageProcessed: (stats) => {
              this.logger.log(
                `${logCtx} page=${stats.pageNumber}/${stats.totalPages} productsProcessed=${stats.productsProcessed} imported=${stats.imported} skipped=${stats.skipped}`,
              );
            },
          },
        );
      },
      {
        jobId,
        categoryUrl,
        trace,
      },
    );
    trace.step('authenticated_session_done');

    trace.step('job_done', jobTotals);
    if (jobTotals.skippedCategoryDetails) {
      this.logger.log(
        `${logCtx} skipped category details page (not a product list)`,
      );
      return;
    }
    this.logger.log(
      `${logCtx} finished totalPages=${jobTotals.listPagesVisited} productsProcessed=${jobTotals.productsProcessed} imported=${jobTotals.imported} skipped=${jobTotals.skipped}`,
    );
  }
}
