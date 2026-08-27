import { Injectable } from '@nestjs/common';
import type { CatalogueProductDetail } from '@vetply/shared';

export type ListedPriceOffer = {
  listingId: string;
  supplierName: string;
  supplierProductId: string;
  listingName: string;
  listedPrice: string;
};

export type ListedPriceComparison = {
  productId: string;
  productName: string;
  manufacturerName: string | null;
  unitType: string;
  unitQuantity: string;
  listings: Array<{
    listingId: string;
    supplierName: string;
    supplierProductId: string;
    listingName: string;
    listedPrice: string | null;
  }>;
  cheapestListedPrice: string | null;
  cheapestOffers: ListedPriceOffer[];
  listingsWithoutPriceCount: number;
};

@Injectable()
export class CatalogueInsightService {
  compareListedPricesForProduct(
    detail: CatalogueProductDetail,
  ): ListedPriceComparison {
    const listings = detail.listings.map((listing) => ({
      listingId: listing.id,
      supplierName: listing.supplierName,
      supplierProductId: listing.supplierProductId,
      listingName: listing.name,
      listedPrice: listing.listedPrice,
    }));

    const pricedOffers = this.collectPricedOffers(listings);
    const cheapestListedPrice = this.findCheapestListedPrice(pricedOffers);
    const cheapestOffers =
      cheapestListedPrice === null
        ? []
        : pricedOffers.filter(
            (offer) => offer.listedPrice === cheapestListedPrice,
          );

    return {
      productId: detail.id,
      productName: detail.name,
      manufacturerName: detail.manufacturerName,
      unitType: detail.unitType,
      unitQuantity: detail.unitQuantity,
      listings,
      cheapestListedPrice,
      cheapestOffers,
      listingsWithoutPriceCount: listings.filter(
        (listing) => listing.listedPrice === null,
      ).length,
    };
  }

  private collectPricedOffers(
    listings: ListedPriceComparison['listings'],
  ): ListedPriceOffer[] {
    const offers: ListedPriceOffer[] = [];
    for (const listing of listings) {
      if (listing.listedPrice === null) {
        continue;
      }
      if (!this.isFinitePriceString(listing.listedPrice)) {
        continue;
      }
      offers.push({
        listingId: listing.listingId,
        supplierName: listing.supplierName,
        supplierProductId: listing.supplierProductId,
        listingName: listing.listingName,
        listedPrice: listing.listedPrice,
      });
    }
    return offers;
  }

  private findCheapestListedPrice(offers: ListedPriceOffer[]): string | null {
    if (offers.length === 0) {
      return null;
    }

    let cheapest = offers[0];
    let cheapestValue = Number(cheapest.listedPrice);
    for (let i = 1; i < offers.length; i += 1) {
      const candidate = offers[i];
      const candidateValue = Number(candidate.listedPrice);
      if (candidateValue < cheapestValue) {
        cheapest = candidate;
        cheapestValue = candidateValue;
      }
    }
    return cheapest.listedPrice;
  }

  private isFinitePriceString(value: string): boolean {
    const parsed = Number(value);
    return Number.isFinite(parsed);
  }
}
