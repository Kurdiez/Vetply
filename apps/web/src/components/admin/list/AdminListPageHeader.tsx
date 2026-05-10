'use client';

import type { ReactNode } from 'react';

type AdminListPageHeaderProps = {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
};

export function AdminListPageHeader({
  title,
  description,
  actions,
}: AdminListPageHeaderProps) {
  return (
    <div className="sm:flex sm:items-center">
      <div className="sm:flex-auto">
        <h1 className="text-base font-semibold text-white">{title}</h1>
        <div className="mt-2 text-sm text-gray-300">{description}</div>
      </div>
      {actions !== undefined && actions !== null && (
        <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:ml-16 sm:flex-none sm:flex-row sm:items-center">
          {actions}
        </div>
      )}
    </div>
  );
}
