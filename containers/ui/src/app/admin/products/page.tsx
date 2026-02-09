/**
 * Admin products – list and create c_product (Plan Full UI).
 * GET /api/v1/products, POST /api/v1/products.
 */

'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type Product = { id: string; name: string; description?: string; category?: string; status?: string };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/products`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as Product[];
      setProducts(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !apiBaseUrl) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), ...(description.trim() && { description: description.trim() }) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      setName('');
      setDescription('');
      await fetchProducts();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/admin" className="text-sm font-medium hover:underline">
          ← Admin
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Products (c_product)</h1>
      <p className="text-muted-foreground mb-6">
        List and create products. Product-fit rules (goodFitIf / badFitIf) can be edited when editing a product (API: PUT /api/v1/products/:id).
      </p>
      {apiBaseUrl && (
        <div className="mb-4">
          <Button asChild>
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 max-w-2xl mb-6">
        <form onSubmit={handleCreate} className="space-y-2 mb-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              className="w-full max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-desc">Description (optional)</Label>
            <Input
              id="product-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full max-w-md"
            />
          </div>
          <Button type="submit" variant="outline" disabled={creating || !name.trim()}>
            {creating ? 'Creating…' : 'Create product'}
          </Button>
        </form>
        {createError && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{createError}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${encodeURIComponent(p.id)}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  {p.name}
                </Link>
                {p.description && <span className="text-muted-foreground"> — {p.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
