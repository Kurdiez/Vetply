export const QUEUES = ['example'] as const;

export type QueueName = (typeof QUEUES)[number];
