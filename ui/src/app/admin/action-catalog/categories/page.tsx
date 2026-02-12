/**
 * Super Admin: Action Catalog — Categories (§2.2)
 * GET/POST/PUT/DELETE /api/v1/action-catalog/categories via gateway (risk-catalog).
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

type CategoryType = 'risk' | 'recommendation' | 'both';

interface ActionCatalogCategory {
  id: string;
  displayName: string;
  type: CategoryType;
  icon: string;
  color: string;
  description: string;
  order: number;
  entriesCount?: number;
  activeEntriesCount?: number;
  avgEffectiveness?: number;
}

const DEFAULT_CREATE_FORM = {
  displayName: '',
  type: 'both' as CategoryType,
  icon: '📁',
  color: '#6b7280',
  description: '',
  order: 0,
};

const COLOR_PRESETS = ['#6b7280', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#9333ea'];

/** §2.2.2 Icon picker: emoji options with searchable labels */
const ICON_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: '📁', label: 'folder' },
  { emoji: '📊', label: 'chart' },
  { emoji: '⚠️', label: 'warning' },
  { emoji: '✅', label: 'check' },
  { emoji: '📌', label: 'pin' },
  { emoji: '🔗', label: 'link' },
  { emoji: '💡', label: 'idea' },
  { emoji: '📋', label: 'clipboard' },
  { emoji: '🎯', label: 'target' },
  { emoji: '📈', label: 'trend' },
  { emoji: '🛡️', label: 'shield' },
  { emoji: '⚙️', label: 'settings' },
  { emoji: '📦', label: 'package' },
  { emoji: '🔔', label: 'bell' },
  { emoji: '📝', label: 'note' },
  { emoji: '🏷️', label: 'tag' },
  { emoji: '🔴', label: 'risk' },
  { emoji: '🟢', label: 'recommendation' },
];

function normalizeHex(color: string): string {
  const hex = color.replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `#${hex}`;
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  return '#6b7280';
}

