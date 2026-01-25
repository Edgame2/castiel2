/**
 * Executive (C-suite) dashboard (Plan §6.5, §932).
 * Fetches GET /api/v1/dashboards/executive and renders widgets via ExecutiveDashboardContent.
 */

import Link from 'next/link';
import { ExecutiveDashboardContent } from '@/components/dashboard/ExecutiveDashboardContent';

export default function ExecutiveDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Executive Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        C-suite: revenue at risk, forecast, competitive, risk by segment. GET /api/v1/dashboards/executive (Plan §4.5, §932).
      </p>
      <ExecutiveDashboardContent />
      <div className="flex gap-4 mt-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <Link href="/dashboard/manager" className="text-sm font-medium hover:underline">Manager</Link>
        <Link href="/dashboard/board" className="text-sm font-medium hover:underline">Board</Link>
      </div>
    </div>
  );
}
