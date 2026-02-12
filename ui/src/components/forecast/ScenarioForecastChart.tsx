/**
 * ScenarioForecastChart – P10/P50/P90 (Plan §6.3, §890).
 * Data from forecasting GET /api/v1/forecasts/:period/scenarios.
 */

'use client';

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type ScenarioForecastChartProps = {
  period: string;
  p10: number;
  p50: number;
  p90: number;
  /** Optional best/base/worst (scenario, forecast, probability) */
  scenarios?: Array<{ scenario: string; forecast: number; probability: number }>;
  title?: string;
  height?: number;
};

export function ScenarioForecastChart({
  period,
  p10,
  p50,
  p90,
  title = 'Scenario forecast',
  height = 200,
}: ScenarioForecastChartProps) {
  const chartData = [
    { name: 'P10', value: p10, fill: '#94a3b8' },
    { name: 'P50', value: p50, fill: '#3b82f6' },
    { name: 'P90', value: p90, fill: '#94a3b8' },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-gray-500">{period}</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}k`)} />
          <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : '—', 'Forecast']} labelFormatter={(n) => n} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={chartData[i].fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
