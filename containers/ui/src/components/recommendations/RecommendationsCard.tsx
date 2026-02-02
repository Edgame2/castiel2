/**
 * RecommendationsCard – recommendations list and feedback for an opportunity (Phase 8).
 * Fetches GET /api/v1/recommendations?opportunityId=...&limit=20; displays title, source, score, explanation.
 * Feedback: Accept, Ignore, Irrelevant -> POST /api/v1/recommendations/:id/feedback.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

const apiBase = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '') : '';

export type RecommendationItem = {
  id: string;
  title: string;
  source: string;
  score: number;
  explanation?: string;
  description?: string;
  status?: string;
};

export type RecommendationsCardProps = {
  opportunityId: string;
  title?: string;
};

export function RecommendationsCard({ opportunityId, title = 'Recommendations' }: RecommendationsCardProps) {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchRecommendations = useCallback(() => {
    if (!apiBase || !opportunityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const url = `${apiBase}/api/v1/recommendations?opportunityId=${encodeURIComponent(opportunityId)}&limit=20`;
    fetch(url, { credentials: 'include' })
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

  const submitFeedback = (recommendationId: string, action: 'accept' | 'ignore' | 'irrelevant') => {
    if (!apiBase) return;
    setSubmittingId(recommendationId);
    const url = `${apiBase}/api/v1/recommendations/${encodeURIComponent(recommendationId)}/feedback`;
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Feedback failed');
        setItems((prev) => prev.filter((rec) => rec.id !== recommendationId));
      })
      .catch(() => {
        setSubmittingId(null);
      })
      .finally(() => setSubmittingId(null));
  };

  const sourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      vector_search: 'Similar opportunities',
      collaborative: 'Similar users',
      temporal: 'Recent activity',
      content: 'Content match',
      ml: 'ML',
      ai: 'AI',
    };
    return labels[source] ?? source;
  };

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 max-w-sm">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-500">No recommendations for this opportunity</p>
      )}
      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((rec) => (
            <li key={rec.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-medium">{rec.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {sourceLabel(rec.source)} · {(typeof rec.score === 'number' ? rec.score * 100 : 0).toFixed(0)}%
              </p>
              {rec.explanation && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.explanation}</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 disabled:opacity-50"
                  onClick={() => submitFeedback(rec.id, 'accept')}
                  disabled={submittingId === rec.id}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  onClick={() => submitFeedback(rec.id, 'ignore')}
                  disabled={submittingId === rec.id}
                >
                  Ignore
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 disabled:opacity-50"
                  onClick={() => submitFeedback(rec.id, 'irrelevant')}
                  disabled={submittingId === rec.id}
                >
                  Irrelevant
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
