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
import { DataTable } from '@/components/ui/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GENERIC_ERROR_MESSAGE, apiFetch, getApiBaseUrl } from '@/lib/api';
import { toast } from 'sonner';

type Product = { id: string; name: string; description?: string; category?: string; status?: string };

const PRODUCT_COLUMNS = [
  { id: 'name', header: 'Name', cell: (row: Product) => row.name },
  { id: 'description', header: 'Description', cell: (row: Product) => row.description ?? '—' },
] as const;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setError(GENERIC_ERROR_MESSAGE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/products');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as Product[];
      setProducts(Array.isArray(json) ? json : []);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
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
    if (!name.trim() || !getApiBaseUrl()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiFetch('/api/v1/products', {
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
    } catch {
      setCreateError(GENERIC_ERROR_MESSAGE);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId || !getApiBaseUrl()) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/v1/products/${encodeURIComponent(deleteConfirmId)}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      toast.success('Product deleted');
      setDeleteConfirmId(null);
      await fetchProducts();
    } catch {
      toast.error(GENERIC_ERROR_MESSAGE);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirmId, fetchProducts]);

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
      {getApiBaseUrl() && (
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
        <DataTable
          columns={[...PRODUCT_COLUMNS]}
          data={products}
          getRowId={(row) => row.id}
          isLoading={loading}
          firstColumnHref={(row) => `/admin/products/${encodeURIComponent(row.id)}`}
          actionsColumn={(row) => (
            <span className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/products/${encodeURIComponent(row.id)}`}>Edit</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirmId(row.id)}
                disabled={deleting}
              >
                Delete
              </Button>
            </span>
          )}
          emptyTitle="No products yet"
          emptyDescription="Create a product above or use the New product link."
          emptyAction={{ label: 'New product', href: '/admin/products/new' }}
        />
      </div>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
