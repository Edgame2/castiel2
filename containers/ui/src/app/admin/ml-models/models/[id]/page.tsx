'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const STATUSES = ['draft', 'training', 'evaluating', 'ready', 'deployed', 'archived', 'failed'] as const;

interface ModelItem {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  description?: string;
  modelPath?: string;
  limitations?: string[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function MLModelsModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [model, setModel] = useState<ModelItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [modelPath, setModelPath] = useState('');
  const [limitationsStr, setLimitationsStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchModel = useCallback(async () => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/ml/models/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) {
          setModel(null);
          return null;
        }
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: ModelItem | null) => {
        if (data) {
          setModel(data);
          setName(data.name ?? '');
          setDescription(data.description ?? '');
          setStatus(data.status ?? 'draft');
          setModelPath(data.modelPath ?? '');
          setLimitationsStr(Array.isArray(data.limitations) ? data.limitations.join('\n') : '');
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setModel(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !model || saving) return;
    setSaveError(null);
    setSaving(true);
    const limitations = limitationsStr.split('\n').map((s) => s.trim()).filter(Boolean);
    fetch(`${apiBase}/api/v1/ml/models/${encodeURIComponent(model.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        status: status as (typeof STATUSES)[number],
        modelPath: modelPath.trim() || undefined,
        limitations: limitations.length ? limitations : undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || r.statusText)));
        setEditing(false);
        fetchModel();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !model || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/ml/models/${encodeURIComponent(model.id)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (r.status === 204 || r.status === 404) {
          router.push('/admin/ml-models/models');
          return;
        }
        return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || 'Delete failed')));
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Delete failed'))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/ml-models">ML Models</Link><span>/</span>
          <Link href="/admin/ml-models/models">Models</Link><span>/</span>
          <span className="text-foreground">Model</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && model && (
          <>
            <h1 className="text-xl font-semibold mb-4">{model.name ?? model.id}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {model.id}</p>
                <p><span className="text-gray-500">Name:</span> {model.name ?? '—'}</p>
                <p><span className="text-gray-500">Type:</span> {model.type ?? '—'}</p>
                <p><span className="text-gray-500">Status:</span> {model.status ?? '—'}</p>
                {model.description && <p><span className="text-gray-500">Description:</span> {model.description}</p>}
                {model.modelPath && <p><span className="text-gray-500">Model path:</span> {model.modelPath}</p>}
                {model.version != null && <p><span className="text-gray-500">Version:</span> {model.version}</p>}
                {model.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(model.createdAt).toLocaleString()}</p>}
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" rows={2} />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="modelPath" className="block text-sm font-medium mb-1">Model path</label>
                  <input id="modelPath" type="text" value={modelPath} onChange={(e) => setModelPath(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="limitations" className="block text-sm font-medium mb-1">Limitations (one per line)</label>
                  <textarea id="limitations" value={limitationsStr} onChange={(e) => setLimitationsStr(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" rows={3} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this model?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !model && <p className="text-sm text-gray-500">Model not found.</p>}
        <p className="mt-4"><Link href="/admin/ml-models/models" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Models</Link></p>
      </div>
    </div>
  );
}
