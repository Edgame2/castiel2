/**
 * RiskVelocityChart – velocity and acceleration (Plan §6.3, §890).
 * Data from risk-analytics GET /api/v1/opportunities/:id/risk-velocity.
 * velocity = change in riskScore per day (positive = risk increasing); acceleration = change in velocity per day.
 */

'use client';

export type RiskVelocityChartProps = {
  velocity: number;
  acceleration?: number;
  dataPoints: number;
  title?: string;
};

const VELOCITY_SCALE = 0.02; // ±0.02/day as full scale for the meter

export function RiskVelocityChart({
  velocity,
  acceleration,
  dataPoints,
  title = 'Risk velocity',
}: RiskVelocityChartProps) {
  const isPositive = velocity > 0.001;
  const isNegative = velocity < -0.001;
  const pct = (velocity * 100).toFixed(2);
  const pctSigned = velocity >= 0 ? `+${pct}` : pct;
  const label = isPositive ? 'Risk increasing' : isNegative ? 'Risk decreasing' : 'Stable';

  const meterPos = Math.max(-1, Math.min(1, velocity / VELOCITY_SCALE));
  const left = 50 + meterPos * 50;

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="text-2xl font-semibold tabular-nums">
        <span
          className={
            isPositive
              ? 'text-amber-600 dark:text-amber-400'
              : isNegative
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-600 dark:text-gray-400'
          }
        >
          {pctSigned}%/day
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <div className="relative h-2 mt-3 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div
          className="absolute top-0 w-2 h-2 -ml-1 rounded-full bg-gray-600 dark:bg-gray-300"
          style={{ left: `${Math.max(0, Math.min(100, left))}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>Decreasing</span>
        <span>Increasing</span>
      </div>
      {typeof acceleration === 'number' && (
        <p className="text-xs text-gray-500 mt-2">
          Acceleration: {acceleration >= 0 ? '+' : ''}
          {(acceleration * 100).toFixed(3)}%/day²
        </p>
      )}
      <p className="text-xs text-gray-400 mt-1">Based on {dataPoints} snapshots</p>
    </div>
  );
}
