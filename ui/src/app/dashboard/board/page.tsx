/**
 * Board dashboard (Plan §6.5, §932, §933).
 * Fetches GET /api/v1/dashboards/board and renders widgets via BoardDashboardContent.
 */

import Link from 'next/link';
import { BoardDashboardContent } from '@/components/dashboard/BoardDashboardContent';

export default function BoardDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Board Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        High-level KPIs. GET /api/v1/dashboards/board (Plan §4.5, §932).
      </p>
      <BoardDashboardContent />
      <div className="flex gap-4 mt-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <Link href="/dashboard/manager" className="text-sm font-medium hover:underline">Manager</Link>
        <Link href="/dashboard/executive" className="text-sm font-medium hover:underline">Executive</Link>
      </div>
    </div>
  );
}
