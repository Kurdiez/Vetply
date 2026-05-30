import type { JobsOptions } from 'bullmq';

export const QUEUES = ['COVETRUS_SCRAPE', 'MWIAH_SCRAPE'] as const;

export type QueueName = (typeof QUEUES)[number];

export const QUEUE = Object.freeze(
  QUEUES.reduce(
    (acc, queueName) => ({
      ...acc,
      [queueName]: queueName,
    }),
    {} as { [K in QueueName]: K },
  ),
);

export const JOB_PRIORITIES = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

export const PRODUCER_OPTIONS: Readonly<JobsOptions> = Object.freeze({
  removeOnComplete: true,
  removeOnFail: false,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});

export const CONSUMER_OPTIONS = Object.freeze({
  concurrency: 10,
});

export const MWIAH_CONSUMER_OPTIONS = Object.freeze({
  ...CONSUMER_OPTIONS,
  concurrency: 2,
});

export const JOBS = {
  [QUEUE.COVETRUS_SCRAPE]: {
    SCRAPE_CATEGORY: 'COVETRUS_SCRAPE.SCRAPE_CATEGORY',
  },
  [QUEUE.MWIAH_SCRAPE]: {
    DISCOVER_CATEGORIES_AND_ENQUEUE:
      'MWIAH_SCRAPE.DISCOVER_CATEGORIES_AND_ENQUEUE',
    SCRAPE_CATEGORY_PRODUCTS: 'MWIAH_SCRAPE.SCRAPE_CATEGORY_PRODUCTS',
  },
} as const;
