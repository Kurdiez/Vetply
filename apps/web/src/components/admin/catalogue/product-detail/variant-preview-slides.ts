import type { CatalogueProductDetailRes } from "@vetply/shared";
import { dummyImageSrcForVariantId } from "./dummy-product-images";

export type VariantPreviewSlide = {
  variantId: string;
  supplier: string;
  variantName: string;
  imageSrc: string;
};

export function buildVariantPreviewSlides(
  detail: CatalogueProductDetailRes,
): VariantPreviewSlide[] {
  const slides: VariantPreviewSlide[] = [];
  for (const group of detail.supplierGroups) {
    for (const v of group.variants) {
      slides.push({
        variantId: v.id,
        supplier: group.supplier,
        variantName: v.name,
        imageSrc: dummyImageSrcForVariantId(v.id),
      });
    }
  }
  return slides;
}
