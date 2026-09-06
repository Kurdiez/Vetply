'use client';

import { AppSidebarNav } from '@/components/app/AppSidebarNav';
import { DashboardShell } from '@/components/app/DashboardShell';
import { routes } from '@/constants/routes';
import type { ReactNode } from 'react';

type AppDashboardLayoutProps = {
  children?: ReactNode;
};

export function AppDashboardLayout({ children }: AppDashboardLayoutProps) {
  return (
    <DashboardShell
      homeHref={routes.app}
      topBarTitle="App"
      sidebar={(ctx) => <AppSidebarNav onNavigate={ctx.onNavigate} />}
    >
      {children}
    </DashboardShell>
  );
}
