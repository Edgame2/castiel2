/**
 * CompetitorMentionsCard – mentions per competitor (Plan §6.3, §890).
 * Data: GET /api/v1/opportunities/:opportunityId/competitors or
 * GET /api/v1/competitive-intelligence/dashboard (topCompetitorsByMentions).
 */

'use client';

export type CompetitorMention = {
  competitorId: string;
  competitorName: string;
  mentionCount: number;
  sentiment?: number;
};

export type CompetitorMentionsCardProps = {
  mentions: CompetitorMention[];
  title?: string;
};

export function CompetitorMentionsCard({ mentions, title = 'Competitor mentions' }: CompetitorMentionsCardProps) {
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {mentions.length === 0 ? (
        <p className="text-sm text-gray-500">No competitor mentions</p>
      ) : (
        <ul className="space-y-2">
          {mentions.map((m) => (
            <li key={m.competitorId} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate" title={m.competitorName}>
                {m.competitorName}
              </span>
              <span className="shrink-0 text-gray-600 dark:text-gray-400">{m.mentionCount}</span>
              {typeof m.sentiment === 'number' && (
                <span
                  className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${
                    m.sentiment >= 0.5
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : m.sentiment >= 0.2
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  }`}
                >
                  {(m.sentiment * 100).toFixed(0)}%
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
