const DUMMY_PRODUCT_PUBLIC_PATHS = [
  "/dummy-products/dummy-product-1.jpeg",
  "/dummy-products/dummy-product-2.jpeg",
  "/dummy-products/dummy-product-3.jpeg",
  "/dummy-products/dummy-product-4.jpeg",
] as const;

export function dummyImageSrcForVariantId(variantId: string): string {
  let h = 0;
  for (let i = 0; i < variantId.length; i++) {
    h = (h << 5) - h + variantId.charCodeAt(i);
    h |= 0;
  }
  const idx = Math.abs(h) % DUMMY_PRODUCT_PUBLIC_PATHS.length;
  return DUMMY_PRODUCT_PUBLIC_PATHS[idx];
}
