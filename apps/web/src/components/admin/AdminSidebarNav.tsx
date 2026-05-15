'use client';

import { SidebarNavButton } from '@/components/ui/SidebarNavButton';
import {
  isUnderAdminCatalogue,
  parseCatalogueProductDetailId,
  routes,
} from '@/constants/routes';
import { pathWithoutQueryAndTrailingSlash } from '@/utils/admin-path';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { RectangleStackIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type AdminSidebarNavProps = {
  onNavigate?: () => void;
};

function NavLink({
  href,
  active,
  children,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const handleClick = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={classNames(
        'block rounded-md py-2 pr-2 pl-9 text-sm/6',
        active
          ? 'bg-white/5 font-medium text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-white',
      )}
    >
      {children}
    </Link>
  );
}

export function AdminSidebarNav({ onNavigate }: AdminSidebarNavProps) {
  const router = useRouter();
  const panelId = useId();
  const [catalogueOpen, setCatalogueOpen] = useState(true);
  const path = pathWithoutQueryAndTrailingSlash(router.asPath);

  useEffect(() => {
    if (isUnderAdminCatalogue(path)) {
      setCatalogueOpen(true);
    }
  }, [path]);

  const isCatalogueActive = isUnderAdminCatalogue(path);

  return (
    <nav className="relative flex flex-1 flex-col" aria-label="Admin">
      <ul role="list" className="flex flex-1 flex-col gap-y-1">
        <li>
          <SidebarNavButton
            id={`${panelId}-trigger`}
            aria-expanded={catalogueOpen}
            aria-controls={panelId}
            active={isCatalogueActive}
            onClick={() => setCatalogueOpen((o) => !o)}
          >
            <RectangleStackIcon
              aria-hidden
              className="size-5 shrink-0 text-gray-400 group-hover:text-white"
            />
            <span className="flex-1">Catalogue</span>
            <ChevronRightIcon
              aria-hidden
              className={classNames(
                'size-4 shrink-0 text-gray-500 transition duration-200',
                catalogueOpen ? 'rotate-90' : '',
              )}
            />
          </SidebarNavButton>
          <ul
            id={panelId}
            role="list"
            hidden={!catalogueOpen}
            className="mt-1 space-y-0.5"
          >
            <li>
              <NavLink
                href={routes.admin.catalogue.view}
                active={
                  path === routes.admin.catalogue.view ||
                  parseCatalogueProductDetailId(path) !== null
                }
                onNavigate={onNavigate}
              >
                View Catalogue
              </NavLink>
            </li>
            <li>
              <NavLink
                href={routes.admin.catalogue.supplierListings}
                active={path === routes.admin.catalogue.supplierListings}
                onNavigate={onNavigate}
              >
                View Supplier Listings
              </NavLink>
            </li>
            <li>
              <NavLink
                href={routes.admin.catalogue.mappingExportsImports}
                active={path === routes.admin.catalogue.mappingExportsImports}
                onNavigate={onNavigate}
              >
                Mapping exports / imports
              </NavLink>
            </li>
            <li>
              <NavLink
                href={routes.admin.catalogue.importSupplierPrices}
                active={path === routes.admin.catalogue.importSupplierPrices}
                onNavigate={onNavigate}
              >
                Import supplier listing files
              </NavLink>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  );
}
