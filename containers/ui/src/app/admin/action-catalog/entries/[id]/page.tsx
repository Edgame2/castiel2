/**
 * Admin: Action catalog entry detail/edit — GET/PUT/DELETE /api/v1/action-catalog/entries/:entryId (gateway → risk_catalog).
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type EntryType = 'risk' | 'recommendation';
type EntryStatus = 'active' | 'deprecated' | 'draft';

interface ActionCatalogEntry {
  id: string;
  type: EntryType;
  category: string;
  subcategory?: string;
  name: string;
  displayName: string;
  description: string;
  status?: EntryStatus;
  applicableIndustries?: string[];
  applicableStages?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function ActionCatalogEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [entry, setEntry] = useState<ActionCatalogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<EntryStatus>('active');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchEntry = useCallback(() => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/action-catalog/entries/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) throw new Error('Entry not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: ActionCatalogEntry) => {
        setEntry(data);
        setDisplayName(data.displayName ?? '');
        setDescription(data.description ?? '');
        setCategory(data.category ?? '');
        setStatus((data.status as EntryStatus) ?? 'active');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setEntry(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !id || !entry || saving) return;
    setSaveError(null);
    setSaving(true);
    fetch(`${apiBase}/api/v1/action-catalog/entries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        description: description.trim(),
        category: category.trim(),
        status,
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        setEditing(false);
        fetchEntry();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !id || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/action-catalog/entries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok && r.status !== 204) return r.json().then((body: { error?: { message?: string } }) => { throw new Error(body?.error?.message ?? r.statusText); });
        router.push('/admin/action-catalog/entries');
      })
      .catch((e) => {
        setSaveError(e instanceof Error ? e.message : 'Delete failed');
        setDeleting(false);
      });
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/action-catalog" className="hover:underline">Action Catalog</Link>
          <span>/</span>
          <Link href="/admin/action-catalog/entries" className="hover:underline">Entries</Link>
          <span>/</span>
          <span className="text-foreground">Entry</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && entry && (
          <>
            <h1 className="text-xl font-semibold mb-4">{entry.displayName}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {entry.id}</p>
                <p><span className="text-gray-500">Type:</span> {entry.type}</p>
                <p><span className="text-gray-500">Category:</span> {entry.category}</p>
                <p><span className="text-gray-500">Name:</span> {entry.name}</p>
                <p><span className="text-gray-500">Status:</span> {entry.status ?? 'active'}</p>
                {entry.description && <p><span className="text-gray-500">Description:</span> {entry.description}</p>}
                {entry.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(entry.createdAt).toLocaleString()}</p>}
                {entry.updatedAt && <p><span className="text-gray-500">Updated:</span> {new Date(entry.updatedAt).toLocaleString()}</p>}
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium mb-1">Display name</label>
                  <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-1">Category</label>
                  <input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value as EntryStatus)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this entry? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
        <p className="mt-4"><Link href="/admin/action-catalog/entries" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Entries</Link></p>
      </div>
    </div>
  );
}
