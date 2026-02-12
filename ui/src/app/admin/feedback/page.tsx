/**
 * Super Admin: Feedback System (W11)
 * GET /api/v1/admin/feedback-types, GET/PUT /api/v1/admin/feedback-config via gateway (recommendations).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { GENERIC_ERROR_MESSAGE, apiFetch, getApiBaseUrl } from '@/lib/api';

interface FeedbackType {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  enabled?: boolean;
}

interface GlobalFeedbackConfig {
  id?: string;
  defaultLimit?: number;
  minLimit?: number;
  maxLimit?: number;
  availableTypes?: string[];
  defaultActiveTypes?: string[];
  patternDetection?: {
    enabled: boolean;
    minSampleSize: number;
    thresholds: { ignoreRate: number; actionRate: number };
  };
  updatedAt?: string;
  updatedBy?: string;
}

interface FeedbackAggregationData {
  id?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  recommendations?: { total?: number; shown?: number; receivedFeedback?: number; feedbackRate?: number };
  feedbackBySentiment?: { positive?: number; neutral?: number; negative?: number; avgSentimentScore?: number };
  actionMetrics?: { actionIntended?: number; actionTaken?: number; actionCompleted?: number; actionRate?: number };
  updatedAt?: string;
}

export default function FeedbackSystemPage() {
  const [types, setTypes] = useState<FeedbackType[]>([]);
  const [config, setConfig] = useState<GlobalFeedbackConfig | null>(null);
  const [aggregation, setAggregation] = useState<FeedbackAggregationData | null>(null);
  const [aggregationPeriod, setAggregationPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTypes = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    try {
      const res = await apiFetch('/api/v1/admin/feedback-types');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTypes(Array.isArray(json) ? json : []);
    } catch (e) {
      setTypes([]);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    try {
      const res = await apiFetch('/api/v1/admin/feedback-config');
      if (res.status === 404) {
        setConfig(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setConfig(json);
    } catch (e) {
      setConfig(null);
    }
  }, []);

  const fetchAggregation = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    try {
      const res = await apiFetch('/api/v1/feedback/aggregation?period=${aggregationPeriod}');
      if (res.status === 404) {
        setAggregation(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAggregation(json);
    } catch (e) {
      setAggregation(null);
    }
  }, [aggregationPeriod]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchTypes(), fetchConfig(), fetchAggregation()]);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [fetchTypes, fetchConfig, fetchAggregation]);

  useEffect(() => {
    if (getApiBaseUrl()) fetchAll();
    else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    document.title = 'Feedback System | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Admin
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Feedback System</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Feedback System</h1>
      <p className="text-muted-foreground mb-4">
        Feedback types (global) and global feedback config. Via recommendations.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/feedback/types"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Feedback Types
        </Link>
        <Link
          href="/admin/feedback/global-settings"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Global Settings
        </Link>
      </nav>

      {getApiBaseUrl() && (
        <div className="mb-4">
          <Button type="button" variant="outline" onClick={() => fetchAll()} disabled={loading} title="Refetch types, config, and aggregation" aria-label="Refresh feedback types, config, and aggregation">
            Refresh
          </Button>
        </div>
      )}

      {!getApiBaseUrl() && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && getApiBaseUrl() && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-gray-50 dark:bg-gray-800/50 p-4 flex flex-wrap items-center gap-4" role="region" aria-label="Feedback system summary">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Feedback types: <strong>{types.length}</strong>
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Global config: <strong>{config != null ? 'Set' : 'Not set'}</strong>
            </span>
            {aggregation != null && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aggregation ({aggregationPeriod}): <strong>Available</strong>
              </span>
            )}
          </div>
          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Feedback types (global)</h2>
              <Link
                href="/admin/feedback/types"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Manage types →
              </Link>
            </div>
            {types.length === 0 ? (
              <p className="text-sm text-gray-500">None or not loaded.</p>
            ) : (
              <ul className="list-disc list-inside text-sm space-y-1">
                {types.map((t, i) => (
                  <li key={(t as { id?: string }).id ?? i}>
                    {(t as { name?: string }).name ?? (t as { id?: string }).id ?? '—'}
                    {(t as { description?: string }).description ? ` – ${(t as { description?: string }).description}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-2">Global feedback config</h2>
            <p className="text-sm text-gray-500 mb-3">
              Default limits, pattern detection, and default active types.
            </p>
            <Link
              href="/admin/feedback/global-settings"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Configure global settings →
            </Link>
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-2">Per-tenant feedback config</h2>
            <p className="text-sm text-gray-500 mb-3">
              Set feedback limit, active types, and pattern detection per tenant (Super Admin §1.3).
            </p>
            <Link
              href="/admin/tenants"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Configure per tenant →
            </Link>
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Feedback aggregation (tenant)</h2>
            <div className="flex gap-2 mb-3">
              <Select value={aggregationPeriod} onValueChange={(v) => setAggregationPeriod(v as 'daily' | 'weekly' | 'monthly')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={fetchAggregation} aria-label="Refresh aggregation for selected period">Refresh</Button>
            </div>
            {aggregation == null ? (
              <p className="text-sm text-gray-500">No aggregation for this period (or not yet computed).</p>
            ) : (
              <div className="text-sm space-y-2">
                {aggregation.startDate != null && aggregation.endDate != null && (
                  <p><strong>Period:</strong> {aggregation.startDate} – {aggregation.endDate}</p>
                )}
                {aggregation.recommendations != null && (
                  <p><strong>Recommendations:</strong> shown {aggregation.recommendations.shown ?? '—'}, feedback received {aggregation.recommendations.receivedFeedback ?? '—'}, rate {aggregation.recommendations.feedbackRate != null ? `${(Number(aggregation.recommendations.feedbackRate) * 100).toFixed(1)}%` : '—'}</p>
                )}
                {aggregation.feedbackBySentiment != null && (
                  <p><strong>Sentiment:</strong> positive {aggregation.feedbackBySentiment.positive ?? '—'}, neutral {aggregation.feedbackBySentiment.neutral ?? '—'}, negative {aggregation.feedbackBySentiment.negative ?? '—'}</p>
                )}
                {aggregation.actionMetrics != null && (
                  <p><strong>Actions:</strong> intended {aggregation.actionMetrics.actionIntended ?? '—'}, taken {aggregation.actionMetrics.actionTaken ?? '—'}, rate {aggregation.actionMetrics.actionRate != null ? `${(Number(aggregation.actionMetrics.actionRate) * 100).toFixed(1)}%` : '—'}</p>
                )}
                {aggregation.updatedAt != null && <p className="text-gray-500">Updated: {aggregation.updatedAt}</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
