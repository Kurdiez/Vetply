import type { Page, Response } from 'playwright';

import {
  isMwiahProductsCollectionResponse,
  parseMwiahProductsCollectionBody,
  readMwiahResponseJsonBody,
  type MwiahProductsPagination,
} from './mwiah-product-api';
import { normalizeMwiahSupplierProductId } from './mwiah-supplier-product-id';

function filterCollectionProducts(
  products: Record<string, unknown>[],
): Record<string, unknown>[] {
  return products.filter((product) => {
    const erpRaw = String(
      product.erpNumber ?? product.productNumber ?? '',
    ).trim();
    return erpRaw !== '';
  });
}

export class MwiahProductApiCapture {
  private readonly collectionBodies: string[] = [];
  private latestPagination: MwiahProductsPagination | null = null;

  attach(page: Page): void {
    page.on('response', (res) => {
      void this.onResponse(res);
    });
  }

  hasCollectionResponses(): boolean {
    return this.collectionBodies.length > 0;
  }

  collectionResponseCount(): number {
    return this.collectionBodies.length;
  }

  private async onResponse(res: Response): Promise<void> {
    if (!isMwiahProductsCollectionResponse(res)) {
      return;
    }
    const body = await readMwiahResponseJsonBody(res);
    if (!body) {
      return;
    }
    this.collectionBodies.push(body);
    const parsed = parseMwiahProductsCollectionBody(body);
    if (parsed.pagination) {
      this.latestPagination = parsed.pagination;
    }
  }

  getPagination(): MwiahProductsPagination | null {
    return this.latestPagination;
  }

  clear(): void {
    this.collectionBodies.length = 0;
    this.latestPagination = null;
  }

  takeLatestCollectionProductPage(): Record<string, unknown>[] {
    const body = this.collectionBodies.pop();
    if (!body) {
      return [];
    }
    return filterCollectionProducts(
      parseMwiahProductsCollectionBody(body).products,
    );
  }

  drainCollectionProductPages(): Record<string, unknown>[][] {
    const pages = this.collectionBodies.map((body) =>
      filterCollectionProducts(parseMwiahProductsCollectionBody(body).products),
    );
    this.collectionBodies.length = 0;
    return pages;
  }

  drainCollectionProducts(): Record<string, unknown>[] {
    const bySupplierProductId = new Map<string, Record<string, unknown>>();
    for (const pageProducts of this.drainCollectionProductPages()) {
      for (const product of pageProducts) {
        const erpRaw = String(
          product.erpNumber ?? product.productNumber ?? '',
        ).trim();
        const key = normalizeMwiahSupplierProductId(erpRaw);
        bySupplierProductId.set(key, product);
      }
    }
    return [...bySupplierProductId.values()];
  }
}
