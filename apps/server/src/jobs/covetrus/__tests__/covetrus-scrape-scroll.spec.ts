import { findCategoryCountInSidebar } from '../covetrus-catalog-sidebar';
import { shouldStopOnIdleScrolls } from '../covetrus-scrape-scroll';

describe('shouldStopOnIdleScrolls', () => {
  it('does not stop while under the category tree count', () => {
    expect(shouldStopOnIdleScrolls(3112, 2500, 100)).toBe(false);
  });

  it('stops after consecutive idle scrolls when target is met', () => {
    expect(shouldStopOnIdleScrolls(3112, 3112, 11)).toBe(false);
    expect(shouldStopOnIdleScrolls(3112, 3112, 12)).toBe(true);
  });

  it('stops after consecutive idle scrolls when expected total is unknown', () => {
    expect(shouldStopOnIdleScrolls(null, 2500, 11)).toBe(false);
    expect(shouldStopOnIdleScrolls(null, 2500, 12)).toBe(true);
  });
});

describe('findCategoryCountInSidebar', () => {
  it('matches category label case-insensitively', () => {
    expect(
      findCategoryCountInSidebar(
        [{ label: 'Pharmaceutical', count: 3112 }],
        'pharmaceutical',
      ),
    ).toBe(3112);
  });
});
