import { SalesCategory } from '@vetply/shared';

import { resolveCovetrusScrapeCategoryLabels } from '../covetrus-scrape-enqueue.schemas';

describe('resolveCovetrusScrapeCategoryLabels', () => {
  const allCategories = Object.values(SalesCategory);

  it('returns all SalesCategory values when categories is undefined', () => {
    expect(resolveCovetrusScrapeCategoryLabels(undefined)).toEqual(
      allCategories,
    );
  });

  it('returns all SalesCategory values when categories is empty', () => {
    expect(resolveCovetrusScrapeCategoryLabels([])).toEqual(allCategories);
  });

  it('returns only specified categories', () => {
    expect(
      resolveCovetrusScrapeCategoryLabels([SalesCategory.Pharmaceutical]),
    ).toEqual([SalesCategory.Pharmaceutical]);
  });

  it('deduplicates specified categories', () => {
    expect(
      resolveCovetrusScrapeCategoryLabels([
        SalesCategory.Pharmaceutical,
        SalesCategory.Pharmaceutical,
        SalesCategory.Equipment,
      ]),
    ).toEqual([SalesCategory.Pharmaceutical, SalesCategory.Equipment]);
  });
});
