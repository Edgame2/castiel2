/**
 * WinProbabilityGauge – win prob 0–1 + optional CI (Plan §6.3, §890).
 * Higher is better: green ≥0.66, yellow 0.33–0.66, red &lt;0.33.
 */

'use client';

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export type WinProbabilityGaugeProps = {
  /** Win probability 0–1 */
  value: number;
  /** Optional confidence interval [low, high] both 0–1 */
  ci?: [number, number];
  /** Optional label */
  label?: string;
  /** Approximate height in pixels */
  size?: number;
};

function colorForWinProb(v: number): string {
  if (v >= 0.66) return '#22c55e';
  if (v >= 0.33) return '#eab308';
  return '#ef4444';
}

export function WinProbabilityGauge({
  value,
  ci,
  label = 'Win probability',
  size = 140,
}: WinProbabilityGaugeProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const pct = Math.round(clamped * 100);
  const data = [{ value: pct, fill: colorForWinProb(clamped) }];

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      <ResponsiveContainer width="100%" height={size}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar background={{ fill: '#e5e7eb' }} dataKey="value" />
        </RadialBarChart>
      </ResponsiveContainer>
      <span className="text-lg font-semibold tabular-nums">{pct}%</span>
      {ci && Array.isArray(ci) && ci.length >= 2 && (
        <span className="text-xs text-gray-500 tabular-nums">
          {Math.round(ci[0] * 100)}–{Math.round(ci[1] * 100)}%
        </span>
      )}
    </div>
  );
}
