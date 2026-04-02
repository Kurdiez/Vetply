"use client";

import { useRouter } from "next/router";
import type { ReactNode } from "react";
import {
  isAdminRoutePath,
  isAppRoutePath,
} from "@/constants/routes";
import { MeProvider } from "@/contexts/MeContext";

export function MeProviderShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const needsMe =
    isAppRoutePath(router.pathname) || isAdminRoutePath(router.pathname);

  if (!needsMe) {
    return <>{children}</>;
  }

  return <MeProvider>{children}</MeProvider>;
}
