/**
 * Super Admin: Decision Rules — Templates (§6.2)
 * GET /api/v1/decisions/templates via gateway (risk-analytics). Pre-configured rule templates.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import { GENERIC_ERROR_MESSAGE, apiFetch, getApiBaseUrl } from '@/lib/api';

const FALLBACK_TEMPLATES: { name: string; description: string }[] = [
  { name: 'Mark high-value, low-risk as hot', description: 'Flag opportunities with high value and low risk score for priority follow-up.' },
  { name: 'Escalate stalled opportunities', description: 'Trigger escalation when an opportunity has been in the same stage beyond a threshold.' },
  { name: 'Notify on competitor detected', description: 'Send a notification when competitor intelligence is detected for an opportunity.' },
  { name: 'Create task when stage changes', description: 'Create a follow-up task whenever the opportunity stage is updated.' },
  { name: 'Alert on risk spike', description: 'Alert when risk score increases above a configured threshold.' },
];

interface TemplateItem {
  name: string;
  description: string;
}

export default function DecisionRulesTemplatesPage() {
  const [items, setItems] = useState<TemplateItem[]>(FALLBACK_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setItems(FALLBACK_TEMPLATES);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/decisions/templates');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setItems(Array.isArray(json?.items) && json.items.length > 0 ? json.items : FALLBACK_TEMPLATES);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setItems(FALLBACK_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    document.title = 'Rule Templates | Admin | Castiel';
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
        <Link href="/admin/decision-rules" className="text-sm font-medium hover:underline">
          Decision Rules
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Templates</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Templates</h1>
      <p className="text-muted-foreground mb-4">
        Pre-configured rule templates (§6.2). Create a rule from a template using the Rules page.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/decision-rules"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/decision-rules/rules"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Rules
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Templates
        </span>
        <Link
          href="/admin/decision-rules/conflicts"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Conflicts
        </Link>
      </nav>

      {!getApiBaseUrl() && (
        <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL. Showing default templates.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}. Showing default templates.</p>
          <Button type="button" variant="link" size="sm" className="mt-2" onClick={fetchTemplates}>
            Retry
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <Button asChild>
          <Link href="/admin/decision-rules/templates/new">New template</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/decision-rules/rules">Create rule (Rules page)</Link>
        </Button>
        <Button type="button" variant="outline" onClick={fetchTemplates} disabled={loading} title="Refetch rule templates">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <div
              key={t.name}
              className="rounded-lg border bg-white dark:bg-gray-900 p-4 flex flex-col"
            >
              <Link href={`/admin/decision-rules/templates/${encodeURIComponent(t.name)}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">
                {t.name}
              </Link>
              <p className="text-sm text-gray-500 mt-1">{t.description}</p>
              <Link
                href="/admin/decision-rules/rules"
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Create rule from this template →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
