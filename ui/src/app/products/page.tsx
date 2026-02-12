/**
 * User-facing products list — GET /api/v1/products (risk_analytics).
 * Data table: first column clickable → /products/[id]; Actions: View.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface ProductItem {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  status?: string;
}

export default function ProductsListPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/products');
      if (!res.ok) throw new Error(res.statusText || 'Failed to load products');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    document.title = 'Products | Castiel';
    return () => { document.title = 'Castiel'; };
  }, []);

  const filtered = items.filter((row) => {
    const name = (row.name ?? '').toLowerCase();
    const id = (row.id ?? '').toLowerCase();
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return name.includes(q) || id.includes(q);
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Products</h1>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">Dashboard</Button>
        </Link>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search products"
        />
      </div>

      {!error && filtered.length === 0 && (
        <p className="text-muted-foreground">No products found.</p>
      )}

      {!error && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/products/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.name ?? row.id}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.category ?? '—'}</TableCell>
                <TableCell>{row.status ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/products/${row.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
