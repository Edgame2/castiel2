/**
 * Super Admin: API keys (W11 §10.3)
 * GET list, POST create, DELETE revoke, POST rotate via /api/users/api/v1/organizations/:orgId/api-keys (user_management).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface ApiKeyRow {
  id?: string;
  name?: string;
  scope?: string;
  expiresAt?: string;
  createdAt?: string;
  lastUsedAt?: string;
}

interface ApiKeysResponse {
  items?: ApiKeyRow[];
}

interface CreatedKey {
  id: string;
  name: string;
  key: string;
  scope?: string;
  expiresAt?: string;
  createdAt: string;
}

interface RotatedKey {
  key: string;
  expiresAt?: string;
  createdAt: string;
}

export default function SecurityApiKeysPage() {
  const [orgId, setOrgId] = useState('');
  const [items, setItems] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createScope, setCreateScope] = useState('');
  const [createExpiresAt, setCreateExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [rotateKeyId, setRotateKeyId] = useState<string | null>(null);
  const [rotatedKey, setRotatedKey] = useState<RotatedKey | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'' | 'name' | 'scope' | 'createdAt' | 'expiresAt' | 'lastUsedAt'>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = (() => {
    if (!sortBy || items.length === 0) return items;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      let base: number;
      if (sortBy === 'name' || sortBy === 'scope') {
        base = (a[sortBy] ?? '').toString().toLowerCase().localeCompare((b[sortBy] ?? '').toString().toLowerCase());
      } else {
        const ta = (a[sortBy] as string | undefined) ? new Date((a[sortBy] as string)).getTime() : 0;
        const tb = (b[sortBy] as string | undefined) ? new Date((b[sortBy] as string)).getTime() : 0;
        base = ta - tb;
      }
      return mult * base;
    });
  })();

  useEffect(() => {
    document.title = 'API Keys | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchKeys = useCallback(async () => {
    if (!apiBaseUrl || !orgId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/users/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiKeysResponse = await res.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const handleCreate = useCallback(async () => {
    if (!apiBaseUrl || !orgId.trim() || !createName.trim()) {
      setCreateError('Name is required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreatedKey(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/users/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: createName.trim(),
            scope: createScope.trim() || undefined,
            expiresAt: createExpiresAt.trim() || undefined,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: CreatedKey = await res.json();
      setCreatedKey(data);
      await fetchKeys();
      setCreateName('');
      setCreateScope('');
      setCreateExpiresAt('');
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }, [apiBaseUrl, orgId, createName, createScope, createExpiresAt, fetchKeys]);

  const handleRevoke = useCallback(
    async (keyId: string) => {
      if (!apiBaseUrl || !orgId.trim() || !keyId) return;
      if (!confirm('Revoke this API key? It will stop working immediately.')) return;
      setRevokingId(keyId);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/users/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys/${encodeURIComponent(keyId)}`,
          { method: 'DELETE', credentials: 'include' }
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error('API key not found');
          throw new Error(`HTTP ${res.status}`);
        }
        await fetchKeys();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRevokingId(null);
      }
    },
    [apiBaseUrl, orgId, fetchKeys]
  );

  const handleRotate = useCallback(
    async (keyId: string) => {
      if (!apiBaseUrl || !orgId.trim() || !keyId) return;
      if (!confirm('Rotate this API key? A new key will be generated; the old one will stop working.')) return;
      setRotateKeyId(keyId);
      setRotatedKey(null);
      setRotateError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/users/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys/${encodeURIComponent(keyId)}/rotate`,
          { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error('API key not found');
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data: RotatedKey = await res.json();
        setRotatedKey(data);
        await fetchKeys();
      } catch (e) {
        setRotateError(e instanceof Error ? e.message : String(e));
      } finally {
        setRotateKeyId(null);
      }
    },
    [apiBaseUrl, orgId, fetchKeys]
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/security" className="text-sm font-medium hover:underline">Security & Access Control</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">API Keys</h1>
      <p className="text-muted-foreground mb-4">
        Create and manage API keys (scope, expiration). Load keys for an organization, then create, revoke, or rotate (§10.3).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/security/roles" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Roles</Link>
        <Link href="/admin/security/users" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Users</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">API Keys</span>
        <Link href="/admin/security/audit" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Audit Log</Link>
      </nav>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
          <Link href="/admin/security" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
            ← Back to Security & Access Control
          </Link>
        </div>
      )}

      {apiBaseUrl && (
        <>
          <div className="mb-4 flex gap-4 items-center flex-wrap">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization ID</label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="e.g. org_123"
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm w-48"
            />
            <button
              type="button"
              onClick={fetchKeys}
              disabled={loading || !orgId.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load keys'}
            </button>
            <button
              type="button"
              onClick={fetchKeys}
              disabled={loading || !orgId.trim()}
              className="px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Refetch API keys for current organization"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setCreateError(null);
                setCreatedKey(null);
                setCreateName('');
                setCreateScope('');
                setCreateExpiresAt('');
              }}
              disabled={!orgId.trim()}
              className="px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Create API key
            </button>
            <Link href="/admin/security" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to Security & Access Control
            </Link>
          </div>

          {showCreate && orgId.trim() && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Create API key</h2>
              {createdKey ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Copy this key now; it won&apos;t be shown again.
                  </p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono break-all">
                      {createdKey.key}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdKey.key);
                      }}
                      className="px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">Name: {createdKey.name}. Created: {new Date(createdKey.createdAt).toLocaleString()}.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setCreatedKey(null);
                    }}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. CI pipeline"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scope (optional)</label>
                    <input
                      type="text"
                      value={createScope}
                      onChange={(e) => setCreateScope(e.target.value)}
                      placeholder="e.g. read:api"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires at (optional, ISO date)</label>
                    <input
                      type="text"
                      value={createExpiresAt}
                      onChange={(e) => setCreateExpiresAt(e.target.value)}
                      placeholder="e.g. 2026-12-31"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      disabled={creating}
                    />
                  </div>
                  {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={creating}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creating ? 'Creating…' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      disabled={creating}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {rotatedKey && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-6 border-amber-200 dark:border-amber-800">
              <h2 className="text-lg font-semibold mb-3">New key (copy now; shown only once)</h2>
              <div className="flex gap-2 items-center">
                <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono break-all">
                  {rotatedKey.key}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(rotatedKey.key)}
                  className="px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                >
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={() => setRotatedKey(null)}
                className="mt-3 text-sm font-medium text-blue-600 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {rotateError && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Rotate error: {rotateError}</p>
              <button type="button" onClick={() => setRotateError(null)} className="mt-2 text-sm text-blue-600 hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
            </div>
          )}

          {!loading && orgId.trim() && !error && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
              {items.length === 0 ? (
                <>
                  <h2 className="text-lg font-semibold mb-3">API keys</h2>
                  <p className="text-sm text-gray-500">No API keys for this organization. Use &quot;Create API key&quot; to add one.</p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <h2 className="text-lg font-semibold">API keys ({items.length})</h2>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by (§10.3)</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="px-3 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        aria-label="Sort by"
                      >
                        <option value="">Default</option>
                        <option value="name">Name</option>
                        <option value="scope">Scope</option>
                        <option value="createdAt">Created</option>
                        <option value="expiresAt">Expires</option>
                        <option value="lastUsedAt">Last used</option>
                      </select>
                      <select
                        value={sortDir}
                        onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                        className="px-3 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        aria-label="Sort direction"
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
                          <th className="text-left py-2 px-4">Name</th>
                          <th className="text-left py-2 px-4">Scope</th>
                          <th className="text-left py-2 px-4">Expires</th>
                          <th className="text-left py-2 px-4">Created</th>
                          <th className="text-left py-2 px-4">Last used</th>
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((row, idx) => (
                        <tr key={row.id ?? idx} className="border-b">
                          <td className="py-2 px-4">{row.name ?? '—'}</td>
                          <td className="py-2 px-4">{row.scope ?? '—'}</td>
                          <td className="py-2 px-4">{row.expiresAt ? new Date(row.expiresAt).toLocaleString() : '—'}</td>
                          <td className="py-2 px-4">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                          <td className="py-2 px-4">{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : '—'}</td>
                          <td className="py-2 px-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRotate(row.id!)}
                              disabled={rotateKeyId !== null || !row.id}
                              className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                            >
                              {rotateKeyId === row.id ? 'Rotating…' : 'Rotate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevoke(row.id!)}
                              disabled={revokingId !== null || !row.id}
                              className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                            >
                              {revokingId === row.id ? 'Revoking…' : 'Revoke'}
                            </button>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
