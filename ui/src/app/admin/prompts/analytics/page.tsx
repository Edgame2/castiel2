/**
 * Admin: Prompt analytics — GET /api/v1/prompts/analytics (gateway → prompt_service).
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

type AnalyticsResponse = {
  totalPrompts?: number;
  byStatus?: Record<string, number>;
  byCategory?: Record<string, number>;
};

export default function AdminPromptsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(() => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch('/api/v1/prompts/analytics')
      .then((r: Response) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load analytics');
        return r.json();
      })
      .then((d: AnalyticsResponse) => setData(d))
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/prompts" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          ← Back to prompts
        </Link>
        <h1 className="text-xl font-semibold mb-4">Prompt analytics</h1>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && data && (
          <div className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
            <p className="text-sm">
              <span className="font-medium">Total prompts:</span>{' '}
              {data.totalPrompts ?? 0}
            </p>
            {data.byStatus && Object.keys(data.byStatus).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">By status</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {Object.entries(data.byStatus).map(([k, v]) => (
                    <li key={k}>{k}: {v}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.byCategory && Object.keys(data.byCategory).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">By category</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {Object.entries(data.byCategory).map(([k, v]) => (
                    <li key={k}>{k}: {v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
