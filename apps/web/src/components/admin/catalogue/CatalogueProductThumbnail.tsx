"use client";

import { PhotoIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

function ProductImagePlaceholder() {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-gray-700/90 text-gray-500"
      aria-hidden
    >
      <PhotoIcon className="size-6" strokeWidth={1.5} />
    </span>
  );
}

type Props = {
  imageUrl: string | null;
  productName: string;
};

export function CatalogueProductThumbnail({ imageUrl, productName }: Props) {
  const [broken, setBroken] = useState(false);
  const trimmed = imageUrl?.trim() ?? "";
  if (trimmed === "" || broken) {
    return <ProductImagePlaceholder />;
  }
  return (
    <img
      src={trimmed}
      alt={productName}
      className="h-10 w-10 shrink-0 rounded-md border border-white/10 object-cover"
      onError={() => setBroken(true)}
    />
  );
}
