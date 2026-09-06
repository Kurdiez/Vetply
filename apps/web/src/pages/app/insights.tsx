'use client';

import { AppDashboardLayout } from '@/components/app/AppDashboardLayout';
import { InsightsChatViewPage } from '@/components/insights/InsightsChatViewPage';

export default function AppInsightsPage() {
  return (
    <AppDashboardLayout>
      <InsightsChatViewPage />
    </AppDashboardLayout>
  );
}
