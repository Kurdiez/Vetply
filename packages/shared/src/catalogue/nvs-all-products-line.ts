import { canonicalizeNvsSupplierProductId } from './nvs-supplier-product-id';

/**
 * Parses one line from the NVS "All products" fixed-layout file (not CSV).
 * Layout: 8-digit supplier product id, product name, pack/UoM token, trailing price.
 */
export function parseNvsAllProductsLine(line: string): {
  supplierProductId: string;
  name: string;
  pack: string;
  listedPrice: string;
} | null {
  const trimmed = line.trim();
  if (trimmed === '') {
    return null;
  }
  const head = /^(\d{8})\s+(.+)$/.exec(trimmed);
  if (!head) {
    return null;
  }
  const supplierProductId = canonicalizeNvsSupplierProductId(head[1]);
  let rest = head[2].trimEnd();
  const priceM = /\s+(\d+\.\d+)\s*$/.exec(rest);
  if (!priceM) {
    return null;
  }
  const listedPrice = priceM[1];
  rest = rest.slice(0, priceM.index).trimEnd();
  if (rest === '') {
    return null;
  }

  const packPatterns: RegExp[] = [
    /\d+(?:\.\d+)?X\d+(?:\.\d+)?(?:ML|L|G|MG|MCG|IU)$/i,
    /PK\d+$/i,
    /(?<=[^0-9.])(\d+(?:\.\d+)?)(?:ML|L|G|MG|MCG|IU|EA|TAB|CAP|VIAL|AMP|BTL|SET)$/i,
  ];
  for (const re of packPatterns) {
    const m = re.exec(rest);
    if (m && m.index > 0) {
      const pack = rest.slice(m.index);
      const name = rest.slice(0, m.index).trimEnd();
      if (name !== '' && pack !== '') {
        return { supplierProductId, name, pack, listedPrice };
      }
    }
  }
  const ls = rest.lastIndexOf(' ');
  if (ls <= 0) {
    return null;
  }
  const name = rest.slice(0, ls).trimEnd();
  const pack = rest.slice(ls + 1).trim();
  if (name === '' || pack === '') {
    return null;
  }
  return { supplierProductId, name, pack, listedPrice };
}
