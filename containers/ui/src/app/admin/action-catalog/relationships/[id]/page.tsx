/**
 * Admin: Action catalog relationship detail — view and delete (GET list + DELETE via riskId/recommendationId).
 * [id] is encodeURIComponent(riskId + "::" + recommendationId).
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

interface ActionCatalogRelationship {
  riskId: string;
  recommendationId: string;
}

interface EntryMin {
  id: string;
  type: 'risk' | 'recommendation';
  displayName: string;
}

function parseCompositeId(id: string): { riskId: string; recommendationId: string } | null {
  try {
    const decoded = decodeURIComponent(id);
    const idx = decoded.indexOf('::');
    if (idx === -1) return null;
    return {
      riskId: decoded.slice(0, idx),
      recommendationId: decoded.slice(idx + 2),
    };
  } catch {
    return null;
  }
}

export default function ActionCatalogRelationshipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = typeof params?.id === 'string' ? params.id : '';
  const parsed = parseCompositeId(rawId);

  const [relationship, setRelationship] = useState<ActionCatalogRelationship | null>(null);
  const [entries, setEntries] = useState<EntryMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!apiBase || !parsed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [relRes, entriesRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/action-catalog/relationships`, { credentials: 'include' }),
        fetch(`${apiBase}/api/v1/action-catalog/entries`, { credentials: 'include' }),
      ]);
      if (!relRes.ok || !entriesRes.ok) throw new Error('Failed to load');
      const relJson = await relRes.json();
      const entriesJson = await entriesRes.json();
      const list: ActionCatalogRelationship[] = Array.isArray(relJson) ? relJson : [];
      const found = list.find(
        (r) => r.riskId === parsed.riskId && r.recommendationId === parsed.recommendationId
      );
      setRelationship(found ?? null);
      setEntries(Array.isArray(entriesJson) ? entriesJson : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRelationship(null);
    } finally {
      setLoading(false);
    }
  }, [parsed?.riskId, parsed?.recommendationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const entryName = (id: string) => entries.find((e) => e.id === id)?.displayName ?? id;

  const handleDelete = () => {
    if (!apiBase || !parsed || deleting) return;
    setDeleting(true);
    const url = new URL(`${apiBase}/api/v1/action-catalog/relationships`);
    url.searchParams.set('riskId', parsed.riskId);
    url.searchParams.set('recommendationId', parsed.recommendationId);
    fetch(url.toString(), { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (!r.ok && r.status !== 204) return r.json().then((d: { error?: { message?: string } }) => { throw new Error(d?.error?.message ?? r.statusText); });
        router.push('/admin/action-catalog/relationships');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Delete failed');
        setDeleting(false);
      });
  };

  if (!parsed) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600 dark:text-red-400">Invalid relationship ID.</p>
        <p className="mt-4"><Link href="/admin/action-catalog/relationships" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Relationships</Link></p>
      </div>
    );
  }

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
          <span className="text-foreground">Link</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

        {!loading && !error && (
          <>
            {relationship ? (
              <>
                <h1 className="text-xl font-semibold mb-4">Risk – Recommendation link</h1>
                <div className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Risk</p>
                    <Link href={`/admin/action-catalog/entries/${encodeURIComponent(relationship.riskId)}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {entryName(relationship.riskId)}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{relationship.riskId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Recommendation (mitigates this risk)</p>
                    <Link href={`/admin/action-catalog/entries/${encodeURIComponent(relationship.recommendationId)}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {entryName(relationship.recommendationId)}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{relationship.recommendationId}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteConfirm(true)}>
                      Remove link
                    </Button>
                  </div>
                </div>

                {deleteConfirm && (
                  <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm mb-2">Remove this link between risk and recommendation?</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Remove</Button>
                      <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold mb-4">Link not found</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">This risk–recommendation link may have been removed.</p>
              </>
            )}
          </>
        )}
        <p className="mt-4"><Link href="/admin/action-catalog/relationships" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Relationships</Link></p>
      </div>
    </div>
  );
}
