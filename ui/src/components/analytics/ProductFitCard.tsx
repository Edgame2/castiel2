/**
 * ProductFitCard – product-fit scores for an opportunity (Plan Phase 3 Full UI).
 * GET /api/v1/opportunities/:opportunityId/product-fit; POST .../product-fit/evaluate to recalculate.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch, GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type ProductFitCardProps = {
  opportunityId: string;
  title?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

type ProductFitItem = { productId: string; productName?: string; score: number; dimensions?: Record<string, unknown> };

export function ProductFitCard({
  opportunityId,
  title = 'Product fit',
  apiBaseUrl: _apiBaseUrl,
  getHeaders,
}: ProductFitCardProps) {
  const [items, setItems] = useState<ProductFitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductFit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getHeaders ? await Promise.resolve(getHeaders()) : undefined;
      const res = await apiFetch(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/product-fit`, { headers });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ProductFitItem[];
      setItems(Array.isArray(json) ? json : []);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [opportunityId, getHeaders]);

  useEffect(() => {
    fetchProductFit();
  }, [fetchProductFit]);

  const handleRecalculate = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const headers = getHeaders ? await Promise.resolve(getHeaders()) : undefined;
      const res = await apiFetch(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/product-fit/evaluate`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchProductFit();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-2">No product-fit data. Run evaluation to populate.</p>
      ) : (
        <ul className="text-sm space-y-1 mb-2">
          {items.map((a) => (
            <li key={a.productId}>
              {a.productName || a.productId}: <span className="font-medium">{(a.score * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" size="sm" onClick={handleRecalculate} disabled={evaluating}>
        {evaluating ? 'Recalculating…' : 'Recalculate fit'}
      </Button>
    </div>
  );
}
