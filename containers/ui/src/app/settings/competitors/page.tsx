/**
 * Competitor settings – catalog (admin) (Plan §6.5, §936).
 * Manage competitor master: name, aliases, industry. Future: list, add, edit.
 * risk-analytics: competitors container; POST /api/v1/competitors/:id/track links to opportunity.
 * Catalog CRUD (GET/POST /api/v1/competitors) when added to risk-analytics or configuration-service.
 */

import Link from 'next/link';

export default function CompetitorSettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Competitor catalog</h1>
      <p className="text-muted-foreground mb-6">
        Admin: competitor master (name, aliases, industry). Plan §6.5, §3.1.2.
      </p>
      <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 max-w-2xl">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Competitor catalog CRUD (list, add, edit) to be wired when GET/POST /api/v1/competitors
          is available from risk-analytics or configuration-service. Track: POST /api/v1/competitors/:id/track
          (body: opportunityId) links a competitor to an opportunity.
        </p>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        <Link href="/analytics/competitive" className="font-medium hover:underline">
          → Competitive intelligence
        </Link>
      </p>
    </div>
  );
}
