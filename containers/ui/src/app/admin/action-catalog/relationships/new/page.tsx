/**
 * Admin: Create action catalog relationship — POST /api/v1/action-catalog/relationships (gateway → risk_catalog).
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

interface EntryMin {
  id: string;
  type: 'risk' | 'recommendation';
  displayName: string;
}

export default function ActionCatalogRelationshipNewPage() {
  const router = useRouter();
  const [riskId, setRiskId] = useState('');
  const [recommendationId, setRecommendationId] = useState('');
  const [entries, setEntries] = useState<EntryMin[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!apiBase) return;
    setLoadingEntries(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/action-catalog/entries`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEntries(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const risks = entries.filter((e) => e.type === 'risk');
  const recommendations = entries.filter((e) => e.type === 'recommendation');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !riskId || !recommendationId || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/action-catalog/relationships`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskId, recommendationId }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        const compositeId = encodeURIComponent(`${riskId}::${recommendationId}`);
        router.push(`/admin/action-catalog/relationships/${compositeId}`);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Create failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/action-catalog" className="hover:underline">Action Catalog</Link>
          <span>/</span>
          <Link href="/admin/action-catalog/relationships" className="hover:underline">Relationships</Link>
          <span>/</span>
          <span className="text-foreground">New link</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Add risk–recommendation link</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {loadingEntries ? (
          <p className="text-sm text-gray-500">Loading entries…</p>
        ) : (
          <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
            <div>
              <label htmlFor="riskId" className="block text-sm font-medium mb-1">Risk</label>
              <select
                id="riskId"
                value={riskId}
                onChange={(e) => setRiskId(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                required
              >
                <option value="">Select risk</option>
                {risks.map((r) => (
                  <option key={r.id} value={r.id}>{r.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="recommendationId" className="block text-sm font-medium mb-1">Recommendation (mitigates this risk)</label>
              <select
                id="recommendationId"
                value={recommendationId}
                onChange={(e) => setRecommendationId(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                required
              >
                <option value="">Select recommendation</option>
                {recommendations.map((r) => (
                  <option key={r.id} value={r.id}>{r.displayName}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting || !riskId || !recommendationId} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Add link</button>
              <Link href="/admin/action-catalog/relationships" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
            </div>
          </form>
        )}
        <p className="mt-4"><Link href="/admin/action-catalog/relationships" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Relationships</Link></p>
      </div>
    </div>
  );
}
