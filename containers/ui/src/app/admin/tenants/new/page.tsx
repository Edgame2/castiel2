/**
 * Admin: Create tenant (organization) — POST /api/v1/organizations (gateway → user_management).
 * Body: name, slug?, description?.
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type CreateResponse = { data?: { id: string; name?: string } };

export default function AdminTenantsNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!apiBase || !n || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/organizations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: n,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((body: { error?: string }) => { throw new Error(body?.error || r.statusText); });
        return r.json();
      })
      .then((data: CreateResponse) => {
        if (data?.data?.id) router.push(`/admin/tenants/${data.data.id}`);
        else router.push('/admin/tenants');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Create failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/tenants" className="hover:underline">Tenants</Link>
          <span>/</span>
          <span className="text-foreground">New tenant</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create tenant</h1>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              required
            />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1">Slug (optional)</label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create tenant'}
            </button>
            <Link href="/admin/tenants" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </Link>
          </div>
        </form>
        <p className="mt-4">
          <Link href="/admin/tenants" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to Tenants
          </Link>
        </p>
      </div>
    </div>
  );
}
