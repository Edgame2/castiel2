/**
 * Manager dashboard (Plan §6.2, §889, §890, §891).
 * RecommendedTodayCard (GET /prioritized) + ManagerDashboardContent (GET /api/v1/dashboards/manager).
 */

import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { ManagerDashboardContent } from '@/components/dashboard/ManagerDashboardContent';
import { RecommendedTodayCard } from '@/components/dashboard/RecommendedTodayCard';

export default function ManagerDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manager Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Team, pipeline, risk, early warning. GET /api/v1/dashboards/manager (Plan §4.5, §891).
      </p>
      <DashboardGrid>
        <RecommendedTodayCard title="Recommended today" />
        <ManagerDashboardContent />
      </DashboardGrid>
    </div>
  );
}
