import { SalesCategory } from '@vetply/shared';
import {
  extractProductPreviewsFromUidlBody,
  stripUidlAntiXssiPrefix,
} from '../covetrus-uidl-parse';

describe('covetrus-uidl-parse', () => {
  it('stripUidlAntiXssiPrefix removes for(;;);', () => {
    expect(stripUidlAntiXssiPrefix('for(;;);[1]')).toBe('[1]');
    expect(stripUidlAntiXssiPrefix('[1]')).toBe('[1]');
  });

  it('extractProductPreviewsFromUidlBody finds nested grid row objects', () => {
    const payload = [
      {
        execute: [
          [
            1,
            2,
            {
              key: '51',
              lr_3bd6c1677db543f5_description: 'Vi Padlock Test',
              lr_207ba20826474697_pd: {
                legalGroup: 'N/A',
                supplier: 'Acme Vet',
                product: { hsmCode: '0213' },
              },
              lr_be8576a42a1b4dda_code: 'VISTE04',
              lr_0780f5cce790472f_price: '£ 33.70',
            },
          ],
        ],
      },
    ];
    const body = `for(;;);${JSON.stringify(payload)}`;
    const rows = extractProductPreviewsFromUidlBody(body, 'Equipment');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowKey: '51',
      supplierProductId: 'VISTE04',
      name: 'Vi Padlock Test',
      listedPrice: '£ 33.70',
      legalGroupRaw: 'N/A',
      supplierName: 'Acme Vet',
      covetrusCategoryLabel: 'Equipment',
      salesCategoryTarget: SalesCategory.Equipment,
      unitTypeTarget: 'EA',
      unitQuantityTarget: '1',
    });
  });
});
