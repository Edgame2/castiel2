/**
 * Super Admin: Decision Rules — Conflicts (§6.3)
 * GET /api/v1/decisions/conflicts via gateway (risk-analytics). Conflict detection and resolution.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

const CONFLICT_TYPES: { name: string; description: string }[] = [
  { name: 'Contradictory actions', description: 'Two rules set the same field to different values.' },
  { name: 'Circular dependencies', description: 'Rules depend on each other in a cycle.' },
  { name: 'Overlapping conditions', description: 'Redundant rules with overlapping conditions.' },
  { name: 'Priority conflicts', description: 'Conflicting rule priorities for the same scenario.' },
];

const RESOLUTION_OPTIONS: string[] = [
  'Change priority',
  'Disable one rule',
  'Merge rules',
  'Add conflict resolution strategy',
];

interface ConflictItem {
  type: string;
  ruleIds: string[];
  ruleNames: string[];
  message: string;
}

interface ConflictsResponse {
  items: ConflictItem[];
}

export default function DecisionRulesConflictsPage() {
  const [data, setData] = useState<ConflictsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConflicts = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/decisions/conflicts');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  useEffect(() => {
    document.title = 'Rule Conflicts | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const items = data?.items ?? [];

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
        <Link href="/admin/decision-rules" className="text-sm font-medium hover:underline">
          Decision Rules
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Conflicts</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Conflicts</h1>
      <p className="text-muted-foreground mb-4">
        Conflict detection and resolution (§6.3). Contradictory actions, overlapping conditions, priority conflicts.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/decision-rules" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/decision-rules/rules" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Rules</Link>
        <Link href="/admin/decision-rules/templates" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Templates</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Conflicts</span>
      </nav>

      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <Button asChild>
          <Link href="/admin/decision-rules/rules">Manage rules (Rules page)</Link>
        </Button>
        <Button type="button" variant="link" onClick={fetchConflicts}>
          Refresh
        </Button>
      </div>

      {!getApiBaseUrl() && (
        <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          <Button type="button" variant="link" onClick={fetchConflicts} className="mt-2" aria-label="Retry loading rule conflicts">Retry</Button>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-6">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden mb-6">
          <h2 className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">Detected conflicts</h2>
          {items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No conflicts detected among enabled rules. Priority and overlapping-condition checks run on the current rule set.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rules</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Message</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {c.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {(c.ruleNames ?? []).join(', ') || (c.ruleIds ?? []).join(', ')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{c.message}</td>
                      <td className="px-4 py-2 text-sm">
                        <Link
                          href="/admin/decision-rules/rules"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Resolve (§6.3.2) →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Conflict types (§6.3.1)</h2>
          <ul className="space-y-2">
            {CONFLICT_TYPES.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}:</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{c.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Resolution options (§6.3.2)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Use the Rules page to change priority or disable rules until a conflict resolution wizard is available.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {RESOLUTION_OPTIONS.map((opt) => (
              <li key={opt}>{opt}</li>
            ))}
          </ul>
          <Link href="/admin/decision-rules/rules" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Open Rules →
          </Link>
        </section>
      </div>
    </div>
  );
}
