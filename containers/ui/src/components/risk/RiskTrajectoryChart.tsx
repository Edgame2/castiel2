/**
 * RiskTrajectoryChart – 30/60/90-day risk predictions (Plan §6.3, §890).
 * Data from risk-analytics GET /api/v1/opportunities/:id/risk-predictions.
 */

'use client';

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type RiskTrajectoryHorizons = {
  30?: { riskScore?: number; confidence?: number };
  60?: { riskScore?: number; confidence?: number };
  90?: { riskScore?: number; confidence?: number };
};

export type RiskTrajectoryChartProps = {
  horizons: RiskTrajectoryHorizons;
  predictionDate?: string | null;
  title?: string;
  height?: number;
};

function colorForRisk(v: number): string {
  if (v < 0.33) return '#22c55e';
  if (v < 0.66) return '#eab308';
  return '#ef4444';
}

export function RiskTrajectoryChart({
  horizons,
  predictionDate,
  title = 'Risk trajectory',
  height = 200,
}: RiskTrajectoryChartProps) {
  const keys = [30, 60, 90] as const;
  const chartData = keys.map((d) => {
    const h = horizons[d];
    const v = typeof h?.riskScore === 'number' ? Math.min(1, Math.max(0, h.riskScore)) : 0.5;
    return { name: `${d}d`, value: v, confidence: h?.confidence, fill: colorForRisk(v) };
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {predictionDate && <span className="text-xs text-gray-500">{predictionDate.slice(0, 10)}</span>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
          <Tooltip
            formatter={(v: number, _name: string, props: { payload?: { confidence?: number } }) =>
              [typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : v, 'Risk']
            }
            labelFormatter={(n) => n}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload ?? payload[0];
              return (
                <div className="rounded border bg-white dark:bg-gray-800 px-2 py-1.5 text-xs shadow">
                  <div>{p.name}: {(p.value * 100).toFixed(0)}% risk</div>
                  {typeof p.confidence === 'number' && <div className="text-gray-500">Confidence: {(p.confidence * 100).toFixed(0)}%</div>}
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={chartData[i].fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
