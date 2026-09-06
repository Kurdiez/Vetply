'use client';

import { AppDashboardLayout } from '@/components/app/AppDashboardLayout';

export default function AppPage() {
  return (
    <AppDashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-base/7 font-semibold text-white">Workspace</h1>
        <p className="mt-2 text-sm/6 text-gray-300">
          Open AI Insights from the sidebar to ask catalogue buying questions.
        </p>
      </div>
    </AppDashboardLayout>
  );
}
