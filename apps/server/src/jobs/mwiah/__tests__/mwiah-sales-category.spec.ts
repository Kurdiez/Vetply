import { SalesCategory } from '@vetply/shared';

import { resolveMwiahSalesCategoryFromCategoryUrl } from '../mwiah-sales-category';

describe('resolveMwiahSalesCategoryFromCategoryUrl', () => {
  it('maps known catalog segments', () => {
    expect(
      resolveMwiahSalesCategoryFromCategoryUrl(
        'https://onlinestore.mwiah.co.uk/Catalog/consumables/syringes',
      ),
    ).toBe(SalesCategory.Consumables);
    expect(
      resolveMwiahSalesCategoryFromCategoryUrl(
        'https://onlinestore.mwiah.co.uk/Catalog/pet-food/everyday-pet-food',
      ),
    ).toBe(SalesCategory.Petfood);
  });

  it('defaults unknown segments to Consumables', () => {
    expect(
      resolveMwiahSalesCategoryFromCategoryUrl(
        'https://onlinestore.mwiah.co.uk/Catalog/unknown-category',
      ),
    ).toBe(SalesCategory.Consumables);
  });
});
