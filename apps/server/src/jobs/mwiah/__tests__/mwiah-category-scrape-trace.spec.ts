import { Logger } from '@nestjs/common';

import { createMwiahCategoryScrapeTracer } from '../mwiah-category-scrape-trace';

describe('createMwiahCategoryScrapeTracer', () => {
  it('logs step name and details with the job context prefix', () => {
    const logger = new Logger('test');
    const logSpy = jest
      .spyOn(logger, 'log')
      .mockImplementation(() => undefined);
    const trace = createMwiahCategoryScrapeTracer(
      logger,
      'MWIAH category scrape jobId=1 url=https://example.com',
    );

    trace.step('login_start', { currentUrl: 'https://example.com/signin' });

    expect(logSpy).toHaveBeenCalledWith(
      'MWIAH category scrape jobId=1 url=https://example.com step=login_start {"currentUrl":"https://example.com/signin"}',
    );
  });
});
