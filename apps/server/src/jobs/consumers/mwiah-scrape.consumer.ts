import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Supplier } from '@vetply/shared';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';

import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import {
  JOBS,
  MWIAH_CONSUMER_OPTIONS,
  PRODUCER_OPTIONS,
  QUEUE,
} from '../const';
import { importMwiahPreviewRow } from '../mwiah/mwiah-catalogue-importer';
import {
  createMwiahProductApiCapture,
  scrapeMwiahCategoryProducts,
} from '../mwiah/mwiah-category-products';
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

const SKIP_REASONS_LOG_CAP = 10;

@Processor(QUEUE.MWIAH_SCRAPE, MWIAH_CONSUMER_OPTIONS)
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
    if (job.name === JOBS[QUEUE.MWIAH_SCRAPE].DISCOVER_CATEGORIES_AND_ENQUEUE) {
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
    );

    this.logger.log(
      `MWIAH discover finished jobId=${job.id} categoryJobsQueued=${categoryJobIds.categoryJobsQueued}`,
    );
  }

  private async processScrapeCategoryProducts(
    job: Job<MwiahScrapeCategoryProductsJobData>,
  ): Promise<void> {
    const categoryUrl = job.data.url.trim();
    const storeUrl = this.mwiahSession.getDefaultStoreUrl();
    const storeOrigin = this.mwiahSession.getStoreOrigin();

    const supplier = await this.dataSource
      .getRepository(CatalogueSupplierEntity)
      .findOne({ where: { name: Supplier.MWIAH } });
    if (!supplier) {
      this.logger.error(
        `MWIAH supplier row missing (expected catalogue_suppliers.name=${Supplier.MWIAH}).`,
      );
      return;
    }

    this.logger.log(
      `MWIAH category scrape starting jobId=${job.id} url=${categoryUrl}`,
    );

    let rowsImported = 0;
    let rowsSkipped = 0;
    const skipReasonsSample: string[] = [];

    await runWithAuthenticatedMwiahPage(
      this.mwiahSession,
      storeUrl,
      async (page) => {
        const capture = createMwiahProductApiCapture();
        capture.attach(page);

        const { previews, listPagesVisited, productsDiscovered } =
          await scrapeMwiahCategoryProducts(
            page,
            categoryUrl,
            storeOrigin,
            capture,
          );

        this.logger.log(
          `MWIAH category products scraped jobId=${job.id} listPages=${listPagesVisited} discovered=${productsDiscovered} parsed=${previews.length}`,
        );

        for (const preview of previews) {
          const result = await this.dataSource.transaction((manager) =>
            importMwiahPreviewRow(manager, preview, supplier.id),
          );
          if (result === 'imported') {
            rowsImported += 1;
          } else {
            rowsSkipped += 1;
            if (skipReasonsSample.length < SKIP_REASONS_LOG_CAP) {
              skipReasonsSample.push(result);
            }
          }
        }
      },
    );

    this.logger.log(
      `MWIAH category scrape finished jobId=${job.id} imported=${rowsImported} skipped=${rowsSkipped} skipSample=${skipReasonsSample.join('; ')}`,
    );
  }
}
