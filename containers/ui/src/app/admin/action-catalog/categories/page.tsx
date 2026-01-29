/**
 * Super Admin: Action Catalog — Categories (§2.2)
 * GET/POST/PUT/DELETE /api/v1/action-catalog/categories via gateway (risk-catalog).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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

export default function ActionCatalogCategoriesPage() {
  const [categories, setCategories] = useState<ActionCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [editCategory, setEditCategory] = useState<ActionCatalogCategory | null>(null);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_CREATE_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteReassignTo, setDeleteReassignTo] = useState('');

  const fetchCategories = useCallback(async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/categories`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setCategories(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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

  const closeModal = () => {
    setModalMode(null);
    setEditCategory(null);
    setFormError(null);
    setDeleteReassignTo('');
  };

  const openCreate = () => {
    setCreateForm({ ...DEFAULT_CREATE_FORM, order: categories.length });
    setEditCategory(null);
    setModalMode('create');
    setFormError(null);
  };

  const openEdit = (cat: ActionCatalogCategory) => {
    setEditCategory(cat);
    setEditForm({
      displayName: cat.displayName,
      type: cat.type,
      icon: cat.icon || '📁',
      color: cat.color || '#6b7280',
      description: cat.description || '',
      order: cat.order,
    });
    setModalMode('edit');
    setFormError(null);
  };

  const openDelete = (cat: ActionCatalogCategory) => {
    setEditCategory(cat);
    const others = categories.filter((c) => c.id !== cat.id);
    setDeleteReassignTo(others[0]?.id ?? '');
    setModalMode('delete');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        displayName: createForm.displayName.trim(),
        type: createForm.type,
        icon: createForm.icon.trim() || '📁',
        color: createForm.color.trim() || '#6b7280',
        description: createForm.description.trim() || undefined,
        order: createForm.order,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/categories`, {
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
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl || !editCategory) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        displayName: editForm.displayName.trim(),
        type: editForm.type,
        icon: editForm.icon.trim() || '📁',
        color: editForm.color.trim() || '#6b7280',
        description: editForm.description.trim() || undefined,
        order: editForm.order,
      };
      const res = await fetch(
        `${apiBaseUrl}/api/v1/action-catalog/categories/${encodeURIComponent(editCategory.id)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchCategories();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!apiBaseUrl || !editCategory) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const url = new URL(
        `${apiBaseUrl}/api/v1/action-catalog/categories/${encodeURIComponent(editCategory.id)}`
      );
      if (deleteReassignTo) url.searchParams.set('reassignTo', deleteReassignTo);
      const res = await fetch(url.toString(), {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchCategories();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

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

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Add category
          </button>
          <button
            type="button"
            onClick={fetchCategories}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
          >
            Refresh
          </button>
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
          <button
            type="button"
            onClick={() => fetchCategories()}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && apiBaseUrl && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full rounded-lg border bg-white dark:bg-gray-900 p-6">
              <p className="text-sm text-gray-500">No categories yet. Create one to organize entries by risk / recommendation / both.</p>
            </div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-lg border bg-white dark:bg-gray-900 p-4 flex flex-col"
                style={{ borderLeftWidth: 4, borderLeftColor: cat.color || '#6b7280' }}
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
                <h3 className="font-semibold mt-2 text-gray-900 dark:text-gray-100">{cat.displayName}</h3>
                {cat.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
                )}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 flex flex-wrap gap-x-4">
                  <span>Entries: {cat.entriesCount ?? 0}</span>
                  <span>Active: {cat.activeEntriesCount ?? 0}</span>
                  {cat.avgEffectiveness != null && (
                    <span>Effectiveness: {(Number(cat.avgEffectiveness) * 100).toFixed(0)}%</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDelete(cat)}
                    className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {modalMode === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-create-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 id="modal-create-title" className="text-lg font-semibold mb-4">Create category</h2>
              {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Display name</label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as CategoryType }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="risk">Risk</option>
                    <option value="recommendation">Recommendation</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Icon (emoji or text)</label>
                  <input
                    type="text"
                    value={createForm.icon}
                    onChange={(e) => setCreateForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="e.g. 📁 or folder"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color (hex)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createForm.color}
                      onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                      className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                      placeholder="#6b7280"
                    />
                    <div className="flex gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCreateForm((f) => ({ ...f, color: c }))}
                          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Order</label>
                  <input
                    type="number"
                    value={createForm.order}
                    onChange={(e) => setCreateForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    min={0}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={formSaving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                    Create
                  </button>
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                    Cancel
                  </button>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Display name</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as CategoryType }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="risk">Risk</option>
                    <option value="recommendation">Recommendation</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Icon (emoji or text)</label>
                  <input
                    type="text"
                    value={editForm.icon}
                    onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color (hex)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.color}
                      onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                      className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                    <div className="flex gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, color: c }))}
                          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Order</label>
                  <input
                    type="number"
                    value={editForm.order}
                    onChange={(e) => setEditForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    min={0}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={formSaving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                    Save
                  </button>
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                    Cancel
                  </button>
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
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reassign entries to</label>
                <select
                  value={deleteReassignTo}
                  onChange={(e) => setDeleteReassignTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">— None (entries keep category id)</option>
                  {categories
                    .filter((c) => c.id !== editCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={formSaving}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                Delete
              </button>
              <button type="button" onClick={closeModal} className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
