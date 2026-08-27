import { CatalogUnitType } from '@vetply/shared';
import type { CatalogueProductDetail } from '@vetply/shared';
import { CatalogueInsightService } from '../services/catalogue-insight.service';

function buildDetail(
  overrides: Partial<CatalogueProductDetail> & {
    listings: CatalogueProductDetail['listings'];
  },
): CatalogueProductDetail {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Syringe 10ml',
    image: null,
    manufacturerId: null,
    manufacturerName: 'Acme',
    salesCategory: null,
    legalCategory: null,
    pom: null,
    unitType: CatalogUnitType.EA,
    unitQuantity: '1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CatalogueInsightService', () => {
  const service = new CatalogueInsightService();

  it('picks the lowest listed price and includes ties', () => {
    const result = service.compareListedPricesForProduct(
      buildDetail({
        listings: [
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            supplierName: 'NVS',
            supplierProductId: 'nvs-1',
            name: 'Syringe NVS',
            listedPrice: '12.50',
          },
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            supplierName: 'COVETRUS',
            supplierProductId: 'cov-1',
            name: 'Syringe Cov',
            listedPrice: '10.00',
          },
          {
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            supplierName: 'MWIAH',
            supplierProductId: 'mw-1',
            name: 'Syringe Mw',
            listedPrice: '10.00',
          },
        ],
      }),
    );

    expect(result.cheapestListedPrice).toBe('10.00');
    expect(result.cheapestOffers).toHaveLength(2);
    expect(result.cheapestOffers.map((o) => o.supplierName).sort()).toEqual([
      'COVETRUS',
      'MWIAH',
    ]);
    expect(result.listingsWithoutPriceCount).toBe(0);
  });

  it('returns null cheapest when all listed prices are missing', () => {
    const result = service.compareListedPricesForProduct(
      buildDetail({
        listings: [
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            supplierName: 'NVS',
            supplierProductId: 'nvs-1',
            name: 'Syringe NVS',
            listedPrice: null,
          },
        ],
      }),
    );

    expect(result.cheapestListedPrice).toBeNull();
    expect(result.cheapestOffers).toEqual([]);
    expect(result.listingsWithoutPriceCount).toBe(1);
  });

  it('ignores non-numeric listed prices when ranking', () => {
    const result = service.compareListedPricesForProduct(
      buildDetail({
        listings: [
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            supplierName: 'NVS',
            supplierProductId: 'nvs-1',
            name: 'Syringe NVS',
            listedPrice: 'not-a-price',
          },
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            supplierName: 'VEENAK',
            supplierProductId: 'vee-1',
            name: 'Syringe Veenak',
            listedPrice: '8.25',
          },
        ],
      }),
    );

    expect(result.cheapestListedPrice).toBe('8.25');
    expect(result.cheapestOffers).toEqual([
      expect.objectContaining({
        supplierName: 'VEENAK',
        listedPrice: '8.25',
      }),
    ]);
  });
});
