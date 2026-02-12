/**
 * Admin: Create action catalog entry — POST /api/v1/action-catalog/entries (gateway → risk_catalog).
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    if (!getApiBaseUrl() || !name.trim() || !displayName.trim() || !category.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    apiFetch('/api/v1/action-catalog/entries', {
      method: 'POST',
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
      .then((r: Response) => r.json().catch(() => ({})))
      .then((data: { id?: string; error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        if (data?.id) router.push(`/admin/action-catalog/entries/${encodeURIComponent(data.id)}`);
        else router.push('/admin/action-catalog/entries');
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
          <Link href="/admin/action-catalog" className="hover:underline">Action Catalog</Link>
          <span>/</span>
          <Link href="/admin/action-catalog/entries" className="hover:underline">Entries</Link>
          <span>/</span>
          <span className="text-foreground">New entry</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create entry</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category ID</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="Category id (e.g. from Categories)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name (slug, no spaces)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. my_risk" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim() || !displayName.trim() || !category.trim()}>Create</Button>
            <Button variant="outline" asChild><Link href="/admin/action-catalog/entries">Cancel</Link></Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/action-catalog/entries" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Entries</Link></p>
      </div>
    </div>
  );
}
