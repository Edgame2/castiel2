"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

function colorForValue(v: number): string {
  if (v < 0.33) return "#22c55e";
  if (v < 0.66) return "#eab308";
  return "#ef4444";
}

export function RiskGauge({
  value,
  label = "Risk",
  size = 140,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const pct = Math.round(clamped * 100);
  const data = [{ value: pct, fill: colorForValue(clamped) }];

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
          <RadialBar background={{ fill: "#e5e7eb" }} dataKey="value" />
        </RadialBarChart>
      </ResponsiveContainer>
      <span className="text-lg font-semibold tabular-nums">{pct}%</span>
    </div>
  );
}
