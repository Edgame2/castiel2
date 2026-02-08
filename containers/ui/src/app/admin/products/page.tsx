/**
 * Admin products – list and create c_product (Plan Full UI).
 * GET /api/v1/products, POST /api/v1/products.
 */

'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

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
          <Link href="/admin/products/new" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
            New product
          </Link>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 max-w-2xl mb-6">
        <form onSubmit={handleCreate} className="space-y-2 mb-4">
          <div>
            <label htmlFor="product-name" className="block text-sm font-medium mb-1">Name</label>
            <input
              id="product-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 w-full max-w-md"
            />
          </div>
          <div>
            <label htmlFor="product-desc" className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              id="product-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 w-full max-w-md"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create product'}
          </button>
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
