"use client";

import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import {
  CatalogueProductDetailProvider,
  useCatalogueProductDetail,
} from "./CatalogueProductDetailContext";
import { CatalogueProductEditModal } from "./CatalogueProductEditModal";
import { CatalogueProductThumbnail } from "./CatalogueProductThumbnail";

function DetailBody() {
  const { detail, status } = useCatalogueProductDetail();

  if (status === "loading" || status === "idle") {
    return (
      <p className="text-sm text-gray-400" aria-live="polite">
        Loading product…
      </p>
    );
  }

  if (status === "error" || !detail) {
    return (
      <p className="text-sm text-gray-300">
        Could not load this product. Use Back above to return.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
        <CatalogueProductThumbnail
          imageUrl={detail.image}
          productName={detail.name}
          presentation="detail"
        />

        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white">{detail.name}</h1>
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-gray-500">Manufacturer</dt>
              <dd className="mt-1 text-sm text-gray-200">
                {detail.manufacturerName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Sales category</dt>
              <dd className="mt-1 text-sm text-gray-200">
                {detail.salesCategory ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Legal category</dt>
              <dd className="mt-1 text-sm text-gray-200">
                {detail.legalCategory ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">POM</dt>
              <dd className="mt-1 text-sm text-gray-200">
                {detail.pom === null ? "—" : detail.pom ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Unit</dt>
              <dd className="mt-1 text-sm text-gray-200">
                {detail.unitQuantity} {detail.unitType}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <section
        aria-labelledby="supplier-listings-heading"
        className="w-full min-w-0"
      >
        <h2
          id="supplier-listings-heading"
          className="text-sm font-semibold text-white"
        >
          Supplier listings
        </h2>
        {detail.listings.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">
            No supplier listings for this product yet.
          </p>
        ) : (
          <div className="mt-3 w-full min-w-0 overflow-x-auto rounded-lg border border-white/10 outline-1 -outline-offset-1 outline-white/10">
            <table className="w-full min-w-full table-fixed divide-y divide-white/10 text-left text-sm">
              <thead className="bg-gray-800/75">
                <tr>
                  <th
                    scope="col"
                    className="w-[14%] px-3 py-3 font-semibold text-gray-200"
                  >
                    Supplier
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-3 py-3 font-semibold text-gray-200"
                  >
                    Part / ref
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 font-semibold text-gray-200"
                  >
                    Listing name
                  </th>
                  <th
                    scope="col"
                    className="w-[12%] px-3 py-3 font-semibold text-gray-200"
                  >
                    Listed price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-gray-800/50 text-gray-300">
                {detail.listings.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-3 text-white">
                      {row.supplierName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                      {row.variantRef}
                    </td>
                    <td className="min-w-0 break-words px-3 py-3">{row.name}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.listedPrice ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailChrome() {
  const { goBack, status, detail, openEditModal } = useCatalogueProductDetail();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={goBack}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden />
          Back
        </Button>
        {status === "ready" && detail ? (
          <Button type="button" onClick={openEditModal}>
            Edit
          </Button>
        ) : null}
      </div>
      <DetailBody />
      <CatalogueProductEditModal />
    </div>
  );
}

export function CatalogueProductDetailPage({
  productId,
}: {
  productId: string;
}) {
  return (
    <CatalogueProductDetailProvider productId={productId}>
      <DetailChrome />
    </CatalogueProductDetailProvider>
  );
}
