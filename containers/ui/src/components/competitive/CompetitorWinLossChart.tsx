/**
 * CompetitorWinLossChart – win/loss by competitor (Plan §6.3, §936).
 * Data from risk-analytics GET /api/v1/analytics/competitive-win-loss.
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type WinLossByCompetitor = {
  competitorId: string;
  competitorName: string;
  wins: number;
  losses: number;
  winRate: number;
};

export type CompetitorWinLossChartProps = {
  byCompetitor: WinLossByCompetitor[];
  totalWins?: number;
  totalLosses?: number;
  overallWinRate?: number;
  title?: string;
  height?: number;
};

export function CompetitorWinLossChart({
  byCompetitor,
  totalWins,
  totalLosses,
  overallWinRate,
  title = 'Win/loss by competitor',
  height = 280,
}: CompetitorWinLossChartProps) {
  const data = byCompetitor.map((r) => ({
    name: r.competitorName || r.competitorId || 'Unknown',
    winRate: Math.round((r.winRate ?? 0) * 100),
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
  }));

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {(totalWins != null || totalLosses != null || overallWinRate != null) && (
          <span className="text-xs text-gray-500">
            Overall: {totalWins ?? 0}W / {totalLosses ?? 0}L
            {typeof overallWinRate === 'number' && ` (${(overallWinRate * 100).toFixed(0)}%)`}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No win/loss data by competitor yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v: number) => [`${v}%`, 'Win rate']}
              labelFormatter={(n) => n}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload;
                return (
                  <div className="rounded border bg-white dark:bg-gray-800 px-2 py-1.5 text-xs shadow">
                    <div className="font-medium">{p.name}</div>
                    <div>Win rate: {p.winRate}%</div>
                    <div className="text-gray-500">{p.wins}W / {p.losses}L</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="winRate" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Win rate" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
