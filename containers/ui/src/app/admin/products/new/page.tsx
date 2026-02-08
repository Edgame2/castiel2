'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

export default function AdminProductNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/products`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), ...(description.trim() && { description: description.trim() }) }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { id?: string; error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        if (data?.id) router.push(`/admin/products/${encodeURIComponent(data.id)}`);
        else router.push('/admin/products');
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
          <Link href="/admin/products" className="hover:underline">Products</Link>
          <span>/</span>
          <span className="text-foreground">New product</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create product</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/products" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/products" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Products</Link></p>
      </div>
    </div>
  );
}
