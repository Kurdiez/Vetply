import {
  ProductCategoryStatus,
  listProductCategoryLeafRefs,
} from '@vetply/shared';

import {
  SUPPLIER_LISTING_PRODUCT_CATEGORY_BATCH_SIZE,
  chunkListings,
  parseListingCategoryAiResponse,
} from '../utils/supplier-listing-product-category-ai';

describe('listProductCategoryLeafRefs', () => {
  it('includes nested Covetrus leaves with dot paths', () => {
    const leaves = listProductCategoryLeafRefs();
    expect(
      leaves.find((leaf) => leaf.path === 'consumables.anaesthesia.adaptors'),
    ).toEqual({
      path: 'consumables.anaesthesia.adaptors',
      label: 'Adaptors',
    });
    expect(leaves.length).toBeGreaterThan(100);
  });
});

describe('supplier-listing-product-category-ai', () => {
  describe('chunkListings', () => {
    it('chunks into sequential batches of the configured size', () => {
      const items = Array.from({ length: 52 }, (_, i) => i);
      const batches = chunkListings(
        items,
        SUPPLIER_LISTING_PRODUCT_CATEGORY_BATCH_SIZE,
      );

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(25);
      expect(batches[1]).toHaveLength(25);
      expect(batches[2]).toHaveLength(2);
    });
  });

  describe('parseListingCategoryAiResponse', () => {
    const listingId = '11111111-1111-1111-1111-111111111111';
    const listings = [
      {
        id: listingId,
        name: 'ET Tube 5.0',
        supplierProductId: 'ABC',
        supplierName: 'Covetrus',
        listedPrice: '12.50',
        catalogueProductName: null,
      },
    ];
    const leafPathSet = new Set([
      'consumables.anaesthesia.adaptors',
      'consumables.anaesthesia.etTubes',
    ]);

    it('accepts exact leaf paths and preserves confident status', () => {
      const mappings = parseListingCategoryAiResponse(
        JSON.stringify({
          mappings: [
            {
              listingId,
              productCategoryPath: 'consumables.anaesthesia.etTubes',
              status: ProductCategoryStatus.Confident,
            },
          ],
        }),
        listings,
        leafPathSet,
      );

      expect(mappings).toEqual([
        {
          listingId,
          productCategory: 'consumables.anaesthesia.etTubes',
          productCategoryStatus: ProductCategoryStatus.Confident,
        },
      ]);
    });

    it('resolves unique leaf keys and forces needs_review', () => {
      const mappings = parseListingCategoryAiResponse(
        JSON.stringify({
          mappings: [
            {
              listingId,
              productCategoryPath: 'etTubes',
              status: ProductCategoryStatus.Confident,
            },
          ],
        }),
        listings,
        leafPathSet,
      );

      expect(mappings[0]).toEqual({
        listingId,
        productCategory: 'consumables.anaesthesia.etTubes',
        productCategoryStatus: ProductCategoryStatus.NeedsReview,
      });
    });

    it('throws when a listing is missing from the AI response', () => {
      expect(() =>
        parseListingCategoryAiResponse(
          JSON.stringify({ mappings: [] }),
          listings,
          leafPathSet,
        ),
      ).toThrow(/omitted listingId/);
    });

    it('suffix-resolves invented parent paths onto a matching leaf with needs_review', () => {
      const anaestheticLeaves = new Set([
        'hormones.nervousSystem.e1Anaesthetics',
        'feedAdditives.nervousSystem.e1Anaesthetics',
        'consumables.anaesthesia.adaptors',
      ]);

      const mappings = parseListingCategoryAiResponse(
        JSON.stringify({
          mappings: [
            {
              listingId,
              productCategoryPath:
                'pharmaceutical.nervousSystem.e1Anaesthetics',
              status: ProductCategoryStatus.Confident,
            },
          ],
        }),
        listings,
        anaestheticLeaves,
      );

      expect(mappings[0]?.productCategory).toMatch(/\.e1Anaesthetics$/);
      expect(mappings[0]?.productCategoryStatus).toBe(
        ProductCategoryStatus.NeedsReview,
      );
    });

    it('falls back to a best-effort leaf instead of throwing on unknown paths', () => {
      const mappings = parseListingCategoryAiResponse(
        JSON.stringify({
          mappings: [
            {
              listingId,
              productCategoryPath: 'not.a.real.path',
              status: ProductCategoryStatus.Confident,
            },
          ],
        }),
        listings,
        leafPathSet,
      );

      expect(leafPathSet.has(mappings[0]!.productCategory)).toBe(true);
      expect(mappings[0]?.productCategoryStatus).toBe(
        ProductCategoryStatus.NeedsReview,
      );
    });
  });
});
