import type { Logger } from '@nestjs/common';

export type MwiahCategoryScrapeStepDetails = Record<string, unknown>;

export type MwiahCategoryScrapeTracer = {
  step: (name: string, details?: MwiahCategoryScrapeStepDetails) => void;
};

export const noopMwiahCategoryScrapeTracer: MwiahCategoryScrapeTracer = {
  step: () => undefined,
};

export function createMwiahCategoryScrapeTracer(
  logger: Logger,
  logCtx: string,
): MwiahCategoryScrapeTracer {
  return {
    step: (name, details = {}) => {
      logger.log(`${logCtx} step=${name} ${JSON.stringify(details)}`);
    },
  };
}
