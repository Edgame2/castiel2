/**
 * Super Admin: Decision Rules — Overview (§6)
 * Links to Rules, Templates, Conflicts (risk-analytics decision engine).
 * Summary counts and Refresh for consistency with other admin pages.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface OverviewStats {
  rulesCount: number;
  templatesCount: number;
  conflictsCount: number;
}

export default function DecisionRulesOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!apiBaseUrl) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rulesRes, templatesRes, conflictsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/decisions/rules?all=true`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/decisions/templates`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/decisions/conflicts`, { credentials: 'include' }),
      ]);
      if (!rulesRes.ok || !templatesRes.ok || !conflictsRes.ok) {
        throw new Error('Failed to load decision rules stats');
      }
      const [rulesJson, templatesJson, conflictsJson] = await Promise.all([
        rulesRes.json(),
        templatesRes.json(),
        conflictsRes.json(),
      ]);
      const rulesCount = Array.isArray(rulesJson) ? rulesJson.length : 0;
      const templatesCount = Array.isArray(templatesJson?.items)
        ? templatesJson.items.length
        : Array.isArray(templatesJson)
          ? templatesJson.length
          : 0;
      const conflictsCount = Array.isArray(conflictsJson?.items) ? conflictsJson.items.length : 0;
      setStats({ rulesCount, templatesCount, conflictsCount });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    document.title = 'Decision Rules | Admin | Castiel';
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
        <span className="text-sm font-medium">Decision Rules</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Decision Rules</h1>
          <p className="text-muted-foreground">
            Rules, templates, and conflict detection for the decision engine (risk-analytics). Super Admin §6.
          </p>
        </div>
        {apiBaseUrl && (
          <Button type="button" variant="outline" onClick={fetchStats} disabled={loading}>
            Refresh
          </Button>
        )}
      </div>
      {!apiBaseUrl && (
        <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <Button type="button" variant="link" onClick={() => fetchStats()} className="mt-2">
              Retry
            </Button>
        </div>
      )}
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/decision-rules/rules"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Rules
        </Link>
        <Link
          href="/admin/decision-rules/templates"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Templates
        </Link>
        <Link
          href="/admin/decision-rules/conflicts"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Conflicts
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Rules</h2>
            <Link
              href="/admin/decision-rules/rules"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              List & test rules →
            </Link>
          </div>
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.rulesCount} rule${stats.rulesCount === 1 ? '' : 's'}`}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            List and test decision engine rules for the current tenant. GET /api/v1/decisions/rules, POST .../rules/:ruleId/test via risk-analytics (§6.1).
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Templates</h2>
            <Link
              href="/admin/decision-rules/templates"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View templates →
            </Link>
          </div>
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.templatesCount} template${stats.templatesCount === 1 ? '' : 's'}`}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pre-configured rule templates (§6.2). Available when backend exposes template APIs.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conflicts</h2>
            <Link
              href="/admin/decision-rules/conflicts"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View conflicts →
            </Link>
          </div>
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.conflictsCount} conflict${stats.conflictsCount === 1 ? '' : 's'}`}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Conflict detection and resolution (§6.3). Contradictory actions, overlapping conditions, priority conflicts.
          </p>
        </section>
      </div>
    </div>
  );
}
