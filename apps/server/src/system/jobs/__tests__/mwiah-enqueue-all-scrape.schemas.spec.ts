import {
  mwiahEnqueueAllScrapeBodySchema,
  mwiahEnqueueAllScrapeResSchema,
} from '../mwiah-enqueue-all-scrape.schemas';

describe('mwiahEnqueueAllScrapeBodySchema', () => {
  it('parses empty body with defaults', () => {
    expect(mwiahEnqueueAllScrapeBodySchema.parse({})).toEqual({});
  });

  it('parses optional startUrl', () => {
    expect(
      mwiahEnqueueAllScrapeBodySchema.parse({
        startUrl: 'https://onlinestore.mwiah.co.uk/',
      }),
    ).toEqual({ startUrl: 'https://onlinestore.mwiah.co.uk/' });
  });
});

describe('mwiahEnqueueAllScrapeResSchema', () => {
  it('parses success response', () => {
    expect(
      mwiahEnqueueAllScrapeResSchema.parse({
        ok: true,
        discoverJobId: '1',
      }),
    ).toEqual({ ok: true, discoverJobId: '1' });
  });
});
