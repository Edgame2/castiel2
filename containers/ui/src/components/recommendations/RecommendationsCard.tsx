/**
 * RecommendationsCard – recommendations list and feedback for an opportunity (Phase 8).
 * Fetches GET /api/v1/recommendations?opportunityId=...&limit=20; displays title, source, score, explanation.
 * When API returns reasoningSteps/conclusion (dataflow §11), shows "Why these recommendations" section.
 * Feedback: Accept, Ignore, Irrelevant -> POST /api/v1/recommendations/:id/feedback.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type RecommendationItem = {
  id: string;
  title: string;
  source: string;
  score: number;
  explanation?: string;
  description?: string;
  status?: string;
};

export type ReasoningStep = {
  id: string;
  order: number;
  type: string;
  content: string;
  reasoning?: string;
  confidence?: number;
};

export type RecommendationsCardProps = {
  opportunityId: string;
  title?: string;
};

export function RecommendationsCard({ opportunityId, title = 'Recommendations' }: RecommendationsCardProps) {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [conclusion, setConclusion] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchRecommendations = useCallback(() => {
    if (!getApiBaseUrl() || !opportunityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/recommendations?opportunityId=${encodeURIComponent(opportunityId)}&limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load recommendations');
        return r.json();
      })
      .then((data: { recommendations?: RecommendationItem[]; reasoningSteps?: ReasoningStep[]; conclusion?: string }) => {
        setItems(Array.isArray(data.recommendations) ? data.recommendations : []);
        setReasoningSteps(Array.isArray(data.reasoningSteps) ? data.reasoningSteps : []);
        setConclusion(typeof data.conclusion === 'string' ? data.conclusion : undefined);
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setLoading(false));
  }, [opportunityId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const submitFeedback = (recommendationId: string, action: 'accept' | 'ignore' | 'irrelevant') => {
    if (!getApiBaseUrl()) return;
    setSubmittingId(recommendationId);
    apiFetch(`/api/v1/recommendations/${encodeURIComponent(recommendationId)}/feedback`, {
      method: 'POST',
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
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/40"
                  onClick={() => submitFeedback(rec.id, 'accept')}
                  disabled={submittingId === rec.id}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => submitFeedback(rec.id, 'ignore')}
                  disabled={submittingId === rec.id}
                >
                  Ignore
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40"
                  onClick={() => submitFeedback(rec.id, 'irrelevant')}
                  disabled={submittingId === rec.id}
                >
                  Irrelevant
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && reasoningSteps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Why these recommendations</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {reasoningSteps.sort((a, b) => a.order - b.order).map((s) => (
              <li key={s.id}>
                {s.content}
                {s.reasoning && <span className="block ml-4 mt-0.5 text-gray-500 dark:text-gray-500">{s.reasoning}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!loading && !error && conclusion && (
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{conclusion}</p>
      )}
    </div>
  );
}
