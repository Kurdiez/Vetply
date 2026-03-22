"use client";

import { AppDashboardLayout } from "@/components/app/AppDashboardLayout";
import { MeProvider } from "@/contexts/MeContext";

export default function AppPage() {
  return (
    <MeProvider>
      <AppDashboardLayout />
    </MeProvider>
  );
}
