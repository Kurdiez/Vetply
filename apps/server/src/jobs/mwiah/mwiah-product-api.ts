import type { Response } from 'playwright';

export type MwiahProductsPagination = {
  currentPage: number;
  totalPages: number;
  pageSize: number | null;
};

export type MwiahProductsCollectionParse = {
  products: Record<string, unknown>[];
  pagination: MwiahProductsPagination | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function isMwiahProductsCollectionResponse(res: Response): boolean {
  if (res.request().method() !== 'GET' || !res.ok()) {
    return false;
  }
  const url = res.url();
  return /\/api\/v\d+\/products\/?(\?|$)/i.test(url);
}

export function isMwiahSingleProductResponse(res: Response): boolean {
  if (res.request().method() !== 'GET' || !res.ok()) {
    return false;
  }
  return /\/api\/v\d+\/products\/[^/?]+/i.test(res.url());
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseMwiahProductsPagination(
  raw: unknown,
): MwiahProductsPagination | null {
  if (!isRecord(raw)) {
    return null;
  }
  const currentPage =
    readNumber(raw.currentPage) ??
    readNumber(raw.page) ??
    readNumber(raw.pageNumber);
  const totalPages =
    readNumber(raw.numberOfPages) ?? readNumber(raw.totalPages);
  if (currentPage == null || totalPages == null) {
    return null;
  }
  return {
    currentPage,
    totalPages,
    pageSize: readNumber(raw.pageSize) ?? readNumber(raw.defaultPageSize),
  };
}

export function parseMwiahProductsCollectionBody(
  body: string,
): MwiahProductsCollectionParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return { products: [], pagination: null };
  }
  if (!isRecord(parsed)) {
    return { products: [], pagination: null };
  }
  const rawProducts = parsed.products;
  const products = Array.isArray(rawProducts)
    ? rawProducts.filter(isRecord)
    : [];
  const pagination = parseMwiahProductsPagination(parsed.pagination);
  return { products, pagination };
}

export function parseMwiahSingleProductBody(
  body: string,
): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  if (isRecord(parsed.product)) {
    return parsed.product;
  }
  if (parsed.erpNumber != null || parsed.productNumber != null) {
    return parsed;
  }
  return null;
}

export async function readMwiahResponseJsonBody(
  res: Response,
): Promise<string | null> {
  const ct = res.headers()['content-type'] ?? '';
  if (!ct.includes('json')) {
    return null;
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}
