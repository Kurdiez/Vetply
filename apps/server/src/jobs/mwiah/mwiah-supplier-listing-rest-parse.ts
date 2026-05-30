import { CatalogUnitType } from '@vetply/shared';

import {
  parseSupplierProductIdFromProductUrl,
  normalizeMwiahPathname,
} from './mwiah-category-product-href';
import { parseMwiahSingleProductBody } from './mwiah-product-api';
import { normalizeMwiahSupplierProductId } from './mwiah-supplier-product-id';
import { resolveMwiahSalesCategoryFromCategoryUrl } from './mwiah-sales-category';
import { resolveMwiahCategoryUrl } from './mwiah-products-menu';
import type { MwiahProductPreview } from './mwiah-product.types';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function pickString(value: unknown): string | null {
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '' || t.toUpperCase() === 'N/A') {
      return null;
    }
    return t;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function pickNestedName(value: unknown): string | null {
  if (!isRecord(value)) {
    return pickString(value);
  }
  return pickString(value.name) ?? pickString(value.description);
}

function pickListedPriceFromProduct(
  product: Record<string, unknown>,
): string | null {
  const pricing = product.pricing;
  if (isRecord(pricing)) {
    for (const key of [
      'unitNetPrice',
      'unitListPrice',
      'actualPrice',
      'unitRegularPrice',
    ]) {
      const n = pricing[key];
      if (typeof n === 'number' && Number.isFinite(n)) {
        return n.toFixed(4);
      }
      const s = pickString(n);
      if (s != null) {
        const parsed = Number.parseFloat(s.replace(/[£,]/g, ''));
        if (Number.isFinite(parsed)) {
          return parsed.toFixed(4);
        }
      }
    }
  }
  return pickString(product.unitListPrice) ?? pickString(product.price);
}

function pickLegalGroupRawFromDetail(
  product: Record<string, unknown>,
  properties: Record<string, unknown> | null,
): string | null {
  if (properties) {
    for (const key of Object.keys(properties)) {
      if (/legal/i.test(key)) {
        const v = pickString(properties[key]);
        if (v) {
          return v;
        }
      }
    }
  }
  const attrs = product.attributeTypes;
  if (Array.isArray(attrs)) {
    for (const item of attrs) {
      if (!isRecord(item)) {
        continue;
      }
      const label = pickString(item.label) ?? pickString(item.name) ?? '';
      if (/legal/i.test(label)) {
        const v = pickString(item.value);
        if (v) {
          return v;
        }
      }
    }
  }
  return pickString(product.legalCategory) ?? pickString(product.legalGroup);
}

function pickImageUrlFromProduct(
  product: Record<string, unknown>,
  storeOrigin: string,
): string | null {
  for (const key of [
    'mediumImagePath',
    'smallImagePath',
    'largeImagePath',
    'imagePath',
  ]) {
    const path = pickString(product[key]);
    if (path) {
      if (path.startsWith('http')) {
        return path;
      }
      return resolveMwiahCategoryUrl(path, storeOrigin);
    }
  }
  return null;
}

function pickSupplierNameFromProduct(
  product: Record<string, unknown>,
): string | null {
  return (
    pickNestedName(product.brand) ??
    pickNestedName(product.manufacturer) ??
    pickString(product.brandName)
  );
}

function pickProductNameFromRecord(
  product: Record<string, unknown>,
): string | null {
  return (
    pickString(product.shortDescription) ??
    pickString(product.productTitle) ??
    pickString(product.description) ??
    pickString(product.name)
  );
}

function pickRawSupplierProductId(
  product: Record<string, unknown>,
  productUrl: string | null,
): string | null {
  const fromFields =
    pickString(product.erpNumber) ??
    pickString(product.productNumber) ??
    pickString(product.sku);
  if (fromFields) {
    return fromFields;
  }
  if (productUrl) {
    return parseSupplierProductIdFromProductUrl(productUrl);
  }
  return null;
}

function resolveProductUrlFromRecord(
  product: Record<string, unknown>,
  storeOrigin: string,
  supplierProductId: string,
): string {
  for (const key of ['canonicalUrl', 'url', 'productDetailUrl']) {
    const raw = pickString(product[key]);
    if (raw?.includes('/Product/')) {
      return raw.startsWith('http')
        ? raw
        : resolveMwiahCategoryUrl(raw, storeOrigin);
    }
  }
  const slug = pickString(product.urlSegment) ?? pickString(product.slug);
  if (slug) {
    return resolveMwiahCategoryUrl(
      `/Product/${slug}-${supplierProductId}`,
      storeOrigin,
    );
  }
  return resolveMwiahCategoryUrl(`/Product/${supplierProductId}`, storeOrigin);
}

