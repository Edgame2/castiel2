/**
 * Admin: Multi-modal jobs list — GET /api/v1/multimodal/jobs (gateway → multi_modal_service).
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type JobItem = { id: string; type?: string; status?: string; name?: string; createdAt?: string };

type ListResponse = { items?: JobItem[]; continuationToken?: string };

export default function AdminMultimodalListPage() {
  const [items, setItems] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(() => {
    if (!apiBase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/multimodal/jobs?limit=100`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load jobs');
        return r.json();
      })
      .then((data: ListResponse) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Multi-modal jobs</h1>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No multi-modal jobs. Create a job via API (POST /api/v1/multimodal/jobs) with type and input.
          </p>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((j) => (
              <li key={j.id} className="border rounded-lg p-3 dark:border-gray-700">
                <Link
                  href={`/admin/multimodal/${j.id}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline block"
                >
                  {j.name || `${j.type ?? 'job'} ${j.id.slice(0, 8)}`}
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  {j.status ?? '—'} · {j.type ?? '—'} {j.createdAt && `· ${j.createdAt}`}
                </p>
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
