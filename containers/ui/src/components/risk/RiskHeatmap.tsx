/**
 * RiskHeatmap – portfolio heatmap (account × risk category or similar) (Plan §6.3, §932).
 * Data from GET /api/v1/dashboards/executive (risk_heatmap) or risk-analytics portfolio.
 */

'use client';

export type RiskHeatmapSegment = {
  id: string;
  label?: string;
  riskScore: number;
};

export type RiskHeatmapProps = {
  segments: RiskHeatmapSegment[];
  totalAtRisk?: number;
  title?: string;
};

function colorForRisk(v: number): string {
  if (v < 0.33) return 'bg-emerald-500';
  if (v < 0.66) return 'bg-amber-400';
  return 'bg-red-500';
}

export function RiskHeatmap({
  segments,
  totalAtRisk,
  title = 'Risk by Segment',
}: RiskHeatmapProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {typeof totalAtRisk === 'number' && (
          <span className="text-xs text-gray-500">At risk: {totalAtRisk.toLocaleString()}</span>
        )}
      </div>
      {segments.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No segment data</p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
          {segments.map((s) => {
            const v = Math.min(1, Math.max(0, Number.isFinite(s.riskScore) ? s.riskScore : 0));
            return (
              <div
                key={s.id}
                className={`aspect-square rounded ${colorForRisk(v)} min-w-[24px]`}
                title={s.label ? `${s.label}: ${(v * 100).toFixed(0)}%` : `${s.id}: ${(v * 100).toFixed(0)}%`}
              />
            );
          })}
        </div>
      )}
      <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Low</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> Med</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> High</span>
      </div>
    </div>
  );
}
