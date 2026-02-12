/**
 * Admin: Product detail/edit — GET/PUT/DELETE /api/v1/products/:id (gateway → risk-analytics).
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
}

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProduct = useCallback(() => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/products/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) throw new Error('Product not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: Product) => {
        setProduct(data);
        setName(data.name ?? '');
        setDescription(data.description ?? '');
      })
      .catch((e) => {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !id || !product || saving) return;
    setSaveError(null);
    setSaving(true);
    fetch(`${apiBase}/api/v1/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d: { error?: { message?: string } }) => { throw new Error(d?.error?.message ?? r.statusText); });
      })
      .then(() => {
        setEditing(false);
        fetchProduct();
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setSaveError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !id || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/products/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (!r.ok && r.status !== 204) return r.json().then((d: { error?: { message?: string } }) => { throw new Error(d?.error?.message ?? r.statusText); });
        router.push('/admin/products');
      })
      .catch((e) => {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setSaveError(GENERIC_ERROR_MESSAGE);
        setDeleting(false);
      });
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/products" className="hover:underline">Products</Link>
          <span>/</span>
          <span className="text-foreground">Product</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && product && (
          <>
            <h1 className="text-xl font-semibold mb-4">{product.name}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {product.id}</p>
                <p><span className="text-gray-500">Name:</span> {product.name}</p>
                {product.description != null && <p><span className="text-gray-500">Description:</span> {product.description}</p>}
                {product.category != null && <p><span className="text-gray-500">Category:</span> {product.category}</p>}
                {product.status != null && <p><span className="text-gray-500">Status:</span> {product.status}</p>}
                <div className="flex gap-2 mt-4">
                  <Button type="button" onClick={() => setEditing(true)}>Edit</Button>
                  <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>Delete</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-destructive/30 bg-destructive/10">
                <p className="text-sm mb-2">Delete this product? This cannot be undone.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
        <p className="mt-4"><Link href="/admin/products" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Products</Link></p>
      </div>
    </div>
  );
}
