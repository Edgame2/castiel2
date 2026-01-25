/**
 * Competitive intelligence (Plan §6.5, §936).
 * Win/loss by competitor, landscape. Data: GET /api/v1/analytics/competitive-win-loss,
 * GET /api/v1/competitive-intelligence/dashboard.
 */

import Link from 'next/link';
import { CompetitorMentionsCard } from '@/components/competitive/CompetitorMentionsCard';
import { CompetitorWinLossChart } from '@/components/competitive/CompetitorWinLossChart';

const sampleByCompetitor = [
  { competitorId: 'c1', competitorName: 'Acme Corp', wins: 12, losses: 8, winRate: 0.6 },
  { competitorId: 'c2', competitorName: 'Beta Inc', wins: 5, losses: 10, winRate: 0.33 },
  { competitorId: 'c3', competitorName: 'Gamma Ltd', wins: 3, losses: 4, winRate: 0.43 },
];

const sampleMentions = [
  { competitorId: 'c1', competitorName: 'Acme Corp', mentionCount: 24 },
  { competitorId: 'c2', competitorName: 'Beta Inc', mentionCount: 18 },
  { competitorId: 'c3', competitorName: 'Gamma Ltd', mentionCount: 9 },
];

export default function CompetitiveIntelligencePage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Competitive intelligence</h1>
      <p className="text-muted-foreground mb-6">
        Win/loss by competitor, mentions, landscape. Plan §6.5, §936.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <CompetitorWinLossChart
            byCompetitor={sampleByCompetitor}
            totalWins={20}
            totalLosses={22}
            overallWinRate={0.48}
            title="Win/loss by competitor"
          />
        </div>
        <div>
          <CompetitorMentionsCard mentions={sampleMentions} title="Top by mentions" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        API: risk-analytics GET /api/v1/analytics/competitive-win-loss, GET /api/v1/competitive-intelligence/dashboard.
      </p>
    </div>
  );
}
