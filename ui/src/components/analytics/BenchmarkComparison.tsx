/**
 * BenchmarkComparison – bar/radar vs industry percentiles (Plan §6.3, §953).
 * Data from GET /api/v1/industries/:id/benchmarks, GET /api/v1/opportunities/:id/benchmark-comparison.
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export type Percentiles = {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

export type BenchmarkComparisonProps = {
  percentiles: Percentiles;
  metricLabel?: string;
  /** Optional: current or opportunity value to compare (shows reference line) */
  currentValue?: number;
  title?: string;
  height?: number;
};

export function BenchmarkComparison({
  percentiles,
  metricLabel = 'Value',
  currentValue,
  title = 'Industry benchmark',
  height = 220,
}: BenchmarkComparisonProps) {
  const data = [
    { name: 'P10', value: percentiles.p10 },
    { name: 'P25', value: percentiles.p25 },
    { name: 'P50', value: percentiles.p50 },
    { name: 'P75', value: percentiles.p75 },
    { name: 'P90', value: percentiles.p90 },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {currentValue != null && (
          <span className="text-xs text-gray-500">You: {typeof currentValue === 'number' ? (metricLabel.includes('Rate') ? `${(currentValue * 100).toFixed(0)}%` : currentValue.toLocaleString()) : String(currentValue)}</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (metricLabel.includes('Rate') ? `${(v * 100).toFixed(0)}%` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
          <Tooltip
            formatter={(v: number | undefined) => [v != null ? (metricLabel.includes('Rate') ? `${(v * 100).toFixed(1)}%` : v) : '—', metricLabel]}
            labelFormatter={(n) => n}
          />
          <Bar dataKey="value" fill="#8b5cf6" radius={[2, 2, 0, 0]} name={metricLabel} />
          {typeof currentValue === 'number' && (
            <ReferenceLine y={currentValue} stroke="#ef4444" strokeDasharray="3 3" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
