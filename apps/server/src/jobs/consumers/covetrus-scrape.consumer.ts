import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Supplier } from '@vetply/shared';
import { Job } from 'bullmq';
import type { Response } from 'playwright';
import { DataSource } from 'typeorm';

import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CONSUMER_OPTIONS, JOBS, QUEUE } from '../const';
import { importCovetrusPreviewRow } from '../covetrus/covetrus-catalogue-importer';
import {
  extractCategoriesFromSidebar,
  findCategoryCountInSidebar,
} from '../covetrus/covetrus-catalog-sidebar';
import { clickCategoryRowInTree } from '../covetrus/covetrus-category-tree';
import {
  scrollProductsGridDown,
  scrollProductsGridToBottom,
} from '../covetrus/covetrus-equipment-grid-scroll';
import type { CovetrusScrapeCategoryJobData } from '../covetrus/covetrus-job.types';
import { shouldStopOnIdleScrolls } from '../covetrus/covetrus-scrape-scroll';
import { CovetrusSessionService } from '../covetrus/covetrus-session.service';
import type { CovetrusProductPreview } from '../covetrus/covetrus-uidl-parse';
import { extractProductPreviewsFromUidlBody } from '../covetrus/covetrus-uidl-parse';

const POST_SCROLL_SETTLE_MS = 2_200;
const INITIAL_SETTLE_MS = 3_000;
const SKIP_REASONS_LOG_CAP = 10;

type ScrollStopReason = 'target_met' | 'idle';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUidlJsonResponse(res: Response): boolean {
  const url = res.url();
  return (
    res.request().method() === 'POST' &&
    url.includes('v-r=uidl') &&
    res.status() === 200
  );
}

@Processor(QUEUE.COVETRUS_SCRAPE, CONSUMER_OPTIONS)
export class CovetrusScrapeConsumer extends WorkerHost {
  private readonly logger = new Logger(CovetrusScrapeConsumer.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly covetrusSession: CovetrusSessionService,
  ) {
    super();
  }

  async process(job: Job<CovetrusScrapeCategoryJobData>): Promise<void> {
    if (job.name !== JOBS[QUEUE.COVETRUS_SCRAPE].SCRAPE_CATEGORY) {
      throw new Error(
        `Unsupported Covetrus job name "${job.name}". COVETRUS_SCRAPE.ENQUEUE was removed; drain stale jobs from the queue.`,
      );
    }
    await this.processScrapeCategory(job);
  }

  private async processScrapeCategory(
    job: Job<CovetrusScrapeCategoryJobData>,
  ): Promise<void> {
    const categoryLabel = job.data.categoryLabel.trim();
    if (categoryLabel === '') {
      this.logger.warn(`SCRAPE_CATEGORY missing label jobId=${job.id}`);
      return;
    }

    const supplier = await this.dataSource
      .getRepository(CatalogueSupplierEntity)
      .findOne({ where: { name: Supplier.COVETRUS } });
    if (!supplier) {
      this.logger.error(
        `Covetrus supplier row missing (expected catalogue_suppliers.name=${Supplier.COVETRUS}).`,
      );
      return;
    }

    await this.covetrusSession.withCatalogPage(async (page) => {
      const sidebarRows = await extractCategoriesFromSidebar(page);
      const sidebarCount = findCategoryCountInSidebar(
        sidebarRows,
        categoryLabel,
      );
      const expectedTotal = job.data.categoryCount ?? sidebarCount ?? null;

      const seenSku = new Set<string>();
      const inbox: CovetrusProductPreview[] = [];
      let rowsImported = 0;
      let rowsSkipped = 0;
      const skipReasonsSample: string[] = [];

      const persistBatch = async (
        batch: CovetrusProductPreview[],
      ): Promise<void> => {
        if (batch.length === 0) {
          return;
        }
        await this.dataSource.transaction(async (manager) => {
          for (const preview of batch) {
            const result = await importCovetrusPreviewRow(
              manager,
              preview,
              supplier.id,
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
        });
      };

      const onResponse = async (response: Response): Promise<void> => {
        if (!isUidlJsonResponse(response)) {
          return;
        }
        const ct = response.headers()['content-type'] ?? '';
        if (!ct.includes('json')) {
          return;
        }
        let text: string;
        try {
          text = await response.text();
        } catch {
          return;
        }
        const rows = extractProductPreviewsFromUidlBody(text, categoryLabel);
        for (const row of rows) {
          if (seenSku.has(row.supplierProductId)) {
            continue;
          }
          seenSku.add(row.supplierProductId);
          inbox.push(row);
        }
      };
      page.on('response', onResponse);

      let scrollStepsUsed = 0;
      let scrollStopReason: ScrollStopReason = 'idle';

      try {
        await clickCategoryRowInTree(page, categoryLabel);
        await sleep(INITIAL_SETTLE_MS);

        const drain = (): CovetrusProductPreview[] =>
          inbox.splice(0, inbox.length);

        await persistBatch(drain());

        if (expectedTotal == null || seenSku.size < expectedTotal) {
          let idleScrolls = 0;
          while (true) {
            scrollStepsUsed += 1;
            await scrollProductsGridDown(page);
            await sleep(POST_SCROLL_SETTLE_MS);
            const batch = drain();
            if (batch.length > 0) {
              idleScrolls = 0;
              await persistBatch(batch);
            } else {
              idleScrolls += 1;
              if (
                expectedTotal != null &&
                seenSku.size < expectedTotal &&
                idleScrolls % 5 === 0
              ) {
                await scrollProductsGridToBottom(page);
                await sleep(POST_SCROLL_SETTLE_MS * 2);
                const recoveryBatch = drain();
                if (recoveryBatch.length > 0) {
                  idleScrolls = 0;
                  await persistBatch(recoveryBatch);
                }
              }
              if (
                shouldStopOnIdleScrolls(
                  expectedTotal,
                  seenSku.size,
                  idleScrolls,
                )
              ) {
                scrollStopReason = 'idle';
                break;
              }
            }
            if (expectedTotal != null && seenSku.size >= expectedTotal) {
              scrollStopReason = 'target_met';
              break;
            }
          }
        } else {
          scrollStopReason = 'target_met';
        }

        this.logger.log(
          JSON.stringify({
            covetrusCategoryScrape: true,
            categoryLabel,
            jobId: job.id,
            uniqueSkus: seenSku.size,
            expectedFromCategoryTree: expectedTotal ?? null,
            rowsImported,
            rowsSkipped,
            scrollStepsUsed,
            scrollStopReason,
            skipReasonsSample,
          }),
        );
      } finally {
        page.off('response', onResponse);
      }
    });
  }
}
