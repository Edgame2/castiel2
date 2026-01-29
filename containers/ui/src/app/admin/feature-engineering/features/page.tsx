/**
 * Super Admin: Feature Engineering — Features (§5.1, §4.3)
 * GET /api/v1/ml/features/versions, GET /api/v1/ml/features/schema via gateway (ml-service).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type FeaturePurpose = 'risk-scoring' | 'win-probability' | 'lstm' | 'anomaly' | 'forecasting';

const PURPOSES: FeaturePurpose[] = ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'];

interface FeatureVersionItem {
  purpose?: string;
  version?: string;
  status?: string;
  [key: string]: unknown;
}

interface SchemaResponse {
  purpose?: string;
  version?: string;
  features?: Array<{ name?: string; type?: string }>;
  updatedAt?: string;
}

export default function FeatureEngineeringFeaturesPage() {
  const [versions, setVersions] = useState<FeatureVersionItem[]>([]);
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purposeFilter, setPurposeFilter] = useState<FeaturePurpose | ''>('');

  const fetchVersions = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      const params = purposeFilter ? `?purpose=${encodeURIComponent(purposeFilter)}` : '';
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/features/versions${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setVersions(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setVersions([]);
    }
  }, [purposeFilter]);

  const fetchSchema = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      const params = purposeFilter ? `?purpose=${encodeURIComponent(purposeFilter)}` : '';
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/features/schema${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSchema(json);
    } catch {
      setSchema(null);
    }
  }, [purposeFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchVersions(), fetchSchema()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchVersions, fetchSchema]);

  useEffect(() => {
    if (apiBaseUrl) fetchAll();
    else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [apiBaseUrl, fetchAll]);

  useEffect(() => {
    document.title = 'Features | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/feature-engineering" className="text-sm font-medium hover:underline">Feature Engineering</Link>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/feature-engineering"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Features
        </span>
        <Link
          href="/admin/feature-engineering/versioning"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Versioning
        </Link>
        <Link
          href="/admin/feature-engineering/quality"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Quality
        </Link>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Features</h1>
      <p className="text-muted-foreground mb-6">
        Feature versions and schema for ml-service Layer 2 (current tenant). §5.1, §4.3.
      </p>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Purpose filter</label>
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value as FeaturePurpose | '')}
              className="w-48 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={fetchAll}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && apiBaseUrl && (
        <div className="space-y-6">
          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Feature versions</h2>
            {versions.length === 0 ? (
              <p className="text-sm text-gray-500">No version metadata for this tenant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left py-2 px-4">Purpose</th>
                      <th className="text-left py-2 px-4">Version</th>
                      <th className="text-left py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-4">{v.purpose ?? '—'}</td>
                        <td className="py-2 px-4">{v.version ?? '—'}</td>
                        <td className="py-2 px-4">{v.status ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Feature schema</h2>
            {!schema ? (
              <p className="text-sm text-gray-500">No schema loaded.</p>
            ) : (
              <div className="text-sm space-y-2">
                {schema.purpose != null && <p><strong>Purpose:</strong> {schema.purpose}</p>}
                {schema.version != null && <p><strong>Version:</strong> {schema.version}</p>}
                {schema.updatedAt != null && <p><strong>Updated:</strong> {schema.updatedAt}</p>}
                {schema.features && schema.features.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
                          <th className="text-left py-2 px-4">Name</th>
                          <th className="text-left py-2 px-4">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.features.map((f, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2 px-4">{f.name ?? '—'}</td>
                            <td className="py-2 px-4">{f.type ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No features in schema.</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
