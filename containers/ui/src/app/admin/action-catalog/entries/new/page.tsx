/**
 * Admin: Create action catalog entry — POST /api/v1/action-catalog/entries (gateway → risk_catalog).
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type EntryType = 'risk' | 'recommendation';

export default function ActionCatalogEntryNewPage() {
  const router = useRouter();
  const [type, setType] = useState<EntryType>('risk');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !name.trim() || !displayName.trim() || !category.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/action-catalog/entries`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        category: category.trim(),
        name: name.trim().replace(/\s+/g, '_'),
        displayName: displayName.trim(),
        description: description.trim() || '',
        status: 'active',
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { id?: string; error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        if (data?.id) router.push(`/admin/action-catalog/entries/${encodeURIComponent(data.id)}`);
        else router.push('/admin/action-catalog/entries');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Create failed'))
      .finally(() => setSubmitting(false));
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
          <span className="text-foreground">New entry</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create entry</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as EntryType)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
              <option value="risk">Risk</option>
              <option value="recommendation">Recommendation</option>
            </select>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">Category ID</label>
            <input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required placeholder="Category id (e.g. from Categories)" />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name (slug, no spaces)</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required placeholder="e.g. my_risk" />
          </div>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">Display name</label>
            <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !name.trim() || !displayName.trim() || !category.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/action-catalog/entries" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/action-catalog/entries" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Entries</Link></p>
      </div>
    </div>
  );
}
