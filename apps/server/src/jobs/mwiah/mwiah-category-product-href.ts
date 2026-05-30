const MWIAH_PRODUCT_DETAIL_PATH = /^\/Product\/[^/]+-\d+\/?$/i;

export function normalizeMwiahPathname(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (trimmed === '') {
    return '';
  }
  try {
    const path = trimmed.startsWith('http')
      ? new URL(trimmed).pathname
      : trimmed.startsWith('/')
        ? trimmed
        : `/${trimmed}`;
    return path.replace(/\/$/, '') || '/';
  } catch {
    return '';
  }
}

export function isMwiahProductDetailHref(href: string): boolean {
  const path = normalizeMwiahPathname(href);
  return MWIAH_PRODUCT_DETAIL_PATH.test(path);
}

export function parseSupplierProductIdFromProductUrl(
  productUrl: string,
): string | null {
  const path = normalizeMwiahPathname(productUrl);
  const match = /-(\d+)\/?$/.exec(path);
  return match?.[1] ?? null;
}

export function isMwiahProductHrefUnderCategory(
  categoryPath: string,
  href: string,
): boolean {
  if (isMwiahProductDetailHref(href)) {
    return true;
  }
  const category = normalizeMwiahPathname(categoryPath);
  const product = normalizeMwiahPathname(href);
  if (category === '' || product === '' || product === category) {
    return false;
  }
  if (!product.startsWith(`${category}/`)) {
    return false;
  }
  const categoryDepth = category.split('/').filter(Boolean).length;
  const productDepth = product.split('/').filter(Boolean).length;
  return productDepth > categoryDepth;
}
