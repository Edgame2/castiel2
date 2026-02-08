/**
 * Admin: Action catalog category detail/edit — GET/PUT/DELETE /api/v1/action-catalog/categories/:id (gateway → risk_catalog).
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type CategoryType = 'risk' | 'recommendation' | 'both';

interface Category {
  id: string;
  displayName: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  description?: string;
  order?: number;
  entriesCount?: number;
}

function normalizeHex(color: string): string {
  const hex = color.replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `#${hex}`;
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  return '#6b7280';
}

export default function ActionCatalogCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<CategoryType>('both');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6b7280');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCategory = useCallback(() => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/action-catalog/categories/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) throw new Error('Category not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: Category) => {
        setCategory(data);
        setDisplayName(data.displayName ?? '');
        setType((data.type as CategoryType) ?? 'both');
        setIcon(data.icon ?? '📁');
        setColor(normalizeHex(data.color ?? '#6b7280'));
        setDescription(data.description ?? '');
        setOrder(data.order ?? 0);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setCategory(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !id || !category || saving) return;
    setSaveError(null);
    setSaving(true);
    fetch(`${apiBase}/api/v1/action-catalog/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        type,
        icon: icon.trim() || '📁',
        color: normalizeHex(color.trim() || '#6b7280'),
        description: description.trim() || undefined,
        order,
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        setEditing(false);
        fetchCategory();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !id || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/action-catalog/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) return r.json().then((body: { error?: { message?: string } }) => { throw new Error(body?.error?.message ?? r.statusText); });
        router.push('/admin/action-catalog/categories');
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
          <Link href="/admin/action-catalog/categories" className="hover:underline">Categories</Link>
          <span>/</span>
          <span className="text-foreground">Category</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && category && (
          <>
            <h1 className="text-xl font-semibold mb-4">{category.displayName}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">Type:</span> {category.type}</p>
                <p><span className="text-gray-500">Icon:</span> {category.icon ?? '—'}</p>
                <p><span className="text-gray-500">Color:</span> <span style={{ color: category.color }}>{category.color ?? '—'}</span></p>
                {category.description && <p><span className="text-gray-500">Description:</span> {category.description}</p>}
                <p><span className="text-gray-500">Order:</span> {category.order ?? 0}</p>
                {category.entriesCount != null && <p><span className="text-gray-500">Entries:</span> {category.entriesCount}</p>}
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
                  <label htmlFor="type" className="block text-sm font-medium mb-1">Type</label>
                  <select id="type" value={type} onChange={(e) => setType(e.target.value as CategoryType)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <option value="risk">Risk</option>
                    <option value="recommendation">Recommendation</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="icon" className="block text-sm font-medium mb-1">Icon</label>
                  <input id="icon" type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium mb-1">Color</label>
                  <input id="color" type="text" value={color} onChange={(e) => setColor(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="order" className="block text-sm font-medium mb-1">Order</label>
                  <input id="order" type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)} min={0} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this category? Entries may need to be reassigned.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
        <p className="mt-4"><Link href="/admin/action-catalog/categories" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Categories</Link></p>
      </div>
    </div>
  );
}
