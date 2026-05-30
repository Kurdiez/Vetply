import type { Page, Response } from 'playwright';

import {
  isMwiahProductsCollectionResponse,
  parseMwiahProductsCollectionBody,
  readMwiahResponseJsonBody,
  type MwiahProductsPagination,
} from './mwiah-product-api';
import { normalizeMwiahSupplierProductId } from './mwiah-supplier-product-id';

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

  drainCollectionProducts(): Record<string, unknown>[] {
    const bySupplierProductId = new Map<string, Record<string, unknown>>();
    for (const body of this.collectionBodies) {
      const { products } = parseMwiahProductsCollectionBody(body);
      for (const product of products) {
        const erpRaw = String(
          product.erpNumber ?? product.productNumber ?? '',
        ).trim();
        if (erpRaw === '') {
          continue;
        }
        const key = normalizeMwiahSupplierProductId(erpRaw);
        bySupplierProductId.set(key, product);
      }
    }
    this.collectionBodies.length = 0;
    return [...bySupplierProductId.values()];
  }
}
