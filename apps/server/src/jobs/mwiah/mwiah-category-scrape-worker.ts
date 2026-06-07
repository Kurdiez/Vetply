// Standalone child process entrypoint — do NOT import from this file directly.
// Spawned by mwiah-scrape.consumer.ts via runInChildProcess().
// All env vars are inherited from the parent process; env vars loaded via dotenv
// as a safety net for edge cases where the parent hasn't loaded them yet.
import 'dotenv/config';

import { DataSource } from 'typeorm';

import { Supplier } from '@vetply/shared';

import type { ChildProcessResult } from '~/commons/child-process/run-in-child-process';
import type { Config } from '~/config/schemas';
import { ConfigService } from '~/config';
import { entitiesToReigster } from '~/database/entities-registry';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { MwiahSessionService } from './mwiah-session.service';
import {
  createMwiahProductApiCapture,
  scrapeMwiahCategoryProducts,
} from './mwiah-category-products';
import { noopMwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';
import { importMwiahPreviewRow } from './mwiah-catalogue-importer';
import { runWithAuthenticatedMwiahPage } from './mwiah-scrape-session';
import type {
  MwiahScrapeCategoryWorkerInput,
  MwiahScrapeCategoryWorkerOutput,
} from './mwiah-job.types';

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    schema: 'public',
    extra: { driver: { family: 4 } },
    entities: entitiesToReigster,
    synchronize: false,
    logging: false,
  });
}

function createWorkerSession(): MwiahSessionService {
  // Build a minimal config adapter that reads directly from process.env.
  // The cast is required because ConfigService wraps NestjsConfigService with
  // private state; at runtime the only method we call is get().
  const workerConfig = {
    get: <T extends keyof Config>(key: T): Config[T] =>
      process.env[key as string] as Config[T],
  } as unknown as ConfigService;
  return new MwiahSessionService(workerConfig);
}

async function runScrape(
  input: MwiahScrapeCategoryWorkerInput,
): Promise<MwiahScrapeCategoryWorkerOutput> {
  const { categoryUrl, jobId } = input;
  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    const supplier = await dataSource
      .getRepository(CatalogueSupplierEntity)
      .findOne({ where: { name: Supplier.MWIAH } });
    if (!supplier) {
      throw new Error(
        `MWIAH supplier row missing (expected catalogue_suppliers.name=${Supplier.MWIAH})`,
      );
    }

    const session = createWorkerSession();
    const storeUrl = session.getDefaultStoreUrl();
    const storeOrigin = session.getStoreOrigin();

    let totals: MwiahScrapeCategoryWorkerOutput = {
      listPagesVisited: 0,
      productsProcessed: 0,
      imported: 0,
      skipped: 0,
      skippedCategoryDetails: false,
    };

    await runWithAuthenticatedMwiahPage(
      session,
      storeUrl,
      async (page) => {
        const capture = createMwiahProductApiCapture();
        capture.attach(page);

        totals = await scrapeMwiahCategoryProducts(
          page,
          categoryUrl,
          storeOrigin,
          capture,
          {
            trace: noopMwiahCategoryScrapeTracer,
            persistPagePreviews: async (previews) => {
              let imported = 0;
              let skipped = 0;
              await dataSource.transaction(async (manager) => {
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
              console.log(
                `MWIAH worker jobId=${jobId} url=${categoryUrl} page=${stats.pageNumber}/${stats.totalPages} processed=${stats.productsProcessed} imported=${stats.imported} skipped=${stats.skipped}`,
              );
            },
          },
        );
      },
      { jobId, categoryUrl },
    );

    return totals;
  } finally {
    await dataSource.destroy().catch((err: unknown) => {
      console.warn(`MWIAH worker DB cleanup error: ${String(err)}`);
    });
  }
}

function sendResult<T>(result: ChildProcessResult<T>): void {
  if (!process.send) {
    console.error('MWIAH worker: no IPC channel — was this script forked?');
    process.exit(1);
    return;
  }
  process.send(result, undefined, undefined, () => {
    process.exit(0);
  });
}

process.on(
  'message',
  (msg: { type: 'run'; input: MwiahScrapeCategoryWorkerInput }) => {
    if (msg.type !== 'run') return;

    runScrape(msg.input)
      .then((data) => {
        sendResult<MwiahScrapeCategoryWorkerOutput>({ type: 'success', data });
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        sendResult({
          type: 'error',
          message: error.message,
          name: error.name,
          stack: error.stack,
          context:
            (error as Error & { context?: Record<string, unknown> }).context ??
            undefined,
        });
      });
  },
);
