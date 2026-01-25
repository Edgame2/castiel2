/**
 * Opportunity list (Plan §6.2, §889).
 * OpportunityListPage: list with risk, win prob, early-warning indicators.
 */

import Link from 'next/link';

export default function OpportunityListPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Opportunities</h1>
      <p className="text-muted-foreground mb-4">
        List with risk, win probability, early-warning indicators. Plan §6.2.
      </p>
      <p className="text-sm text-muted-foreground">
        API: pipeline/shard/analytics for opportunity IDs; risk-analytics for
        risk, win-prob, early-warning. Detail: /opportunities/[id].
      </p>
    </div>
  );
}
