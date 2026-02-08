'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

const FEATURE_TYPES = ['numeric', 'categorical', 'text', 'datetime', 'boolean'] as const;

interface FeatureItem {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  source?: string;
  transformation?: string;
  statistics?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export default function FeatureEngineeringFeatureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [feature, setFeature] = useState<FeatureItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('numeric');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [transformation, setTransformation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchFeature = useCallback(async () => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/ml/features/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) {
          setFeature(null);
          return null;
        }
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: FeatureItem | null) => {
        if (data) {
          setFeature(data);
          setName(data.name ?? '');
          setType(data.type ?? 'numeric');
          setDescription(data.description ?? '');
          setSource(data.source ?? '');
          setTransformation(data.transformation ?? '');
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setFeature(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchFeature();
  }, [fetchFeature]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !feature || saving) return;
    setSaveError(null);
    setSaving(true);
    const body = {
      name: name.trim(),
      type: type as (typeof FEATURE_TYPES)[number],
      description: description.trim() || undefined,
      source: source.trim() || undefined,
      transformation: transformation.trim() || undefined,
    };
    fetch(`${apiBase}/api/v1/ml/features/${encodeURIComponent(feature.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || r.statusText)));
        setEditing(false);
        fetchFeature();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !feature || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/ml/features/${encodeURIComponent(feature.id)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (r.status === 204 || r.status === 404) {
          router.push('/admin/feature-engineering/features');
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
          <Link href="/admin/feature-engineering">Feature Engineering</Link><span>/</span>
          <Link href="/admin/feature-engineering/features">Features</Link><span>/</span>
          <span className="text-foreground">Feature</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && feature && (
          <>
            <h1 className="text-xl font-semibold mb-4">{feature.name ?? feature.id}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {feature.id}</p>
                <p><span className="text-gray-500">Name:</span> {feature.name ?? '—'}</p>
                <p><span className="text-gray-500">Type:</span> {feature.type ?? '—'}</p>
                {feature.description != null && feature.description !== '' && <p><span className="text-gray-500">Description:</span> {feature.description}</p>}
                {feature.source != null && feature.source !== '' && <p><span className="text-gray-500">Source:</span> {feature.source}</p>}
                {feature.transformation != null && feature.transformation !== '' && <p><span className="text-gray-500">Transformation:</span> {feature.transformation}</p>}
                {feature.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(feature.createdAt).toLocaleString()}</p>}
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
                  <label htmlFor="type" className="block text-sm font-medium mb-1">Type *</label>
                  <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    {FEATURE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" rows={2} />
                </div>
                <div>
                  <label htmlFor="source" className="block text-sm font-medium mb-1">Source</label>
                  <input id="source" type="text" value={source} onChange={(e) => setSource(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="transformation" className="block text-sm font-medium mb-1">Transformation</label>
                  <input id="transformation" type="text" value={transformation} onChange={(e) => setTransformation(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this feature?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !feature && (
          <p className="text-sm text-gray-500">Feature not found.</p>
        )}
        <p className="mt-4"><Link href="/admin/feature-engineering/features" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Features</Link></p>
      </div>
    </div>
  );
}
