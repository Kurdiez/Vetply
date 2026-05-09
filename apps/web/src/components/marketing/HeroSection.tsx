'use client';

import { HeroImagePanel } from '@/components/marketing/HeroImagePanel';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { routes } from '@/constants/routes';
import { Dialog, DialogPanel } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useState } from 'react';

const navigation = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'Sign in', href: routes.signIn },
];

export function HeroSection() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-w-0 overflow-x-clip bg-gray-900">
      <header className="absolute inset-x-0 top-0 z-50 min-w-0 max-w-full">
        <div className="mx-auto max-w-7xl">
          <div className="px-6 pt-4 sm:pt-6 lg:max-w-2xl lg:pr-0 lg:pl-8">
            <nav
              aria-label="Global"
              className="flex items-center justify-between lg:justify-start"
            >
              <Link href={routes.home} className="-m-1.5 shrink-0 p-1.5">
                <span className="sr-only">Vetply</span>
                <img
                  src="/logo.svg"
                  alt="Vetply"
                  width={160}
                  height={40}
                  className="h-14 w-auto sm:h-10"
                  fetchPriority="high"
                  decoding="async"
                />
              </Link>

              <IconButton
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden"
              >
                <span className="sr-only">Open main menu</span>
                <Bars3Icon aria-hidden className="size-6" />
              </IconButton>
              <div className="hidden lg:ml-12 lg:flex lg:gap-x-14">
                {navigation.map((item) =>
                  item.href.startsWith('/') ? (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-sm/6 font-semibold text-white"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-sm/6 font-semibold text-white"
                    >
                      {item.name}
                    </a>
                  ),
                )}
              </div>
            </nav>
          </div>
        </div>
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="lg:hidden"
        >
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 px-6 pt-4 pb-6 sm:max-w-sm sm:pt-6 sm:ring-1 sm:ring-gray-100/10">
            <div className="flex items-center justify-between">
              <Link
                href={routes.home}
                className="-m-1.5 p-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Vetply</span>
                <img
                  src="/logo.svg"
                  alt=""
                  width={280}
                  height={70}
                  className="h-14 w-auto sm:h-16"
                  decoding="async"
                />
              </Link>
              <IconButton
                type="button"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden className="size-6" />
              </IconButton>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-white/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) =>
                    item.href.startsWith('/') ? (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        key={item.name}
                        href={item.href}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </a>
                    ),
                  )}
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>

      <div className="relative min-w-0 overflow-x-clip">
        <div className="mx-auto max-w-7xl min-w-0">
          <div className="relative z-10 pt-14 lg:w-full lg:max-w-2xl">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
              className="absolute inset-y-0 right-8 hidden h-full w-80 translate-x-1/2 fill-gray-900 lg:block"
            >
              <polygon points="0,0 90,0 50,100 0,100" />
            </svg>

            <div className="relative px-6 py-20 sm:py-40 lg:px-8 lg:py-56 lg:pr-0">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl">
                <div className="hidden sm:mb-10 sm:flex">
                  <div className="relative rounded-full px-3 py-1 text-sm/6 text-gray-400 ring-1 ring-white/10 hover:ring-white/20">
                    Supplier pricing, your contract discounts, and rebates —
                    finally in sync.{' '}
                    <a
                      href="#features"
                      className="font-semibold whitespace-nowrap text-primary-100"
                    >
                      <span aria-hidden className="absolute inset-0" />
                      See how it works <span aria-hidden>&rarr;</span>
                    </a>
                  </div>
                </div>
                <h1 className="text-5xl font-semibold tracking-tight text-pretty text-white sm:text-7xl">
                  Optimize supply spend for your vet clinic
                </h1>
                <p className="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
                  Vetply brings together prices on thousands of products from
                  many suppliers and layers on{' '}
                  <span className="text-gray-300">your</span> reality — custom
                  discounts, manufacturer rebates, and one-off deals — so you
                  are not rebuilding spreadsheets every week.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <Button href={routes.signUp}>Get started</Button>
                  <a
                    href="#features"
                    className="text-sm/6 font-semibold text-white"
                  >
                    Learn more <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <HeroImagePanel />
      </div>
    </div>
  );
}
