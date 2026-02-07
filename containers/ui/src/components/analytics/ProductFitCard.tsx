/**
 * ProductFitCard – product-fit scores for an opportunity (Plan Phase 3 Full UI).
 * GET /api/v1/opportunities/:opportunityId/product-fit; POST .../product-fit/evaluate to recalculate.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

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
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '',
  getHeaders,
}: ProductFitCardProps) {
  const [items, setItems] = useState<ProductFitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const getUrl = `${base}/api/v1/opportunities/${encodeURIComponent(opportunityId)}/product-fit`;
  const evaluateUrl = `${base}/api/v1/opportunities/${encodeURIComponent(opportunityId)}/product-fit/evaluate`;

  const fetchProductFit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
      const res = await fetch(getUrl, {
        headers: { ...headers },
        credentials: getHeaders ? undefined : ('include' as RequestCredentials),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ProductFitItem[];
      setItems(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [getUrl, getHeaders]);

  useEffect(() => {
    fetchProductFit();
  }, [fetchProductFit]);

  const handleRecalculate = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
      const res = await fetch(evaluateUrl, {
        method: 'POST',
        headers: { ...headers },
        credentials: getHeaders ? undefined : ('include' as RequestCredentials),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchProductFit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={evaluating}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        {evaluating ? 'Recalculating…' : 'Recalculate fit'}
      </button>
    </div>
  );
}
