import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Page, Response } from 'playwright';

import { MwiahProductApiCapture } from '../mwiah-product-api-capture';

const fixturesDir = join(__dirname, '../__fixtures__');

function mockCollectionResponse(body: string): Response {
  return {
    request: () => ({ method: () => 'GET' }),
    url: () => 'https://onlinestore.mwiah.co.uk/api/v2/products?page=1',
    ok: () => true,
    headers: () => ({ 'content-type': 'application/json' }),
    text: async () => body,
  } as unknown as Response;
}

async function ingestCollectionBodies(
  capture: MwiahProductApiCapture,
  bodies: string[],
): Promise<void> {
  const handlers: Array<(res: Response) => void> = [];
  const page = {
    on: (_event: string, handler: (res: Response) => void) => {
      handlers.push(handler);
    },
  } as unknown as Page;
  capture.attach(page);
  for (const body of bodies) {
    for (const handler of handlers) {
      await handler(mockCollectionResponse(body));
    }
  }
}

describe('MwiahProductApiCapture', () => {
  it('takeLatestCollectionProductPage returns only the most recent page', async () => {
    const page1Body = readFileSync(
      join(fixturesDir, 'products-collection-page1.json'),
      'utf8',
    );
    const page2Body = page1Body.replace('"30315838"', '"30315839"');

    const capture = new MwiahProductApiCapture();
    await ingestCollectionBodies(capture, [page1Body, page2Body]);

    expect(capture.collectionResponseCount()).toBe(2);

    const latest = capture.takeLatestCollectionProductPage();
    expect(latest).toHaveLength(1);
    expect(latest[0].erpNumber).toBe('30315839');
    expect(capture.collectionResponseCount()).toBe(1);

    const previous = capture.takeLatestCollectionProductPage();
    expect(previous).toHaveLength(1);
    expect(previous[0].erpNumber).toBe('30315838');
    expect(capture.collectionResponseCount()).toBe(0);
  });

  it('takeLatestCollectionProductPage returns empty when no bodies captured', () => {
    const capture = new MwiahProductApiCapture();
    expect(capture.takeLatestCollectionProductPage()).toEqual([]);
  });

  it('clear removes captured bodies and pagination', async () => {
    const page1Body = readFileSync(
      join(fixturesDir, 'products-collection-page1.json'),
      'utf8',
    );

    const capture = new MwiahProductApiCapture();
    await ingestCollectionBodies(capture, [page1Body]);
    expect(capture.collectionResponseCount()).toBe(1);
    expect(capture.getPagination()).not.toBeNull();

    capture.clear();

    expect(capture.collectionResponseCount()).toBe(0);
    expect(capture.getPagination()).toBeNull();
    expect(capture.takeLatestCollectionProductPage()).toEqual([]);
  });
});
