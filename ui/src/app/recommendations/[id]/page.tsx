/**
 * Single recommendation — GET /api/v1/recommendations/:id. Back link to /recommendations.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { RecommendationItem } from '@/components/recommendations/RecommendationsCard';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

const SOURCE_LABELS: Record<string, string> = {
  vector_search: 'Similar opportunities',
  collaborative: 'Similar users',
  temporal: 'Recent activity',
  content: 'Content match',
  ml: 'ML model',
};

export default function RecommendationDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [item, setItem] = useState<RecommendationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendation = useCallback(() => {
    if (!getApiBaseUrl() || !id) {
      setLoading(false);
      if (!id) setError('Missing recommendation id');
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/recommendations/${encodeURIComponent(id)}`)
      .then((r: Response) => {
        if (r.status === 404) throw new Error('Recommendation not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load recommendation');
        return r.json();
      })
      .then((data: RecommendationItem) => setItem(data))
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setItem(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/recommendations" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          Back to Recommendations
        </Link>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && item && (
          <div className="border rounded-lg p-6 dark:border-gray-700">
            <h1 className="text-xl font-semibold mb-2">{item.title}</h1>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{SOURCE_LABELS[item.source] ?? item.source}</span>
              {item.score != null && (
                <span className="ml-2">Score: {Number(item.score).toFixed(2)}</span>
              )}
            </div>
            {(item.explanation || item.description) && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {item.explanation ?? item.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
