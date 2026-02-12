/**
 * Admin: Multi-modal jobs list — GET /api/v1/multimodal/jobs (gateway → multi_modal_service).
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

type JobItem = { id: string; type?: string; status?: string; name?: string; createdAt?: string };

type ListResponse = { items?: JobItem[]; continuationToken?: string };

export default function AdminMultimodalListPage() {
  const [items, setItems] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(() => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch('/api/v1/multimodal/jobs?limit=100')
      .then((r: Response) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load jobs');
        return r.json();
      })
      .then((data: ListResponse) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => setError(GENERIC_ERROR_MESSAGE))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Multi-modal jobs</h1>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-3 dark:border-gray-700">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="No multi-modal jobs"
            description="Create a job via API (POST /api/v1/multimodal/jobs) with type and input."
          />
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
