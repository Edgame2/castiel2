/**
 * Super Admin: Feature Engineering — Versioning (§5.2)
 * Version history (§5.2.1) from GET /api/v1/ml/features/versions. Version policy (§5.2.2) from GET /api/v1/ml/features/version-policy.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface FeatureVersionItem {
  id?: string;
  purpose?: string;
  version?: string;
  status?: 'active' | 'pinned' | 'deprecated';
  featureNames?: string[];
  updatedAt?: string;
  createdAt?: string;
  deprecatedAt?: string;
}

interface VersionsResponse {
  items: FeatureVersionItem[];
}

interface VersionPolicy {
  versioningStrategy: 'semantic' | 'timestamp' | 'hash';
  backwardCompatibility: {
    enforceCompatibility: boolean;
    allowBreakingChanges: boolean;
    requireMigrationGuide: boolean;
  };
  deprecationPolicy: {
    deprecationNoticeDays: number;
    supportOldVersionsDays: number;
    autoMigrate: boolean;
  };
}

export default function FeatureEngineeringVersioningPage() {
  const [data, setData] = useState<VersionsResponse | null>(null);
  const [policyData, setPolicyData] = useState<VersionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setPolicyData(null);
    try {
      const [versionsRes, policyRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/ml/features/versions`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/ml/features/version-policy`, { credentials: 'include' }),
      ]);
      if (!versionsRes.ok) {
        const j = await versionsRes.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${versionsRes.status}`);
      }
      const versionsJson = await versionsRes.json();
      setData(versionsJson);
      if (policyRes.ok) {
        const policyJson = await policyRes.json();
        setPolicyData(policyJson);
      }
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    document.title = 'Versioning | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const statusBadge = (status: FeatureVersionItem['status']) => {
    if (!status) return <span className="text-gray-500">—</span>;
    const cls =
      status === 'active'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : status === 'pinned'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
  };

  const items = data?.items ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/feature-engineering" className="text-sm font-medium hover:underline">Feature Engineering</Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Versioning</span>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/feature-engineering"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/feature-engineering/features"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Features
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Versioning
        </span>
        <Link
          href="/admin/feature-engineering/quality"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Quality
        </Link>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Versioning</h1>
      <p className="text-muted-foreground mb-6">
        Version history, version policy, backward compatibility, deprecation. §5.2.
      </p>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
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
          <Button type="button" variant="link" onClick={fetchData} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Version history</h2>
              <Button type="button" variant="link" onClick={fetchData}>
                Refresh
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No feature versions yet. Versions are created when feature metadata is upserted (POST /api/v1/ml/features/versions). Use{' '}
                <Link href="/admin/feature-engineering/features" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  Features
                </Link>{' '}
                to view schema and versions by purpose.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Purpose
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        # Features
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, idx) => (
                      <tr key={item.id ?? `${item.purpose}-${item.version}-${idx}`}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{item.purpose ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 font-mono">{item.version ?? '—'}</td>
                        <td className="px-4 py-2 text-sm">{statusBadge(item.status)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {Array.isArray(item.featureNames) ? item.featureNames.length : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-gray-50 dark:bg-gray-800/50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Version policy (§5.2.2)</h3>
            {policyData ? (
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p><span className="font-medium text-gray-900 dark:text-gray-100">Strategy:</span> {policyData.versioningStrategy}</p>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Backward compatibility:</span>
                  <ul className="list-disc list-inside mt-1 ml-1">
                    <li>Enforce compatibility: {policyData.backwardCompatibility?.enforceCompatibility ? 'Yes' : 'No'}</li>
                    <li>Allow breaking changes: {policyData.backwardCompatibility?.allowBreakingChanges ? 'Yes' : 'No'}</li>
                    <li>Require migration guide: {policyData.backwardCompatibility?.requireMigrationGuide ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Deprecation:</span>
                  <ul className="list-disc list-inside mt-1 ml-1">
                    <li>Notice period: {policyData.deprecationPolicy?.deprecationNoticeDays ?? '—'} days</li>
                    <li>Support old versions: {policyData.deprecationPolicy?.supportOldVersionsDays ?? '—'} days</li>
                    <li>Auto-migrate: {policyData.deprecationPolicy?.autoMigrate ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  To change, update ml-service config (feature_version_policy). Pin/deprecate: POST /api/v1/ml/features/versions/pin, POST /api/v1/ml/features/versions/deprecate.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Policy is read from ml-service config (feature_version_policy). Pin and deprecate via POST /api/v1/ml/features/versions/pin and POST /api/v1/ml/features/versions/deprecate.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
