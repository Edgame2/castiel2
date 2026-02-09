/**
 * Admin: Create action catalog category — POST /api/v1/action-catalog/categories (gateway → risk_catalog).
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

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type CategoryType = 'risk' | 'recommendation' | 'both';

function normalizeHex(color: string): string {
  const hex = color.replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `#${hex}`;
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  return '#6b7280';
}

export default function ActionCatalogCategoryNewPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState<CategoryType>('both');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6b7280');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !displayName.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/action-catalog/categories`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        type,
        icon: icon.trim() || '📁',
        color: normalizeHex(color.trim() || '#6b7280'),
        description: description.trim() || undefined,
        order,
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { id?: string; error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        if (data?.id) router.push(`/admin/action-catalog/categories/${data.id}`);
        else router.push('/admin/action-catalog/categories');
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
          <Link href="/admin/action-catalog/categories" className="hover:underline">Categories</Link>
          <span>/</span>
          <span className="text-foreground">New category</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create category</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#6b7280" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order">Order</Label>
            <Input id="order" type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)} min={0} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !displayName.trim()}>Create</Button>
            <Button variant="outline" asChild><Link href="/admin/action-catalog/categories">Cancel</Link></Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/action-catalog/categories" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Categories</Link></p>
      </div>
    </div>
  );
}
