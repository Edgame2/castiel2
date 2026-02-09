/**
 * Super Admin: Integration Catalog Management
 * Manage integration catalog entries (CRUD operations)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface IntegrationType {
  id: string;
  integrationId: string;
  displayName: string;
  description?: string;
  category: string;
  provider: string;
  authMethods: string[];
  supportedEntities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function IntegrationCatalogPage() {
  const [integrations, setIntegrations] = useState<IntegrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Integration Catalog | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/integrations/catalog`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setIntegrations(Array.isArray(json?.integrations) ? json.integrations : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Admin
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Integration Catalog</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Integration Catalog</h1>
      <p className="text-muted-foreground mb-4">
        Manage integration catalog entries (Super Admin only)
      </p>
      <div className="mb-4">
        <Button type="button" variant="outline" onClick={fetchIntegrations} disabled={loading} title="Refetch integration catalog">
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading integration catalog…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Integration Types</h2>
              <Button>Add Integration Type</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auth Methods</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {integrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No integration types found
                    </td>
                  </tr>
                ) : (
                  integrations.map((integration) => (
                    <tr key={integration.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium">{integration.displayName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{integration.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{integration.provider}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {integration.authMethods.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            integration.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {integration.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button variant="link" className="text-blue-600 mr-3">Edit</Button>
                        <Button variant="link" className="text-red-600">Delete</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
