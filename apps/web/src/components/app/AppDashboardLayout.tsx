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
import { useState } from "react";
import { useMe } from "@/contexts/MeContext";
import { clearStoredAccessToken } from "@/utils/vetply-api/storage";

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

export function AppDashboardLayout() {
  const router = useRouter();
  const { me, status, refetch } = useMe();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function signOut() {
    clearStoredAccessToken();
    void router.push("/sign-in");
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-4 text-white">
        <p className="text-sm/6 text-gray-300">Something went wrong.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-400"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status !== "ready" || !me) {
    return <div className="min-h-screen bg-gray-900" />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
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
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 cursor-pointer p-2.5"
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon aria-hidden className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>

            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10 before:pointer-events-none before:absolute before:inset-0 before:bg-black/10">
              <div className="relative flex shrink-0 items-start pt-5 pb-2">
                <Link href="/app" onClick={() => setSidebarOpen(false)}>
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
              <SidebarNavShell />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden bg-gray-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/10 bg-black/10 px-6 pb-4">
          <div className="flex shrink-0 items-start pt-5 pb-2">
            <Link href="/app">
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
          <SidebarNavShell />
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/10 bg-gray-900 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 cursor-pointer p-2.5 text-gray-400 hover:text-white lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden className="size-6" />
          </button>

          <div
            aria-hidden
            className="h-6 w-px bg-white/10 lg:hidden"
          />

          <div className="flex flex-1 items-center justify-end gap-x-4 self-stretch lg:gap-x-6">
            <Menu as="div" className="relative flex items-center">
              <MenuButton className="relative flex cursor-pointer items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
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
                className="z-50 w-40 origin-top-right rounded-md bg-gray-800 py-2 outline-1 -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <MenuItem>
                  {({ focus }) => (
                    <Link
                      href="/app"
                      className={classNames(
                        focus ? "bg-white/5" : "",
                        "block px-3 py-1 text-sm/6 text-white",
                      )}
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
                      className={classNames(
                        focus ? "bg-white/5" : "",
                        "block w-full cursor-pointer px-3 py-1 text-left text-sm/6 text-white",
                      )}
                    >
                      Sign out
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8" />
        </main>
      </div>
    </div>
  );
}
