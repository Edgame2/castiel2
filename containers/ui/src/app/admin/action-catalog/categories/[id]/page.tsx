/**
 * Admin: Action catalog category detail/edit — GET/PUT/DELETE /api/v1/action-catalog/categories/:id (gateway → risk_catalog).
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
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
                    <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="recommendation">Recommendation</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Order</Label>
                  <Input id="order" type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)} min={0} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this category? Entries may need to be reassigned.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
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
