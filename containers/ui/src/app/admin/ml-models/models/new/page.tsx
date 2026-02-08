'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const TYPES = ['classification', 'regression', 'clustering', 'recommendation', 'forecasting', 'anomaly_detection'] as const;

export default function MLModelsModelNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('classification');
  const [featuresStr, setFeaturesStr] = useState('');
  const [description, setDescription] = useState('');
  const [algorithm, setAlgorithm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const features = featuresStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (!apiBase || !name.trim() || features.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/ml/models`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, features, description: description.trim() || undefined, algorithm: algorithm.trim() || undefined }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || `HTTP ${r.status}`)));
        return r.json();
      })
      .then((saved: { id?: string }) => {
        if (saved?.id) router.push(`/admin/ml-models/models/${encodeURIComponent(saved.id)}`);
        else router.push('/admin/ml-models/models');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/ml-models">ML Models</Link><span>/</span>
          <Link href="/admin/ml-models/models">Models</Link><span>/</span>
          <span className="text-foreground">New model</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create model</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">Type *</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="features" className="block text-sm font-medium mb-1">Feature IDs (comma-separated UUIDs) *</label>
            <input id="features" type="text" value={featuresStr} onChange={(e) => setFeaturesStr(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" placeholder="uuid1,uuid2" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" rows={2} />
          </div>
          <div>
            <label htmlFor="algorithm" className="block text-sm font-medium mb-1">Algorithm</label>
            <input id="algorithm" type="text" value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !name.trim() || !featuresStr.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/ml-models/models" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/ml-models/models" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Models</Link></p>
      </div>
    </div>
  );
}
