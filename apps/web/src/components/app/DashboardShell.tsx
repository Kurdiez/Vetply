"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type ReactNode } from "react";
import { routes } from "@/constants/routes";
import { useMe } from "@/contexts/MeContext";
import { Button } from "@/components/ui/Button";
import {
  dropdownMenuItemLinkClassName,
  dropdownMenuItemRowClassName,
  dropdownMenuItemsClassName,
  menuButtonClassName,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/IconButton";
import { clearStoredAccessToken } from "@/utils/vetply-api/storage";

export type DashboardSidebarRenderContext = {
  onNavigate: () => void;
};

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function SidebarNavShell() {
  return (
    <nav className="relative flex flex-1 flex-col" aria-label="Workspace">
      <ul role="list" className="flex flex-1 flex-col gap-y-7" />
    </nav>
  );
}

type DashboardShellProps = {
  homeHref: string;
  children?: ReactNode;
  topBarTitle?: string;
  topBarVariant?: "default" | "admin";
  sidebar?:
    | ReactNode
    | ((ctx: DashboardSidebarRenderContext) => ReactNode);
};

export function DashboardShell({
  homeHref,
  children,
  topBarTitle,
  topBarVariant = "default",
  sidebar,
}: DashboardShellProps) {
  const router = useRouter();
  const { me, status, refetch } = useMe();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function signOut() {
    clearStoredAccessToken();
    void router.push(routes.signIn);
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen w-full min-w-0 flex-col items-center justify-center gap-4 overflow-x-hidden bg-gray-900 px-4 text-white">
        <p className="text-sm/6 text-gray-300">Something went wrong.</p>
        <Button type="button" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (status !== "ready" || !me) {
    return (
      <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-gray-900" />
    );
  }

  const topBarToneClasses =
    topBarVariant === "admin"
      ? "border-b border-emerald-500/35 bg-emerald-950 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.14)]"
      : "border-white/10 bg-gray-900";

  const closeMobileSidebar = () => setSidebarOpen(false);
  const sidebarContent =
    sidebar === undefined ? (
      <SidebarNavShell />
    ) : typeof sidebar === "function" ? (
      sidebar({ onNavigate: closeMobileSidebar })
    ) : (
      sidebar
    );

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-gray-900">
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
        transition
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <IconButton
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  tone="default"
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon aria-hidden className="size-6 text-white" />
                </IconButton>
              </div>
            </TransitionChild>

            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10 before:pointer-events-none before:absolute before:inset-0 before:bg-black/10">
              <div className="relative flex shrink-0 items-start pt-5 pb-2">
                <Link href={homeHref} onClick={() => setSidebarOpen(false)}>
                  <span className="sr-only">Vetply</span>
                  <img
                    src="/long-logo.svg"
                    alt="Vetply"
                    width={680}
                    height={269}
                    className="h-12 w-auto"
                    fetchPriority="high"
                    decoding="async"
                  />
                </Link>
              </div>
              {sidebarContent}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden bg-gray-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/10 bg-black/10 px-6 pb-4">
          <div className="flex shrink-0 items-start pt-5 pb-2">
            <Link href={homeHref}>
              <span className="sr-only">Vetply</span>
              <img
                src="/long-logo.svg"
                alt="Vetply"
                width={680}
                height={269}
                className="h-12 w-auto"
                fetchPriority="high"
                decoding="async"
              />
            </Link>
          </div>
          {sidebarContent}
        </div>
      </div>

      <div className="lg:pl-72">
        <div
          className={classNames(
            "sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b px-4 sm:gap-x-6 sm:px-6 lg:px-8",
            topBarToneClasses,
          )}
        >
          <IconButton
            type="button"
            onClick={() => setSidebarOpen(true)}
            tone="subtle"
            className="lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden className="size-6" />
          </IconButton>

          <div
            aria-hidden
            className="h-6 w-px bg-white/10 lg:hidden"
          />

          <div className="flex min-w-0 flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
            {topBarTitle ? (
              <p
                className={classNames(
                  "min-w-0 flex-1 truncate text-base font-semibold tracking-tight",
                  topBarVariant === "admin" ? "text-emerald-50" : "text-white",
                )}
              >
                {topBarTitle}
              </p>
            ) : (
              <div className="min-w-0 flex-1" aria-hidden />
            )}

            <div className="flex shrink-0 items-center">
            <Menu as="div" className="relative flex items-center">
              <MenuButton className={menuButtonClassName}>
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open user menu</span>
                <img
                  src="/avatar-placeholder.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full object-cover outline -outline-offset-1 outline-white/10"
                  decoding="async"
                />
                <span className="hidden lg:flex lg:items-center">
                  <span
                    aria-hidden
                    className="ml-4 text-sm/6 font-semibold text-white"
                  >
                    {me.firstName}
                  </span>
                  <ChevronDownIcon
                    aria-hidden
                    className="ml-2 size-5 text-gray-500"
                  />
                </span>
              </MenuButton>
              <MenuItems
                anchor={{ to: "bottom end", gap: "0.625rem" }}
                portal
                transition
                className={dropdownMenuItemsClassName}
              >
                <MenuItem>
                  {({ focus }) => (
                    <Link
                      href={homeHref}
                      className={dropdownMenuItemLinkClassName(focus)}
                    >
                      Your profile
                    </Link>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={signOut}
                      className={dropdownMenuItemRowClassName(focus)}
                    >
                      Sign out
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Menu>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
