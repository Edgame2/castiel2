/**
 * ModelCard – purpose, input, output, limitations (Plan §11.9, §946).
 * Data: GET /api/v1/ml/models/:id/card. No hardcoded URLs; optional apiBaseUrl, getHeaders.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type ModelCardData = {
  modelId: string;
  name: string;
  type: string;
  version: number;
  purpose: string;
  input: string[];
  output: string;
  limitations: string[];
};

export type ModelCardProps = {
  modelId: string;
  title?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function ModelCard({
  modelId,
  title,
  apiBaseUrl = '',
  getHeaders,
}: ModelCardProps) {
  const [data, setData] = useState<ModelCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/ml/models/${encodeURIComponent(modelId)}/card`;

  const fetchData = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
      const res = await fetch(url, {
        headers: { ...headers },
        credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError('Model not found');
          setData(null);
          return;
        }
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ModelCardData;
      setData(json);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [modelId, url, getHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        {title && <h3 className="text-sm font-semibold mb-2">{title}</h3>}
        <p className="text-xs text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        {title && <h3 className="text-sm font-semibold mb-2">{title}</h3>}
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const t = title ?? data.name;

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{t}</h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{data.purpose}</p>
      <div className="text-xs space-y-1 mb-2">
        <p><span className="font-medium text-gray-700 dark:text-gray-300">Type:</span> {data.type}</p>
        <p><span className="font-medium text-gray-700 dark:text-gray-300">Version:</span> {data.version}</p>
        <p><span className="font-medium text-gray-700 dark:text-gray-300">Output:</span> {data.output}</p>
      </div>
      {data.input && data.input.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Inputs</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
            {data.input.slice(0, 8).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
            {data.input.length > 8 && <li>…+{data.input.length - 8} more</li>}
          </ul>
        </div>
      )}
      {data.limitations && data.limitations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Limitations</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
            {data.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
