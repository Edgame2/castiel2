/**
 * Admin: Prompt templates list — GET /api/v1/prompts (gateway → prompt_service).
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

type PromptItem = { id: string; name?: string; slug?: string; status?: string; category?: string };

type ListResponse = { items?: PromptItem[]; continuationToken?: string };

export default function AdminPromptsListPage() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/prompts?limit=100');
      if (!res.ok) throw new Error(res.statusText || 'Failed to load prompts');
      const data: ListResponse = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Prompt templates</h1>
          <Link href="/admin/prompts/analytics" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Analytics
          </Link>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">No prompt templates.</p>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="border rounded-lg p-3 dark:border-gray-700">
                <Link
                  href={`/admin/prompts/${p.id}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline block"
                >
                  {p.name || p.slug || p.id}
                </Link>
                {(p.status ?? p.category) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {[p.status, p.category].filter(Boolean).join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4">
          <Link href="/admin" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to Admin
          </Link>
        </p>
      </div>
    </div>
  );
}
