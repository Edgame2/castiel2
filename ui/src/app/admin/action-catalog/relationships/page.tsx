/**
 * Super Admin: Action Catalog — Relationships (§2.3)
 * GET/POST/DELETE /api/v1/action-catalog/relationships via gateway (risk-catalog).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface ActionCatalogRelationship {
  riskId: string;
  recommendationId: string;
}

interface ActionCatalogEntryMin {
  id: string;
  type: 'risk' | 'recommendation';
  displayName: string;
}

export default function ActionCatalogRelationshipsPage() {
  const [relationships, setRelationships] = useState<ActionCatalogRelationship[]>([]);
  const [entries, setEntries] = useState<ActionCatalogEntryMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'' | 'risk' | 'recommendation'>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalMode, setModalMode] = useState<'create' | 'delete' | null>(null);
  const [createForm, setCreateForm] = useState({ riskId: '', recommendationId: '' });
  const [deleteRel, setDeleteRel] = useState<ActionCatalogRelationship | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const [relRes, entriesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/action-catalog/relationships`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/action-catalog/entries`, { credentials: 'include' }),
      ]);
      if (!relRes.ok) throw new Error(`Relationships: HTTP ${relRes.status}`);
      if (!entriesRes.ok) throw new Error(`Entries: HTTP ${entriesRes.status}`);
      const relJson = await relRes.json();
      const entriesJson = await entriesRes.json();
      setRelationships(Array.isArray(relJson) ? relJson : []);
      setEntries(Array.isArray(entriesJson) ? entriesJson : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRelationships([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    document.title = 'Relationships | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const closeModal = () => {
    setModalMode(null);
    setDeleteRel(null);
    setFormError(null);
    setCreateForm({ riskId: '', recommendationId: '' });
  };

  const openCreate = () => {
    setCreateForm({ riskId: '', recommendationId: '' });
    setModalMode('create');
    setFormError(null);
  };

  const openDelete = (rel: ActionCatalogRelationship) => {
    setDeleteRel(rel);
    setModalMode('delete');
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl || !createForm.riskId || !createForm.recommendationId) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/relationships`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskId: createForm.riskId,
          recommendationId: createForm.recommendationId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!apiBaseUrl || !deleteRel) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const url = new URL(`${apiBaseUrl}/api/v1/action-catalog/relationships`);
      url.searchParams.set('riskId', deleteRel.riskId);
      url.searchParams.set('recommendationId', deleteRel.recommendationId);
      const res = await fetch(url.toString(), { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const risks = entries.filter((e) => e.type === 'risk');
  const recommendations = entries.filter((e) => e.type === 'recommendation');
  const entryName = (id: string) => entries.find((e) => e.id === id)?.displayName ?? id;

  // §2.3.3 Relationship Analytics: metrics from current data
  const riskIdsLinked = new Set(relationships.map((r) => r.riskId));
  const recommendationIdsLinked = new Set(relationships.map((r) => r.recommendationId));
  const orphanedRisksCount = risks.filter((r) => !riskIdsLinked.has(r.id)).length;
  const orphanedRecsCount = recommendations.filter((r) => !recommendationIdsLinked.has(r.id)).length;
  const risksWithLinks = riskIdsLinked.size;
  const recsWithLinks = recommendationIdsLinked.size;
  const coverageRisks = risks.length > 0 ? Math.round((risksWithLinks / risks.length) * 100) : 0;
  const coverageRecs = recommendations.length > 0 ? Math.round((recsWithLinks / recommendations.length) * 100) : 0;
  const q = searchQuery.trim().toLowerCase();
  const filtered = relationships.filter((r) => {
    if (!q) return true;
    const riskName = entryName(r.riskId).toLowerCase();
    const recName = entryName(r.recommendationId).toLowerCase();
    return riskName.includes(q) || recName.includes(q);
  });

  const sorted = (() => {
    if (!sortBy) return filtered;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const base =
        sortBy === 'risk'
          ? entryName(a.riskId).localeCompare(entryName(b.riskId))
          : entryName(a.recommendationId).localeCompare(entryName(b.recommendationId));
      return mult * base;
    });
  })();

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
        <Link href="/admin/action-catalog" className="text-sm font-medium hover:underline">
          Action Catalog
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Relationships</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Relationships</h1>
      <p className="text-muted-foreground mb-4">
        Risk–recommendation links (mitigates). Add or remove links between risks and recommendations (§2.3).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/action-catalog"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/action-catalog/entries"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Entries
        </Link>
        <Link
          href="/admin/action-catalog/categories"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Categories
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Relationships
        </span>
      </nav>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <Button asChild size="sm">
            <Link href="/admin/action-catalog/relationships/new" aria-label="New link (page)">New link</Link>
            </Button>
          <Button type="button" variant="outline" size="sm" onClick={openCreate} aria-label="Add link (modal)">Add link (modal)</Button>
          <div className="space-y-1">
            <Label className="text-sm">Search (§2.3)</Label>
            <Input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Risk or recommendation name…" className="w-56 text-sm" aria-label="Search by risk or recommendation name" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Sort by (§2.3)</Label>
            <Select value={sortBy || '_default'} onValueChange={(v) => setSortBy(v === '_default' ? '' : (v as typeof sortBy))} aria-label="Sort by">
              <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_default">Default</SelectItem>
                <SelectItem value="risk">Risk name</SelectItem>
                <SelectItem value="recommendation">Recommendation name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Order</Label>
            <Select value={sortDir} onValueChange={(v) => setSortDir(v as 'asc' | 'desc')} aria-label="Sort direction">
              <SelectTrigger className="w-32 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-500">Loading relationships…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          <Button type="button" variant="link" size="sm" className="mt-2 p-0 h-auto" onClick={() => fetchData()}>Retry</Button>
        </div>
      )}

      {!loading && apiBaseUrl && !error && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold">Relationships</h2>
            <Button type="button" variant="outline" size="sm" onClick={fetchData} disabled={loading} aria-label="Refresh relationships">Refresh</Button>
          </div>
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50" aria-label="Relationship analytics">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">§2.3.3 Relationship Analytics</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Total links</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{relationships.length}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Risks with links</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{risksWithLinks} / {risks.length} ({coverageRisks}%)</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Recommendations with links</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{recsWithLinks} / {recommendations.length} ({coverageRecs}%)</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Orphaned</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{orphanedRisksCount} risks, {orphanedRecsCount} recommendations</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden">
          {sorted.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-gray-500">
                {relationships.length === 0
                  ? 'No risk–recommendation links yet. Add a link to indicate which recommendation mitigates which risk.'
                  : 'No relationships match the search.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Risk</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-900 dark:text-gray-100">Recommendation</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((rel, i) => {
                  const compositeId = encodeURIComponent(`${rel.riskId}::${rel.recommendationId}`);
                  return (
                    <tr key={`${rel.riskId}-${rel.recommendationId}-${i}`} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        <Link href={`/admin/action-catalog/relationships/${compositeId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {entryName(rel.riskId)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        <Link href={`/admin/action-catalog/relationships/${compositeId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {entryName(rel.recommendationId)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Button type="button" variant="link" size="sm" className="text-destructive p-0 h-auto" onClick={() => openDelete(rel)}>Remove</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
        </>
      )}

      {modalMode === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-create-rel-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="modal-create-rel-title" className="text-lg font-semibold mb-4">Add risk–recommendation link</h2>
            {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-2">
                <Label>Risk</Label>
                <Select value={createForm.riskId || '_none'} onValueChange={(v) => setCreateForm((f) => ({ ...f, riskId: v === '_none' ? '' : v }))} required>
                  <SelectTrigger><SelectValue placeholder="Select risk" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select risk</SelectItem>
                    {risks.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recommendation (mitigates this risk)</Label>
                <Select value={createForm.recommendationId || '_none'} onValueChange={(v) => setCreateForm((f) => ({ ...f, recommendationId: v === '_none' ? '' : v }))} required>
                  <SelectTrigger><SelectValue placeholder="Select recommendation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select recommendation</SelectItem>
                    {recommendations.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" disabled={formSaving}>Add link</Button>
                <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMode === 'delete' && deleteRel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-delete-rel-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="modal-delete-rel-title" className="text-lg font-semibold mb-2">Remove link</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Remove the link between &quot;{entryName(deleteRel.riskId)}&quot; and &quot;{entryName(deleteRel.recommendationId)}&quot;?
            </p>
            {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={formSaving}>Remove</Button>
              <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
