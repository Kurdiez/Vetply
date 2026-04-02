"use client";

import { UserType } from "@vetply/shared";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import { DashboardShell } from "@/components/app/DashboardShell";
import { Button } from "@/components/ui/Button";
import { routes } from "@/constants/routes";
import { useMe } from "@/contexts/MeContext";
import { useRouter } from "next/router";
import { useEffect, type ReactNode } from "react";

type AdminGateProps = {
  children?: ReactNode;
};

export function AdminGate({ children }: AdminGateProps) {
  const router = useRouter();
  const { me, status, refetch } = useMe();

  useEffect(() => {
    if (status === "ready" && me && me.userType !== UserType.Super) {
      void router.replace(routes.home);
    }
  }, [status, me, router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-4 text-white">
        <p className="text-sm/6 text-gray-300">Something went wrong.</p>
        <Button type="button" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (status !== "ready" || !me) {
    return <div className="min-h-screen bg-gray-900" />;
  }

  if (me.userType !== UserType.Super) {
    return <div className="min-h-screen bg-gray-900" />;
  }

  return (
    <DashboardShell
      homeHref={routes.admin.root}
      topBarTitle="Admin App"
      topBarVariant="admin"
      sidebar={(ctx) => <AdminSidebarNav onNavigate={ctx.onNavigate} />}
    >
      {children}
    </DashboardShell>
  );
}
