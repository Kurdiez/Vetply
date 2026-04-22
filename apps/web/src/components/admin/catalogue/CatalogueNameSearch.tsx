"use client";

import { useCatalogueView } from "./CatalogueViewContext";

export function CatalogueNameSearch() {
  const { searchInput, setSearchInput } = useCatalogueView();

  return (
    <div className="max-w-md">
      <label
        htmlFor="catalogue-product-name-search"
        className="block text-sm font-medium text-gray-200"
      >
        Search products
      </label>
      <input
        id="catalogue-product-name-search"
        type="search"
        name="q"
        autoComplete="off"
        placeholder="Search by product name…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="mt-2 block w-full rounded-md border border-white/15 bg-gray-900/80 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}
