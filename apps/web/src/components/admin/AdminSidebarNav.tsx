'use client';

import { SidebarNavButton } from '@/components/ui/SidebarNavButton';
import {
  isUnderAdminCatalogue,
  isUnderAdminManufacturers,
  parseCatalogueProductDetailId,
  routes,
} from '@/constants/routes';
import { pathWithoutQueryAndTrailingSlash } from '@/utils/admin-path';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import {
  BuildingOffice2Icon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
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
  const cataloguePanelId = useId();
  const manufacturersPanelId = useId();
  const [catalogueOpen, setCatalogueOpen] = useState(true);
  const [manufacturersOpen, setManufacturersOpen] = useState(true);
  const path = pathWithoutQueryAndTrailingSlash(router.asPath);

  useEffect(() => {
    if (isUnderAdminCatalogue(path)) {
      setCatalogueOpen(true);
    }
    if (isUnderAdminManufacturers(path)) {
      setManufacturersOpen(true);
    }
  }, [path]);

  const isCatalogueActive = isUnderAdminCatalogue(path);
  const isManufacturersActive = isUnderAdminManufacturers(path);

  return (
    <nav className="relative flex flex-1 flex-col" aria-label="Admin">
      <ul role="list" className="flex flex-1 flex-col gap-y-1">
        <li>
          <SidebarNavButton
            id={`${cataloguePanelId}-trigger`}
            aria-expanded={catalogueOpen}
            aria-controls={cataloguePanelId}
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
            id={cataloguePanelId}
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
        <li>
          <SidebarNavButton
            id={`${manufacturersPanelId}-trigger`}
            aria-expanded={manufacturersOpen}
            aria-controls={manufacturersPanelId}
            active={isManufacturersActive}
            onClick={() => setManufacturersOpen((o) => !o)}
          >
            <BuildingOffice2Icon
              aria-hidden
              className="size-5 shrink-0 text-gray-400 group-hover:text-white"
            />
            <span className="flex-1">Manufacturers</span>
            <ChevronRightIcon
              aria-hidden
              className={classNames(
                'size-4 shrink-0 text-gray-500 transition duration-200',
                manufacturersOpen ? 'rotate-90' : '',
              )}
            />
          </SidebarNavButton>
          <ul
            id={manufacturersPanelId}
            role="list"
            hidden={!manufacturersOpen}
            className="mt-1 space-y-0.5"
          >
            <li>
              <NavLink
                href={routes.admin.manufacturers.view}
                active={path === routes.admin.manufacturers.view}
                onNavigate={onNavigate}
              >
                View Manufacturers
              </NavLink>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  );
}
