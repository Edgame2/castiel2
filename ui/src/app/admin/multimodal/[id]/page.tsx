/**
 * Admin: Multi-modal job detail — GET /api/v1/multimodal/jobs/:id (gateway → multi_modal_service).
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

type JobDetail = {
  id: string;
  type?: string;
  status?: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  result?: unknown;
  error?: string;
};

export default function AdminMultimodalJobDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(() => {
    if (!getApiBaseUrl() || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/multimodal/jobs/${encodeURIComponent(id)}`)
      .then((r: Response) => {
        if (r.status === 404) throw new Error('Job not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load job');
        return r.json();
      })
      .then((data: JobDetail) => setJob(data))
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setJob(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/multimodal" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          Back to multi-modal jobs
        </Link>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && job && (
          <div className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
            <h1 className="text-xl font-semibold">{job.name || `Job ${job.id.slice(0, 8)}`}</h1>
            <p className="text-sm text-gray-500">
              {job.type ?? '—'} · {job.status ?? '—'}
            </p>
            {job.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{job.description}</p>
            )}
            {(job.createdAt ?? job.updatedAt) && (
              <p className="text-sm text-gray-500">
                Created: {job.createdAt ?? '—'} · Updated: {job.updatedAt ?? '—'}
              </p>
            )}
            {job.error && (
              <p className="text-sm text-red-600 dark:text-red-400">Error: {job.error}</p>
            )}
            {job.result != null && (
              <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
