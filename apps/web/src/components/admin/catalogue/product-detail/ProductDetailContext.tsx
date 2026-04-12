"use client";

import { fetchCatalogueProductDetail } from "@/utils/vetply-api/catalogue-api";
import type { CatalogueProductDetailRes } from "@vetply/shared";
import { isAxiosError } from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  buildVariantPreviewSlides,
  type VariantPreviewSlide,
} from "./variant-preview-slides";

type ProductDetailContextValue = {
  productId: string;
  detail: CatalogueProductDetailRes | null;
  /** Placeholder: one dummy image per variant, as if from the API. */
  variantSlides: VariantPreviewSlide[];
  refetch: () => Promise<void>;
};

const ProductDetailContext = createContext<ProductDetailContextValue | null>(
  null,
);

type ProductDetailProviderProps = {
  productId: string;
  children: ReactNode;
};

export function ProductDetailProvider({
  productId,
  children,
}: ProductDetailProviderProps) {
  const [detail, setDetail] = useState<CatalogueProductDetailRes | null>(null);

  const refetch = useCallback(async () => {
    setDetail(null);
    try {
      const data = await fetchCatalogueProductDetail(productId);
      setDetail(data);
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) {
        toast.error("Product not found.");
      } else {
        toast.error("Could not load product details.");
      }
    }
  }, [productId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const variantSlides = useMemo(
    () => (detail ? buildVariantPreviewSlides(detail) : []),
    [detail],
  );

  const value: ProductDetailContextValue = {
    productId,
    detail,
    variantSlides,
    refetch,
  };

  return (
    <ProductDetailContext.Provider value={value}>
      {children}
    </ProductDetailContext.Provider>
  );
}

export function useProductDetail(): ProductDetailContextValue {
  const ctx = useContext(ProductDetailContext);
  if (!ctx) {
    throw new Error("useProductDetail must be used within ProductDetailProvider");
  }
  return ctx;
}
