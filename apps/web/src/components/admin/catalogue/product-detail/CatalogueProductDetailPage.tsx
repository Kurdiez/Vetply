"use client";

import { Button } from "@/components/ui/Button";
import { CATALOGUE_RETURN_URL_STORAGE_KEY } from "@/constants/catalogue-session";
import { routes } from "@/constants/routes";
import { pathWithoutQueryAndTrailingSlash } from "@/utils/admin-path";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { buildCatalogueListDynamicRouteNavigation } from "../catalogue-list-url";
import { useProductDetail } from "./ProductDetailContext";

function formatUnitQuantityForDisplay(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return raw;
  }
  return String(Math.trunc(n));
}

function cardShellClassName(extra?: string) {
  return [
    "overflow-hidden rounded-lg border border-white/10 bg-gray-800/50 outline-1 -outline-offset-1 outline-white/10",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function CatalogueProductDetailPage() {
  const router = useRouter();
  const { detail, variantSlides } = useProductDetail();
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [detail?.product.id]);

  useEffect(() => {
    setSlideIndex((i) =>
      variantSlides.length === 0
        ? 0
        : Math.min(i, Math.max(0, variantSlides.length - 1)),
    );
  }, [variantSlides]);

  const slide = variantSlides[slideIndex];

  function goBackToProducts() {
    if (typeof window === "undefined") {
      return;
    }
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(CATALOGUE_RETURN_URL_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored) {
      const path = pathWithoutQueryAndTrailingSlash(stored);
      if (path === routes.admin.catalogue.view) {
        try {
          sessionStorage.removeItem(CATALOGUE_RETURN_URL_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        const nav = buildCatalogueListDynamicRouteNavigation(
          stored,
          window.location.origin,
        );
        if (nav) {
          void router.replace(nav.url, nav.as, { shallow: true });
        } else {
          void router.replace(stored, undefined, { shallow: true });
        }
        return;
      }
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      void router.push(routes.admin.catalogue.view);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Button
          type="button"
          variant="secondary"
          onClick={goBackToProducts}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden />
          Back to products
        </Button>
      </div>

      <div className={cardShellClassName()}>
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          <div className="border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
            {slide ? (
              <>
                <div className="relative aspect-square w-full overflow-hidden bg-gray-900/50 sm:rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none">
                  <div className="absolute inset-x-0 top-0 z-10 bg-black/55 px-3 py-2 text-left text-xs text-white">
                    <p className="font-medium text-gray-100">{slide.supplier}</p>
                    <p className="mt-0.5 text-gray-300">{slide.variantName}</p>
                  </div>
                  <img
                    src={slide.imageSrc}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 border-t border-white/10 px-2 py-2 lg:border-white/10">
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIndex((i) =>
                        i <= 0 ? variantSlides.length - 1 : i - 1,
                      )
                    }
                    className="shrink-0 rounded-md p-2 text-gray-300 hover:bg-white/10 hover:text-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeftIcon className="size-5" />
                  </button>
                  <div className="flex min-h-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
                    {variantSlides.map((s, i) => (
                      <button
                        key={s.variantId}
                        type="button"
                        onClick={() => setSlideIndex(i)}
                        className={`shrink-0 overflow-hidden rounded border-2 ${
                          i === slideIndex
                            ? "border-primary-500"
                            : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                        aria-label={`Show variant ${s.variantName}`}
                      >
                        <img
                          src={s.imageSrc}
                          alt=""
                          className="size-14 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIndex((i) =>
                        i >= variantSlides.length - 1 ? 0 : i + 1,
                      )
                    }
                    className="shrink-0 rounded-md p-2 text-gray-300 hover:bg-white/10 hover:text-white"
                    aria-label="Next image"
                  >
                    <ChevronRightIcon className="size-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="aspect-square w-full bg-gray-900/50 sm:rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none">
                <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-6 py-12">
                  <p className="text-center text-sm text-gray-400">
                    {detail
                      ? "No variants to preview."
                      : "Preview image upload feature coming soon."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-6 sm:px-6 lg:py-8 lg:pr-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {detail?.product.name ?? "\u00a0"}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Catalogue record — supplier-specific prices and refs are listed
              below.
            </p>

            {detail ? (
              <dl className="mt-8 space-y-5 text-sm">
                <div>
                  <dt className="text-gray-400">Manufacturer</dt>
                  <dd className="mt-1 text-gray-100">
                    {detail.product.manufacturerName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Sales category</dt>
                  <dd className="mt-1 text-gray-100">
                    {detail.product.salesCategory ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Legal category</dt>
                  <dd className="mt-1 text-gray-100">
                    {detail.product.legalCategory ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">POM</dt>
                  <dd className="mt-1 text-gray-100">
                    {detail.product.pom === null
                      ? "—"
                      : detail.product.pom
                        ? "Yes"
                        : "No"}
                  </dd>
                </div>
                <div className="grid grid-cols-1 gap-5 border-t border-white/10 pt-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-400">Created</dt>
                    <dd className="mt-1 text-gray-300">
                      {detail.product.createdAt}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Updated</dt>
                    <dd className="mt-1 text-gray-300">
                      {detail.product.updatedAt}
                    </dd>
                  </div>
                </div>
              </dl>
            ) : null}
          </div>
        </div>
      </div>

      {detail ? (
        <div className={cardShellClassName("px-4 py-5 sm:px-6")}>
          <h2 className="text-sm font-semibold text-white">
            Variants by supplier
          </h2>
          <div className="mt-6 space-y-8">
            {detail.supplierGroups.map((group) => (
              <section key={group.supplier}>
                <h3 className="text-sm font-medium text-primary-200">
                  {group.supplier}
                </h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead>
                      <tr className="text-left text-gray-400">
                        <th className="py-2 pr-4 font-medium">Variant</th>
                        <th className="py-2 pr-4 font-medium">Unit</th>
                        <th className="py-2 pr-4 font-medium">Supplier ref</th>
                        <th className="py-2 pr-4 font-medium">Listing name</th>
                        <th className="py-2 font-medium">Listed price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-gray-200">
                      {group.variants.map((v) => (
                        <tr key={`${group.supplier}-${v.id}`}>
                          <td className="py-2 pr-4 align-top">{v.name}</td>
                          <td className="py-2 pr-4 align-top whitespace-nowrap">
                            {formatUnitQuantityForDisplay(v.unitQuantity)}{" "}
                            {v.unitType}
                          </td>
                          <td className="py-2 pr-4 align-top">
                            {v.listing.variantRef}
                          </td>
                          <td className="py-2 pr-4 align-top">
                            {v.listing.name}
                          </td>
                          <td className="py-2 align-top whitespace-nowrap">
                            {v.listing.listedPrice ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
