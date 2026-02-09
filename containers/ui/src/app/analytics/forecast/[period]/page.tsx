/**
 * Period scenario — risk-adjusted / ML forecast for a specific period.
 * UI inventory §3.7. Uses period from URL (e.g. 2025-Q1, 2025-01). Data from risk_analytics when available.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

export default function ForecastPeriodPage() {
  const params = useParams();
  const period = (params?.period as string) ?? '';
  const [scenarios, setScenarios] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    if (!period || !apiBaseUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/v1/forecasts/${encodeURIComponent(period)}/scenarios`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) {
          setScenarios([]);
          return;
        }
        throw new Error(res.statusText || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setScenarios(Array.isArray(data) ? data : data?.scenarios ?? data?.items ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load');
      setScenarios(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const displayPeriod = period ? decodeURIComponent(period) : '';

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/analytics/forecast" className="text-sm font-medium hover:underline">
          Forecast
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">{displayPeriod || 'Period'}</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Period scenario — {displayPeriod || '…'}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Risk-adjusted and ML scenario forecast for this period. Scenario data is loaded from the forecasting service when available.
      </p>

      {loading && <p className="text-sm text-gray-500 mb-4">Loading…</p>}
      {fetchError && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-4" role="alert">
          {fetchError}. Showing period view only.
        </p>
      )}
      {!loading && scenarios !== null && scenarios.length === 0 && !fetchError && (
        <p className="text-sm text-gray-500 mb-4">No scenario data for this period.</p>
      )}
      {!loading && scenarios && scenarios.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Scenarios</h2>
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(scenarios, null, 2)}
          </pre>
        </div>
      )}

      <Link href="/analytics/forecast" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to Forecast
      </Link>
    </div>
  );
}
