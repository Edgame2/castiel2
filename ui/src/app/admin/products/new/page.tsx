'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

export default function AdminProductNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl() || !name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    apiFetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), ...(description.trim() && { description: description.trim() }) }),
    })
      .then((r: Response) => r.json().catch(() => ({})))
      .then((data: { id?: string; error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        if (data?.id) router.push(`/admin/products/${encodeURIComponent(data.id)}`);
        else router.push('/admin/products');
      })
      .catch(() => setError(GENERIC_ERROR_MESSAGE))
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
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim()}>Create</Button>
            <Button asChild variant="outline">
              <Link href="/admin/products">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/products" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Products</Link></p>
      </div>
    </div>
  );
}