export default function ActionCatalogCategoriesPage() {
  const [categories, setCategories] = useState<ActionCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<CategoryType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'' | 'displayName' | 'type' | 'order' | 'entriesCount'>('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'merge' | null>(null);
  const [editCategory, setEditCategory] = useState<ActionCatalogCategory | null>(null);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_CREATE_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteReassignTo, setDeleteReassignTo] = useState('');
  const [iconSearch, setIconSearch] = useState('');
  const [reorderLoading, setReorderLoading] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');

  const orderedIds = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((c) => c.id),
    [categories]
  );

  const fetchCategories = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/action-catalog/categories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setCategories(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    document.title = 'Categories | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const filtered = categories.filter((cat) => {
    if (typeFilter && cat.type !== typeFilter) return false;
    if (q) {
      const name = (cat.displayName ?? '').toLowerCase();
      const desc = (cat.description ?? '').toLowerCase();
      const id = (cat.id ?? '').toLowerCase();
      if (!name.includes(q) && !desc.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  const sorted = (() => {
    if (!sortBy) return filtered;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let base: number;
      if (sortBy === 'displayName') {
        base = (a.displayName ?? a.id ?? '').localeCompare(b.displayName ?? b.id ?? '');
      } else if (sortBy === 'type') {
        base = (a.type ?? '').localeCompare(b.type ?? '');
      } else if (sortBy === 'order') {
        base = (a.order ?? 0) - (b.order ?? 0);
      } else {
        base = (a.entriesCount ?? 0) - (b.entriesCount ?? 0);
      }
      return mult * base;
    });
  })();

  const closeModal = () => {
    setModalMode(null);
    setEditCategory(null);
    setFormError(null);
    setDeleteReassignTo('');
    setIconSearch('');
    setMergeSourceId('');
    setMergeTargetId('');
  };

  const openCreate = () => {
    setCreateForm({ ...DEFAULT_CREATE_FORM, order: categories.length });
    setEditCategory(null);
    setModalMode('create');
    setFormError(null);
    setIconSearch('');
  };

  const openEdit = (cat: ActionCatalogCategory) => {
    setEditCategory(cat);
    setEditForm({
      displayName: cat.displayName,
      type: cat.type,
      icon: cat.icon || '📁',
      color: normalizeHex(cat.color || '#6b7280'),
      description: cat.description || '',
      order: cat.order,
    });
    setModalMode('edit');
    setFormError(null);
    setIconSearch('');
  };

  const filteredIconOptions = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return ICON_OPTIONS;
    return ICON_OPTIONS.filter((o) => o.label.toLowerCase().includes(q) || o.emoji.includes(q));
  }, [iconSearch]);

  const openDelete = (cat: ActionCatalogCategory) => {
    setEditCategory(cat);
    const others = categories.filter((c) => c.id !== cat.id);
    setDeleteReassignTo(others[0]?.id ?? '');
    setModalMode('delete');
  };

  const openMerge = () => {
    setMergeSourceId('');
    setMergeTargetId('');
    setFormError(null);
    setModalMode('merge');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl()) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        displayName: createForm.displayName.trim(),
        type: createForm.type,
        icon: createForm.icon.trim() || '📁',
        color: normalizeHex(createForm.color.trim() || '#6b7280'),
        description: createForm.description.trim() || undefined,
        order: createForm.order,
      };
      const res = await apiFetch('/api/v1/action-catalog/categories', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchCategories();
    } catch (e) {
      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      setFormSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl() || !editCategory) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        displayName: editForm.displayName.trim(),
        type: editForm.type,
        icon: editForm.icon.trim() || '📁',
        color: normalizeHex(editForm.color.trim() || '#6b7280'),
        description: editForm.description.trim() || undefined,
        order: editForm.order,
      };
      const res = await apiFetch(
        `/api/v1/action-catalog/categories/${encodeURIComponent(editCategory.id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchCategories();
    } catch (e) {
      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!getApiBaseUrl() || !editCategory) return;
    setFormSaving(true);
    setFormError(null);
    try {
      let path = `/api/v1/action-catalog/categories/${encodeURIComponent(editCategory.id)}`;
      if (deleteReassignTo) path += `?reassignTo=${encodeURIComponent(deleteReassignTo)}`;
      const res = await apiFetch(path, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchCategories();
    } catch (e) {
      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      setFormSaving(false);
    }
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl()) return;
    if (!mergeSourceId.trim() || !mergeTargetId.trim()) {
      setFormError('Select both source and target category.');
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      setFormError('Source and target must be different.');
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const res = await apiFetch('/api/v1/action-catalog/categories/merge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: mergeSourceId, targetId: mergeTargetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchCategories();
    } catch (e) {
      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      setFormSaving(false);
    }
  };

  const handleReorder = useCallback(
    async (newOrder: string[]) => {
      if (!getApiBaseUrl() || newOrder.length === 0) return;
      setReorderLoading('_');
      try {
        const res = await apiFetch('/api/v1/action-catalog/categories/reorder', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryIds: newOrder }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
        await fetchCategories();
      } catch (e) {
        setError(GENERIC_ERROR_MESSAGE);
      } finally {
        setReorderLoading(null);
      }
    },
    [fetchCategories]
  );

  const handleMoveUp = useCallback(
    (categoryId: string) => {
      const i = orderedIds.indexOf(categoryId);
      if (i <= 0) return;
      const newOrder = [...orderedIds];
      [newOrder[i - 1], newOrder[i]] = [newOrder[i], newOrder[i - 1]];
      handleReorder(newOrder);
    },
    [orderedIds, handleReorder]
  );

  const handleMoveDown = useCallback(
    (categoryId: string) => {
      const i = orderedIds.indexOf(categoryId);
      if (i < 0 || i >= orderedIds.length - 1) return;
      const newOrder = [...orderedIds];
      [newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]];
      handleReorder(newOrder);
    },
    [orderedIds, handleReorder]
  );

  /** §2.2.1 Drag-and-drop to reorder: set drag data and state */
  const handleDragStart = useCallback((e: React.DragEvent, categoryId: string) => {
    if (reorderLoading) return;
    e.dataTransfer.setData('text/plain', categoryId);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(categoryId);
  }, [reorderLoading]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTargetId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragId && dragId !== targetCategoryId) setDropTargetId(targetCategoryId);
  }, [dragId]);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetCategoryId: string) => {
      e.preventDefault();
      setDropTargetId(null);
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === targetCategoryId || reorderLoading) return;
      const without = orderedIds.filter((id) => id !== draggedId);
      const targetIndex = without.indexOf(targetCategoryId);
      if (targetIndex === -1) return;
      const newOrder = [...without.slice(0, targetIndex), draggedId, ...without.slice(targetIndex)];
      handleReorder(newOrder);
      setDragId(null);
    },
    [orderedIds, handleReorder, reorderLoading]
  );

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
        <span className="text-sm font-medium">Categories</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Categories</h1>
      <p className="text-muted-foreground mb-4">
        Manage catalog categories (risk / recommendation / both). Reorder, edit display name, icon, color (§2.2).
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
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Categories
        </span>
        <Link
          href="/admin/action-catalog/relationships"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Relationships
        </Link>
      </nav>

      {!getApiBaseUrl() && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {getApiBaseUrl() && (
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <Button asChild size="sm">
            <Link href="/admin/action-catalog/categories/new" aria-label="Create category (page)">New category</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openCreate} aria-label="Add category (modal)">
            Add category (modal)
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openMerge} disabled={categories.length < 2} title="Merge categories (§2.2.1)" aria-label="Merge categories (§2.2.1)">
            Merge categories
          </Button>
          <div className="space-y-1">
            <Label>Type (§2.2.1)</Label>
            <Select value={typeFilter || '_all'} onValueChange={(v) => setTypeFilter(v === '_all' ? '' : (v as CategoryType))}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Search (§2.2.1)</Label>
            <Input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name or description…" className="w-48 h-9 text-sm" aria-label="Search categories by name or description" />
          </div>
          <div className="space-y-1">
            <Label>Sort by (§2.2.1)</Label>
            <Select value={sortBy || '_default'} onValueChange={(v) => setSortBy(v === '_default' ? '' : (v as typeof sortBy))}>
              <SelectTrigger className="w-36 h-9" aria-label="Sort by"><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_default">Default</SelectItem>
                <SelectItem value="displayName">Name</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="entriesCount">Entries count</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Order</Label>
            <Select value={sortDir} onValueChange={(v) => setSortDir(v as 'asc' | 'desc')}>
              <SelectTrigger className="w-32 h-9" aria-label="Sort direction"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fetchCategories} aria-label="Refresh categories">Refresh</Button>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-500">Loading categories…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          <Button type="button" variant="link" size="sm" className="mt-2" onClick={() => fetchCategories()}>Retry</Button>
        </div>
      )}

      {!loading && getApiBaseUrl() && !error && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold">Categories</h2>
            <Button type="button" variant="outline" size="sm" onClick={fetchCategories} disabled={loading} aria-label="Refresh categories">Refresh</Button>
          </div>
          {sorted.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2" aria-live="polite">
              §2.2.1: Drag cards to reorder, or use ↑ Up / ↓ Down.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.length === 0 ? (
            <div className="col-span-full rounded-lg border bg-white dark:bg-gray-900 p-6">
              <p className="text-sm text-gray-500">
                {categories.length === 0
                  ? 'No categories yet. Create one to organize entries by risk / recommendation / both.'
                  : 'No categories match the current filters.'}
              </p>
            </div>
          ) : (
            sorted.map((cat) => (
              <div
                key={cat.id}
                draggable={!reorderLoading}
                onDragStart={(e) => handleDragStart(e, cat.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cat.id)}
                className={`rounded-lg border bg-white dark:bg-gray-900 p-4 flex flex-col transition-opacity ${
                  dragId === cat.id ? 'opacity-50' : ''
                } ${dropTargetId === cat.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                style={{ borderLeftWidth: 4, borderLeftColor: cat.color || '#6b7280' }}
                aria-label={`Category ${cat.displayName}. Drag to reorder.`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-lg" title={cat.icon || 'category'}>
                    {cat.icon || '📁'}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    {cat.type}
                  </span>
                </div>
                <h3 className="font-semibold mt-2 text-gray-900 dark:text-gray-100">
                <Link href={`/admin/action-catalog/categories/${cat.id}`} className="hover:underline text-blue-600 dark:text-blue-400">
                  {cat.displayName}
                </Link>
              </h3>
                {cat.description && (
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{cat.description}</ReactMarkdown>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 flex flex-wrap gap-x-4">
                  <span>Entries: {cat.entriesCount ?? 0}</span>
                  <span>Active: {cat.activeEntriesCount ?? 0}</span>
                  {cat.avgEffectiveness != null && (
                    <span>Effectiveness: {(Number(cat.avgEffectiveness) * 100).toFixed(0)}%</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(() => {
                    const orderIndex = orderedIds.indexOf(cat.id);
                    const canMoveUp = orderIndex > 0 && !reorderLoading;
                    const canMoveDown = orderIndex >= 0 && orderIndex < orderedIds.length - 1 && !reorderLoading;
                    return (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleMoveUp(cat.id)} disabled={!canMoveUp} title="Move up (§2.2.1)">↑ Up</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleMoveDown(cat.id)} disabled={!canMoveDown} title="Move down (§2.2.1)">↓ Down</Button>
                      </>
                    );
                  })()}
                  <Button type="button" variant="link" size="sm" className="text-blue-600 dark:text-blue-400" onClick={() => openEdit(cat)}>Edit</Button>
                  <Button type="button" variant="link" size="sm" className="text-destructive" onClick={() => openDelete(cat)}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </div>
        </>
      )}

      {modalMode === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-create-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 id="modal-create-title" className="text-lg font-semibold mb-4">Create category</h2>
              {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input value={createForm.displayName} onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={createForm.type} onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v as CategoryType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="recommendation">Recommendation</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Icon (§2.2.2 picker with search)</Label>
                  <Input type="search" value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} placeholder="Search icons…" className="mb-2 text-sm" aria-label="Search icon" />
                  <div className="flex flex-wrap gap-2 mb-2">
                    {filteredIconOptions.map((o) => (
                      <Button key={`${o.emoji}-${o.label}`} type="button" variant={createForm.icon === o.emoji ? 'secondary' : 'outline'} size="icon" className="w-9 h-9 text-lg" onClick={() => setCreateForm((f) => ({ ...f, icon: o.emoji }))} title={o.label}>{o.emoji}</Button>
                    ))}
                  </div>
                  <Input value={createForm.icon} onChange={(e) => setCreateForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Custom emoji" className="text-sm" aria-label="Custom icon" />
                </div>
                <div className="space-y-2">
                  <Label>Color (§2.2.2 picker with presets)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="color" value={normalizeHex(createForm.color)} onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-10 p-1 rounded border cursor-pointer" aria-label="Color picker" />
                    <Input value={createForm.color} onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))} placeholder="#6b7280" className="w-24 h-9 text-sm font-mono" />
                    <div className="flex gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <Button key={c} type="button" variant="outline" size="icon" className="w-6 h-6 rounded" style={{ backgroundColor: c }} title={c} onClick={() => setCreateForm((f) => ({ ...f, color: c }))} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (§2.2.2 rich text / Markdown)</Label>
                  <Textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Supports **bold**, *italic*, lists, links…" className="text-sm" />
                  {createForm.description && (
                    <div className="mt-1 p-2 rounded bg-gray-50 dark:bg-gray-800/50 text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{createForm.description}</ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Input type="number" value={createForm.order} onChange={(e) => setCreateForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))} min={0} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={formSaving} size="sm">Create</Button>
                  <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'edit' && editCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 id="modal-edit-title" className="text-lg font-semibold mb-4">Edit category</h2>
              {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
              <form onSubmit={handleUpdate} className="space-y-3">
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input value={editForm.displayName} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v as CategoryType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="recommendation">Recommendation</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Icon (§2.2.2 picker with search)</Label>
                  <Input type="search" value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} placeholder="Search icons…" className="mb-2 text-sm" aria-label="Search icon" />
                  <div className="flex flex-wrap gap-2 mb-2">
                    {filteredIconOptions.map((o) => (
                      <Button key={`${o.emoji}-${o.label}`} type="button" variant={editForm.icon === o.emoji ? 'secondary' : 'outline'} size="icon" className="w-9 h-9 text-lg" onClick={() => setEditForm((f) => ({ ...f, icon: o.emoji }))} title={o.label}>{o.emoji}</Button>
                    ))}
                  </div>
                  <Input value={editForm.icon} onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Custom emoji" className="text-sm" aria-label="Custom icon" />
                </div>
                <div className="space-y-2">
                  <Label>Color (§2.2.2 picker with presets)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="color" value={normalizeHex(editForm.color)} onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-10 p-1 rounded border cursor-pointer" aria-label="Color picker" />
                    <Input value={editForm.color} onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))} className="w-24 h-9 text-sm font-mono" />
                    <div className="flex gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <Button key={c} type="button" variant="outline" size="icon" className="w-6 h-6 rounded" style={{ backgroundColor: c }} title={c} onClick={() => setEditForm((f) => ({ ...f, color: c }))} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (§2.2.2 rich text / Markdown)</Label>
                  <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Supports **bold**, *italic*, lists, links…" className="text-sm" />
                  {editForm.description && (
                    <div className="mt-1 p-2 rounded bg-gray-50 dark:bg-gray-800/50 text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{editForm.description}</ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Input type="number" value={editForm.order} onChange={(e) => setEditForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))} min={0} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={formSaving} size="sm">Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'delete' && editCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="modal-delete-title" className="text-lg font-semibold mb-2">Delete category</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Delete &quot;{editCategory.displayName}&quot;? {(editCategory.entriesCount ?? 0) > 0
                ? `${editCategory.entriesCount} entries use this category. Reassign them to another category below, or leave empty to delete without reassignment.`
                : 'This category has no entries.'}
            </p>
            {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
            {categories.filter((c) => c.id !== editCategory.id).length > 0 && (
              <div className="mb-4 space-y-2">
                <Label>Reassign entries to</Label>
                <Select value={deleteReassignTo || '_none'} onValueChange={(v) => setDeleteReassignTo(v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="— None (entries keep category id)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None (entries keep category id)</SelectItem>
                    {categories.filter((c) => c.id !== editCategory.id).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={formSaving}>Delete</Button>
              <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'merge' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-merge-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="modal-merge-title" className="text-lg font-semibold mb-2">Merge categories (§2.2.1)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Merge the source category into the target. All entries in the source will be moved to the target; the source category will be deleted.
            </p>
            <form onSubmit={handleMerge} className="space-y-4">
              <div className="space-y-2">
                <Label>Source category (will be deleted)</Label>
                <Select value={mergeSourceId || '_'} onValueChange={(v) => setMergeSourceId(v === '_' ? '' : v)} aria-label="Source category">
                  <SelectTrigger><SelectValue placeholder="— Select —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">— Select —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.displayName} ({c.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target category (entries move here)</Label>
                <Select value={mergeTargetId || '_'} onValueChange={(v) => setMergeTargetId(v === '_' ? '' : v)} aria-label="Target category">
                  <SelectTrigger><SelectValue placeholder="— Select —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">— Select —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.displayName} ({c.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={formSaving} size="sm">{formSaving ? 'Merging…' : 'Merge'}</Button>
                <Button type="button" variant="outline" size="sm" onClick={closeModal} disabled={formSaving}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
