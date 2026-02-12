/**
 * User-facing product detail — GET /api/v1/products/:id (risk_analytics).
 * Read-only view.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface ProductItem {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  status?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/products/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Product not found');
        else throw new Error(res.statusText || 'Failed to load product');
        setProduct(null);
        return;
      }
      const data: ProductItem = await res.json();
      setProduct(data);
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (id) document.title = `Product ${product?.name ?? id} | Castiel`;
    return () => { document.title = 'Castiel'; };
  }, [id, product?.name]);

  if (loading) {
    return (
      <div className="p-6 max-w-lg">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="p-6">
        <p className="text-destructive mb-4" role="alert">
          {error}
        </p>
        <Link href="/products">
          <Button variant="outline">Back to products</Button>
        </Link>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/products" className="text-sm font-medium hover:underline">
          ← Products
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">{product.name ?? product.id}</h1>
      <dl className="space-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">ID</dt>
          <dd className="font-mono text-sm">{product.id}</dd>
        </div>
        {product.category != null && (
          <div>
            <dt className="text-sm text-muted-foreground">Category</dt>
            <dd>{product.category}</dd>
          </div>
        )}
        {product.status != null && (
          <div>
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd>{product.status}</dd>
          </div>
        )}
        {product.description != null && product.description !== '' && (
          <div>
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="whitespace-pre-wrap">{product.description}</dd>
          </div>
        )}
      </dl>
      <div className="mt-6">
        <Link href="/products">
          <Button variant="outline">Back to products</Button>
        </Link>
      </div>
    </div>
  );
}