export function parsePackFromProductName(name: string): {
  unitType: CatalogUnitType;
  unitQuantity: string;
} | null {
  const mult = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|mg)\b/i.exec(name);
  if (mult) {
    const count = Number.parseFloat(mult[1]);
    const amount = Number.parseFloat(mult[2]);
    const unit = mult[3].toUpperCase();
    const unitMap: Record<string, CatalogUnitType> = {
      G: CatalogUnitType.G,
      KG: CatalogUnitType.G,
      ML: CatalogUnitType.ML,
      L: CatalogUnitType.L,
      MG: CatalogUnitType.MG,
    };
    const unitType = unitMap[unit] ?? CatalogUnitType.OTHER;
    const total = unit === 'KG' ? count * amount * 1000 : count * amount;
    return { unitType, unitQuantity: total.toFixed(6) };
  }
  return null;
}

export function mergeMwiahProductRecords(
  listItem: Record<string, unknown> | null,
  detail: Record<string, unknown> | null,
): Record<string, unknown> {
  return { ...(listItem ?? {}), ...(detail ?? {}) };
}

function parseDetailApiResponseBody(body: string): {
  product: Record<string, unknown> | null;
  properties: Record<string, unknown> | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return { product: null, properties: null };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { product: null, properties: null };
  }
  const root = parsed as Record<string, unknown>;
  const product = parseMwiahSingleProductBody(body);
  const properties =
    root.properties != null &&
    typeof root.properties === 'object' &&
    !Array.isArray(root.properties)
      ? (root.properties as Record<string, unknown>)
      : null;
  return { product, properties };
}

function buildUnitTargetsFromName(
  name: string,
): Pick<MwiahProductPreview, 'unitTypeTarget' | 'unitQuantityTarget'> {
  const pack = parsePackFromProductName(name);
  if (!pack) {
    return { unitTypeTarget: null, unitQuantityTarget: null };
  }
  return {
    unitTypeTarget: pack.unitType,
    unitQuantityTarget: pack.unitQuantity,
  };
}

export function buildMwiahSupplierListingPreview(params: {
  categoryUrl: string;
  storeOrigin: string;
  listItem: Record<string, unknown>;
  detailBody: string | null;
  productUrlOverride?: string;
}): MwiahProductPreview | string {
  const { categoryUrl, storeOrigin, listItem } = params;
  let detailProduct: Record<string, unknown> | null = null;
  let properties: Record<string, unknown> | null = null;

  if (params.detailBody) {
    const parsed = parseDetailApiResponseBody(params.detailBody);
    detailProduct = parsed.product;
    properties = parsed.properties;
  }

  const product = mergeMwiahProductRecords(listItem, detailProduct);
  const rawSupplierProductId = pickRawSupplierProductId(
    product,
    params.productUrlOverride ?? null,
  );
  if (!rawSupplierProductId) {
    return 'Missing supplier product id';
  }
  const supplierProductId =
    normalizeMwiahSupplierProductId(rawSupplierProductId);

  const productUrl =
    params.productUrlOverride ??
    resolveProductUrlFromRecord(product, storeOrigin, supplierProductId);

  const name = pickProductNameFromRecord(product);
  if (!name) {
    return 'Missing product name';
  }

  const unitTargets = buildUnitTargetsFromName(name);

  return {
    supplierProductId,
    name,
    listedPrice: pickListedPriceFromProduct(product),
    supplierName: pickSupplierNameFromProduct(product),
    legalGroupRaw: pickLegalGroupRawFromDetail(product, properties),
    categoryUrl,
    productUrl:
      productUrl ||
      resolveMwiahCategoryUrl(`/Product/${supplierProductId}`, storeOrigin),
    image: pickImageUrlFromProduct(product, storeOrigin),
    salesCategoryTarget: resolveMwiahSalesCategoryFromCategoryUrl(categoryUrl),
    ...unitTargets,
  };
}

export function normalizeMwiahProductPath(path: string): string {
  return normalizeMwiahPathname(path);
}
