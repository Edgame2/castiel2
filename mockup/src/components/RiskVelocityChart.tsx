"use client";

import type React from "react";

const VELOCITY_SCALE = 0.02;

export function RiskVelocityChart({
  velocity,
  acceleration,
  dataPoints,
  title = "Risk velocity",
}: {
  velocity: number;
  acceleration?: number;
  dataPoints: number;
  title?: string;
}): React.ReactElement {
  const isPositive = velocity > 0.001;
  const isNegative = velocity < -0.001;
  const pct = (velocity * 100).toFixed(2);
  const pctSigned = velocity >= 0 ? `+${pct}` : pct;
  const label = isPositive
    ? "Risk increasing"
    : isNegative
      ? "Risk decreasing"
      : "Stable";
  const meterPos = Math.max(-1, Math.min(1, velocity / VELOCITY_SCALE));
  const left = 50 + meterPos * 50;

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div
        className={
          isPositive
            ? "text-amber-600 dark:text-amber-400"
            : isNegative
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
        }
      >
        <span className="text-2xl font-semibold tabular-nums">{pctSigned}%/day</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <div className="relative h-2 mt-3 bg-secondary rounded-full">
        <div
          className="absolute top-0 w-2 h-2 -ml-1 rounded-full bg-primary"
          style={{ left: `${Math.max(0, Math.min(100, left))}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>Decreasing</span>
        <span>Increasing</span>
      </div>
      {typeof acceleration === "number" && (
        <p className="text-xs text-muted-foreground mt-2">
          Acceleration: {acceleration >= 0 ? "+" : ""}
          {(acceleration * 100).toFixed(3)}%/day²
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">Based on {dataPoints} snapshots</p>
    </div>
  );
}
