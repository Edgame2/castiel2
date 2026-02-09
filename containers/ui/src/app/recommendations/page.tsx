/**
 * Recommendations list — fetches GET /api/v1/recommendations (optional ?opportunityId=, limit=50).
 * Links to /recommendations/[id] and /opportunities when applicable.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import type { RecommendationItem } from '@/components/recommendations/RecommendationsCard';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

const SOURCE_LABELS: Record<string, string> = {
  vector_search: 'Similar opportunities',
  collaborative: 'Similar users',
  temporal: 'Recent activity',
  content: 'Content match',
  ml: 'ML model',
};

function RecommendationsListContent() {
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get('opportunityId') ?? undefined;

  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(() => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (opportunityId) params.set('opportunityId', opportunityId);
    params.set('limit', '50');
    apiFetch(`/api/v1/recommendations?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load recommendations');
        return r.json();
      })
      .then((data: { recommendations?: RecommendationItem[] }) => {
        setItems(Array.isArray(data.recommendations) ? data.recommendations : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [opportunityId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Recommendations</h1>
          <Link
            href="/opportunities"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Opportunities
          </Link>
        </div>

        {opportunityId && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            For opportunity:{' '}
            <Link
              href={`/opportunities/${opportunityId}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {opportunityId}
            </Link>
          </p>
        )}

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No recommendations yet. Open an opportunity to see recommendations, or use the list with an
            opportunity filter.
          </p>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((rec) => (
              <li
                key={rec.id}
                className="border rounded-lg p-4 dark:border-gray-700"
              >
                <Link
                  href={`/recommendations/${rec.id}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline block mb-1"
                >
                  {rec.title}
                </Link>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span>{SOURCE_LABELS[rec.source] ?? rec.source}</span>
                  {rec.score != null && (
                    <span className="ml-2">Score: {Number(rec.score).toFixed(2)}</span>
                  )}
                </div>
                {rec.explanation && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{rec.explanation}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function RecommendationsListPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold mb-4">Recommendations</h1>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    }>
      <RecommendationsListContent />
    </Suspense>
  );
}
