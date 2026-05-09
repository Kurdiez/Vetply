'use client';

import { PhotoIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

type Presentation = 'table' | 'detail';

function ProductImagePlaceholder({
  presentation,
}: {
  presentation: Presentation;
}) {
  const isDetail = presentation === 'detail';
  return (
    <span
      className={
        isDetail
          ? 'inline-flex h-64 w-full max-w-sm items-center justify-center rounded-lg border border-white/10 bg-gray-700/90 text-gray-500'
          : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-gray-700/90 text-gray-500'
      }
      aria-hidden
    >
      <PhotoIcon
        className={isDetail ? 'size-16' : 'size-6'}
        strokeWidth={1.5}
      />
    </span>
  );
}

type Props = {
  imageUrl: string | null;
  productName: string;
  /** `table`: list row thumbnail. `detail`: larger product page image. */
  presentation?: Presentation;
};

export function CatalogueProductThumbnail({
  imageUrl,
  productName,
  presentation = 'table',
}: Props) {
  const [broken, setBroken] = useState(false);
  const trimmed = imageUrl?.trim() ?? '';
  const isDetail = presentation === 'detail';
  if (trimmed === '' || broken) {
    return <ProductImagePlaceholder presentation={presentation} />;
  }
  return (
    <img
      src={trimmed}
      alt={productName}
      className={
        isDetail
          ? 'h-64 w-full max-w-sm rounded-lg border border-white/10 bg-gray-900/40 object-contain'
          : 'h-10 w-10 shrink-0 rounded-md border border-white/10 object-cover'
      }
      onError={() => setBroken(true)}
    />
  );
}
