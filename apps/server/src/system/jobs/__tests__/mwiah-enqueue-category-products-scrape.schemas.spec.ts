import {
  mwiahEnqueueCategoryProductsScrapeBodySchema,
  mwiahEnqueueCategoryProductsScrapeResSchema,
} from '../mwiah-enqueue-category-products-scrape.schemas';

describe('mwiahEnqueueCategoryProductsScrapeBodySchema', () => {
  it('parses url', () => {
    expect(
      mwiahEnqueueCategoryProductsScrapeBodySchema.parse({
        url: 'https://onlinestore.mwiah.co.uk/Catalog/consumables',
      }),
    ).toEqual({
      url: 'https://onlinestore.mwiah.co.uk/Catalog/consumables',
    });
  });

  it('rejects invalid url', () => {
    expect(() =>
      mwiahEnqueueCategoryProductsScrapeBodySchema.parse({
        url: 'not-a-url',
      }),
    ).toThrow();
  });
});

describe('mwiahEnqueueCategoryProductsScrapeResSchema', () => {
  it('parses success response', () => {
    expect(
      mwiahEnqueueCategoryProductsScrapeResSchema.parse({
        ok: true,
        jobId: '42',
      }),
    ).toEqual({ ok: true, jobId: '42' });
  });
});
