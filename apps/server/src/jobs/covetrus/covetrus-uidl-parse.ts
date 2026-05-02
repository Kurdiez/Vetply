/**
 * Vaadin Flow UIDL responses use an anti-XSSI prefix and embed product grid rows
 * as plain objects with dynamic `lr_*` field keys (description, _pd, _code, _price, …).
 */

import type { SalesCategory } from '@vetply/shared';
import { SalesCategory as SalesCategoryEnum } from '@vetply/shared';

function covetrusTreeLabelToSalesCategory(label: string): SalesCategory {
  const t = label.trim();
  if ((Object.values(SalesCategoryEnum) as string[]).includes(t)) {
    return t as SalesCategory;
  }
  return SalesCategoryEnum.Instruments;
}

export type CovetrusProductPreview = {
  rowKey: string;
  supplierProductId: string;
  name: string;
  listedPrice: string | null;
  legalGroupRaw: string | null;
  supplierName: string | null;
  /** Target mapping for CatalogueProductEntity.salesCategory (Covetrus tree label). */
  covetrusCategoryLabel: string;
  salesCategoryTarget: SalesCategory;
  unitTypeTarget: 'EA';
  unitQuantityTarget: '1';
};

export function stripUidlAntiXssiPrefix(body: string): string {
  const trimmed = body.trimStart();
  if (trimmed.startsWith('for(;;);')) {
    return trimmed.slice('for(;;);'.length).trimStart();
  }
  return trimmed;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function pickDescription(o: Record<string, unknown>): string | undefined {
  for (const k of Object.keys(o)) {
    if (k.endsWith('_description') && typeof o[k] === 'string') {
      return (o[k] as string).trim();
    }
  }
  return undefined;
}

function pickCode(o: Record<string, unknown>): string | undefined {
  for (const k of Object.keys(o)) {
    if (k.endsWith('_code') && typeof o[k] === 'string') {
      const v = (o[k] as string).trim();
      if (v.length > 0) {
        return v;
      }
    }
  }
  return undefined;
}

function pickMainPrice(o: Record<string, unknown>): string | undefined {
  for (const k of Object.keys(o)) {
    if (
      k.endsWith('_price') &&
      !k.toLowerCase().includes('boprice') &&
      typeof o[k] === 'string'
    ) {
      return (o[k] as string).trim();
    }
  }
  return undefined;
}

function pickSupplierName(o: Record<string, unknown>): string | undefined {
  for (const k of Object.keys(o)) {
    if (k.endsWith('_supplier') && typeof o[k] === 'string') {
      return (o[k] as string).trim();
    }
  }
  return undefined;
}

function pickPdObject(
  o: Record<string, unknown>,
): Record<string, unknown> | undefined {
  for (const k of Object.keys(o)) {
    if (k.endsWith('_pd') && isRecord(o[k])) {
      return o[k] as Record<string, unknown>;
    }
  }
  return undefined;
}

function isProductRowObject(o: Record<string, unknown>): boolean {
  if (typeof o.key !== 'string') {
    return false;
  }
  const hasDesc = Object.keys(o).some((k) => k.endsWith('_description'));
  const pd = pickPdObject(o);
  return hasDesc && pd !== undefined;
}

function previewFromRow(
  o: Record<string, unknown>,
  covetrusCategoryLabel: string,
): CovetrusProductPreview | undefined {
  if (!isProductRowObject(o)) {
    return undefined;
  }
  const name = pickDescription(o);
  const supplierProductId = pickCode(o);
  if (!name || !supplierProductId) {
    return undefined;
  }
  const pd = pickPdObject(o)!;
  const legalGroupRaw =
    typeof pd.legalGroup === 'string' ? pd.legalGroup.trim() : null;
  const nestedProduct = isRecord(pd.product) ? pd.product : undefined;
  const supplierFromPd =
    typeof pd.supplier === 'string'
      ? pd.supplier.trim()
      : typeof nestedProduct?.supplier === 'string'
        ? String(nestedProduct.supplier).trim()
        : undefined;
  const supplierName = pickSupplierName(o) ?? supplierFromPd ?? null;

  return {
    rowKey: o.key as string,
    supplierProductId,
    name,
    listedPrice: pickMainPrice(o) ?? null,
    legalGroupRaw,
    supplierName,
    covetrusCategoryLabel,
    salesCategoryTarget: covetrusTreeLabelToSalesCategory(
      covetrusCategoryLabel,
    ),
    unitTypeTarget: 'EA',
    unitQuantityTarget: '1',
  };
}

function walkExtractRows(
  value: unknown,
  covetrusCategoryLabel: string,
  out: CovetrusProductPreview[],
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      walkExtractRows(item, covetrusCategoryLabel, out);
    }
    return;
  }
  if (isRecord(value)) {
    const row = previewFromRow(value, covetrusCategoryLabel);
    if (row) {
      out.push(row);
    }
    for (const k of Object.keys(value)) {
      walkExtractRows(value[k], covetrusCategoryLabel, out);
    }
  }
}

export function extractProductPreviewsFromUidlBody(
  body: string,
  covetrusCategoryLabel: string,
): CovetrusProductPreview[] {
  const jsonText = stripUidlAntiXssiPrefix(body);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }
  const out: CovetrusProductPreview[] = [];
  walkExtractRows(parsed, covetrusCategoryLabel, out);
  return out;
}
