/**
 * Admin: Create action catalog relationship — POST /api/v1/action-catalog/relationships (gateway → risk_catalog).
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
              <Label htmlFor="riskId" className="block mb-1">Risk</Label>
              <Select value={riskId || '_none'} onValueChange={(v) => setRiskId(v === '_none' ? '' : v)}>
                <SelectTrigger id="riskId" className="w-full">
                  <SelectValue placeholder="Select risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Select risk</SelectItem>
                  {risks.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recommendationId" className="block mb-1">Recommendation (mitigates this risk)</Label>
              <Select value={recommendationId || '_none'} onValueChange={(v) => setRecommendationId(v === '_none' ? '' : v)}>
                <SelectTrigger id="recommendationId" className="w-full">
                  <SelectValue placeholder="Select recommendation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Select recommendation</SelectItem>
                  {recommendations.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting || !riskId || !recommendationId}>Add link</Button>
              <Button variant="outline" asChild>
                <Link href="/admin/action-catalog/relationships">Cancel</Link>
              </Button>
            </div>
          </form>
        )}
        <p className="mt-4"><Link href="/admin/action-catalog/relationships" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Relationships</Link></p>
      </div>
    </div>
  );
}
