/**
 * Recommendations for one opportunity. Uses RecommendationsCard; links to list and opportunity.
 */

import Link from 'next/link';
import { RecommendationsCard } from '@/components/recommendations/RecommendationsCard';

type Props = { params: Promise<{ id: string }> };

export default async function OpportunityRecommendationsPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/opportunities" className="hover:underline">Opportunities</Link>
          <span>/</span>
          <Link href={`/opportunities/${id}`} className="hover:underline">Opportunity {id}</Link>
          <span>/</span>
          <span className="text-foreground">Recommendations</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Recommendations for this opportunity</h1>
        <RecommendationsCard opportunityId={id} title="" />
        <div className="mt-4 flex gap-4">
          <Link href="/recommendations" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            All recommendations
          </Link>
          <Link href={`/opportunities/${id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to opportunity
          </Link>
        </div>
      </div>
    </div>
  );
}
