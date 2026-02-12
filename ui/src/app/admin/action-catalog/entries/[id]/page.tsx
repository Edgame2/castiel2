/**
 * Admin: Action catalog entry detail/edit — GET/PUT/DELETE /api/v1/action-catalog/entries/:entryId (gateway → risk_catalog).
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    if (!getApiBaseUrl() || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/action-catalog/entries/${encodeURIComponent(id)}`)
      .then((r: Response) => {
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
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setEntry(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl() || !id || !entry || saving) return;
    setSaveError(null);
    setSaving(true);
    apiFetch(`/api/v1/action-catalog/entries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        description: description.trim(),
        category: category.trim(),
        status,
      }),
    })
      .then((r: Response) => r.json().catch(() => ({})))
      .then((data: { error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        setEditing(false);
        fetchEntry();
      })
      .catch(() => setSaveError(GENERIC_ERROR_MESSAGE))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!getApiBaseUrl() || !id || deleting) return;
    setDeleting(true);
    apiFetch(`/api/v1/action-catalog/entries/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then((r: Response) => {
        if (!r.ok && r.status !== 204) return r.json().then((body: { error?: { message?: string } }) => { throw new Error(body?.error?.message ?? r.statusText); });
        router.push('/admin/action-catalog/entries');
      })
      .catch(() => {
        setSaveError(GENERIC_ERROR_MESSAGE);
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
                  <Button type="button" onClick={() => setEditing(true)}>Edit</Button>
                  <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>Delete</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as EntryStatus)}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this entry? This cannot be undone.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
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
