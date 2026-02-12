/**
 * AccountHealthCard – health score, trend, critical opportunities (Plan §6.3, §917).
 * Data from risk-analytics GET /api/v1/accounts/:id/health.
 */

'use client';

import Link from 'next/link';

export type AccountHealthCardProps = {
  healthScore: number;
  trend?: 'improving' | 'stable' | 'degrading';
  criticalOpportunities?: string[];
  lastUpdated?: string;
  title?: string;
  /** Base path for opportunity links; e.g. /opportunities */
  opportunitiesBasePath?: string;
};

const trendClass: Record<string, string> = {
  improving: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  stable: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  degrading: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

function colorForHealth(v: number): string {
  if (v >= 0.66) return '#22c55e';
  if (v >= 0.33) return '#eab308';
  return '#ef4444';
}

export function AccountHealthCard({
  healthScore,
  trend,
  criticalOpportunities = [],
  lastUpdated,
  title = 'Account health',
  opportunitiesBasePath = '/opportunities',
}: AccountHealthCardProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(healthScore) ? healthScore : 0.5));
  const pct = Math.round(clamped * 100);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {trend && (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${trendClass[trend] ?? trendClass.stable}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: colorForHealth(clamped) }}
        >
          {pct}%
        </span>
        <span className="text-sm text-gray-500">health</span>
      </div>
      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-1">Updated {lastUpdated.slice(0, 10)}</p>
      )}
      {criticalOpportunities.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Critical opportunities</p>
          <ul className="space-y-1">
            {criticalOpportunities.slice(0, 5).map((oppId) => (
              <li key={oppId}>
                <Link
                  href={`${opportunitiesBasePath}/${oppId}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {oppId}
                </Link>
              </li>
            ))}
            {criticalOpportunities.length > 5 && (
              <li className="text-xs text-gray-500">+{criticalOpportunities.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
