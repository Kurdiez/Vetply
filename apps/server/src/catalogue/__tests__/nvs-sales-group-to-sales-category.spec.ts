import { SalesCategory } from '@vetply/shared';
import {
  NVS_SALES_GROUP_TO_CATEGORY,
  resolveNvsSalesCategory,
} from '../utils/nvs-sales-group-to-sales-category';

describe('resolveNvsSalesCategory', () => {
  it('passes through the six canonical labels unchanged', () => {
    expect(resolveNvsSalesCategory('Consumables')).toBe(
      SalesCategory.Consumables,
    );
    expect(resolveNvsSalesCategory(' Pharmaceutical ')).toBe(
      SalesCategory.Pharmaceutical,
    );
  });

  it('maps every legacy NVS CSV Sales Group key from NVS_SALES_GROUP_TO_CATEGORY', () => {
    for (const [legacyLabel, expected] of Object.entries(
      NVS_SALES_GROUP_TO_CATEGORY,
    )) {
      expect(resolveNvsSalesCategory(legacyLabel)).toBe(expected);
    }
  });

  it('returns null for unknown labels', () => {
    expect(resolveNvsSalesCategory('Not a real group')).toBeNull();
    expect(resolveNvsSalesCategory('')).toBeNull();
  });
});
