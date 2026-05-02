import type { JobsOptions } from 'bullmq';

export const QUEUES = ['COVETRUS_SCRAPE'] as const;

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

export const JOBS = {
  [QUEUE.COVETRUS_SCRAPE]: {
    SCRAPE_CATEGORY: 'COVETRUS_SCRAPE.SCRAPE_CATEGORY',
  },
} as const;
