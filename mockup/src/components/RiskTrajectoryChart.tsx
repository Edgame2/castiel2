"use client";

import type React from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Horizons = {
  30?: { riskScore?: number; confidence?: number };
  60?: { riskScore?: number; confidence?: number };
  90?: { riskScore?: number; confidence?: number };
};

function colorForRisk(v: number): string {
  if (v < 0.33) {
    return "#22c55e";
  }
  if (v < 0.66) {
    return "#eab308";
  }
  return "#ef4444";
}

export function RiskTrajectoryChart({
  horizons,
  title = "Risk trajectory",
  height = 200,
}: {
  horizons: Horizons;
  title?: string;
  height?: number;
}): React.ReactElement {
  const keys = [30, 60, 90] as const;
  const chartData = keys.map((d) => {
    const h = horizons[d];
    const v =
      typeof h?.riskScore === "number"
        ? Math.min(1, Math.max(0, h.riskScore))
        : 0.5;
    return {
      name: `${d}d`,
      value: v,
      fill: colorForRisk(v),
    };
  });

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={chartData[i].fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
