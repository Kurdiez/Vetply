"use client";

import { DashboardShell } from "@/components/app/DashboardShell";
import { routes } from "@/constants/routes";

export function AppDashboardLayout() {
  return <DashboardShell homeHref={routes.app} />;
}
