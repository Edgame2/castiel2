'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const TYPES = ['numeric', 'categorical', 'text', 'datetime', 'boolean'] as const;

export default function FeatureEngineeringFeatureNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('numeric');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [transformation, setTransformation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/ml/features`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        source: source.trim() || undefined,
        transformation: transformation.trim() || undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || `HTTP ${r.status}`)));
        return r.json();
      })
      .then((saved: { id?: string }) => {
        if (saved?.id) router.push(`/admin/feature-engineering/features/${encodeURIComponent(saved.id)}`);
        else router.push('/admin/feature-engineering/features');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/feature-engineering">Feature Engineering</Link><span>/</span>
          <Link href="/admin/feature-engineering/features">Features</Link><span>/</span>
          <span className="text-foreground">New feature</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create feature</h1>
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
            <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/feature-engineering/features" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/feature-engineering/features" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Features</Link></p>
      </div>
    </div>
  );
}
