/**
 * Admin: Create tenant (organization) — POST /api/v1/organizations (gateway → user_management).
 * Body: name, slug?, description?.
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    if (!getApiBaseUrl() || !n || submitting) return;
    setError(null);
    setSubmitting(true);
    apiFetch('/api/v1/organizations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: n,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      }),
    })
      .then((r: Response) => {
        if (!r.ok) return r.json().then((body: { error?: string }) => { throw new Error(body?.error || r.statusText); });
        return r.json();
      })
      .then((data: CreateResponse) => {
        if (data?.data?.id) router.push(`/admin/tenants/${data.data.id}`);
        else router.push('/admin/tenants');
      })
      .catch(() => setError(GENERIC_ERROR_MESSAGE))
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
            <Label htmlFor="name" className="block mb-1">Name</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
          </div>
          <div>
            <Label htmlFor="slug" className="block mb-1">Slug (optional)</Label>
            <Input id="slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full" />
          </div>
          <div>
            <Label htmlFor="description" className="block mb-1">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating…' : 'Create tenant'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/tenants">Cancel</Link>
            </Button>
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
