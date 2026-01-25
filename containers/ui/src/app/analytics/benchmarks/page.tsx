/**
 * Industry benchmarks (Plan §6.5, §953).
 * Compare to industry percentiles. Data: GET /api/v1/industries/:id/benchmarks,
 * GET /api/v1/opportunities/:id/benchmark-comparison.
 */

import Link from 'next/link';
import { BenchmarkComparison } from '@/components/analytics/BenchmarkComparison';

const sampleDealSizePercentiles = { p10: 50000, p25: 75000, p50: 100000, p75: 130000, p90: 180000 };
const sampleWinRatePercentiles = { p10: 0.35, p25: 0.45, p50: 0.55, p75: 0.65, p90: 0.78 };

export default function IndustryBenchmarksPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <Link href="/analytics/competitive" className="text-sm font-medium hover:underline">
          Competitive
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Industry benchmarks</h1>
      <p className="text-muted-foreground mb-6">
        Compare to industry percentiles (P10–P90). Plan §6.5, §953. Select industry when wired to GET /api/v1/industries/:id/benchmarks.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <BenchmarkComparison
            percentiles={sampleDealSizePercentiles}
            metricLabel="Deal size"
            currentValue={120000}
            title="Deal size (P10–P90)"
          />
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <BenchmarkComparison
            percentiles={sampleWinRatePercentiles}
            metricLabel="Win rate"
            title="Win rate (P10–P90)"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        API: risk-analytics GET /api/v1/industries/:industryId/benchmarks (period?), GET /api/v1/opportunities/:opportunityId/benchmark-comparison.
      </p>
    </div>
  );
}
