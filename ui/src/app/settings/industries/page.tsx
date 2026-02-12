/**
 * Industry settings (Plan §6.2, §6.5): industry list and tenant enable/disable (if in UI).
 * Benchmarks: GET /api/v1/industries/:industryId/benchmarks (risk-analytics).
 * List/enable API TBD (configuration-service or risk-analytics).
 */

import Link from 'next/link';

export default function IndustrySettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Industry settings</h1>
      <p className="text-muted-foreground mb-6">
        Industry list and tenant enable/disable. Plan §6.2, §6.5.
      </p>
      <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 max-w-2xl">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Industry list and per-tenant enable/disable to be wired when GET /api/v1/industries (or
          equivalent) is available from configuration-service or risk-analytics. Benchmarks:
          GET /api/v1/industries/:industryId/benchmarks (risk-analytics).
        </p>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        <Link href="/analytics/benchmarks" className="font-medium hover:underline">
          → Industry benchmarks
        </Link>
      </p>
    </div>
  );
}
