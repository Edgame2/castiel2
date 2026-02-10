/**
 * Super Admin: API keys (W11 §10.3)
 * GET list, POST create, DELETE revoke, POST rotate via /api/v1/organizations/:orgId/api-keys (user_management).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    const base = getApiBaseUrl().replace(/\/$/, '') || '';
    if (!base || !orgId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        base ? `${base}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys` : `/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiKeysResponse = await res.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const handleCreate = useCallback(async () => {
    const base = getApiBaseUrl().replace(/\/$/, '') || '';
    if (!base || !orgId.trim() || !createName.trim()) {
      setCreateError('Name is required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreatedKey(null);
    try {
      const res = await fetch(
        base ? `${base}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys` : `/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys`,
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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setCreateError(GENERIC_ERROR_MESSAGE);
    } finally {
      setCreating(false);
    }
  }, [orgId, createName, createScope, createExpiresAt, fetchKeys]);

  const handleRevoke = useCallback(
    async (keyId: string) => {
      const base = getApiBaseUrl().replace(/\/$/, '') || '';
      if (!base || !orgId.trim() || !keyId) return;
      if (!confirm('Revoke this API key? It will stop working immediately.')) return;
      setRevokingId(keyId);
      setError(null);
      try {
        const res = await fetch(
          base ? `${base}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys/${encodeURIComponent(keyId)}` : `/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys/${encodeURIComponent(keyId)}`,
          { method: 'DELETE', credentials: 'include' }
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error('API key not found');
          throw new Error(`HTTP ${res.status}`);
        }
        await fetchKeys();
      } catch (e) {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
      } finally {
        setRevokingId(null);
      }
    },
    [orgId, fetchKeys]
  );

  const handleRotate = useCallback(
    async (keyId: string) => {
      const base = getApiBaseUrl().replace(/\/$/, '') || '';
      if (!base || !orgId.trim() || !keyId) return;
      if (!confirm('Rotate this API key? A new key will be generated; the old one will stop working.')) return;
      setRotateKeyId(keyId);
      setRotatedKey(null);
      setRotateError(null);
      try {
        const res = await fetch(
          base ? `${base}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys/${encodeURIComponent(keyId)}/rotate` : `/api/v1/organizations/${encodeURIComponent(orgId.trim())}/api-keys/${encodeURIComponent(keyId)}/rotate`,
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
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setRotateError(GENERIC_ERROR_MESSAGE);
      } finally {
        setRotateKeyId(null);
      }
    },
    [orgId, fetchKeys]
  );

  const apiBaseUrl = getApiBaseUrl();

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
            <Label className="text-sm">Organization ID</Label>
            <Input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="e.g. org_123"
              className="w-48 text-sm"
            />
            <Button type="button" onClick={fetchKeys} disabled={loading || !orgId.trim()}>
              {loading ? 'Loading…' : 'Load keys'}
            </Button>
            <Button type="button" variant="outline" onClick={fetchKeys} disabled={loading || !orgId.trim()} title="Refetch API keys for current organization">
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreate(true);
                setCreateError(null);
                setCreatedKey(null);
                setCreateName('');
                setCreateScope('');
                setCreateExpiresAt('');
              }}
              disabled={!orgId.trim()}
            >
              Create API key
            </Button>
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
                    <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(createdKey.key)}>
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">Name: {createdKey.name}. Created: {new Date(createdKey.createdAt).toLocaleString()}.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowCreate(false); setCreatedKey(null); }}>
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-w-md">
                  <div>
                    <Label className="block mb-1">Name *</Label>
                    <Input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. CI pipeline"
                      className="w-full text-sm"
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <Label className="block mb-1">Scope (optional)</Label>
                    <Input
                      type="text"
                      value={createScope}
                      onChange={(e) => setCreateScope(e.target.value)}
                      placeholder="e.g. read:api"
                      className="w-full text-sm"
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <Label className="block mb-1">Expires at (optional, ISO date)</Label>
                    <Input
                      type="text"
                      value={createExpiresAt}
                      onChange={(e) => setCreateExpiresAt(e.target.value)}
                      placeholder="e.g. 2026-12-31"
                      className="w-full text-sm"
                      disabled={creating}
                    />
                  </div>
                  {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleCreate} disabled={creating}>
                      {creating ? 'Creating…' : 'Create'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)} disabled={creating}>
                      Cancel
                    </Button>
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
                <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(rotatedKey.key)}>
                  Copy
                </Button>
              </div>
              <Button type="button" variant="link" onClick={() => setRotatedKey(null)} className="mt-3">
                Dismiss
              </Button>
            </div>
          )}

          {rotateError && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Rotate error: {rotateError}</p>
              <Button type="button" variant="link" onClick={() => setRotateError(null)} className="mt-2">
                Dismiss
              </Button>
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
                      <Label className="text-sm">Sort by (§10.3)</Label>
                      <Select value={sortBy || '_default'} onValueChange={(v) => setSortBy(v === '_default' ? '' : (v as typeof sortBy))}>
                        <SelectTrigger className="w-[120px] h-8 text-sm" aria-label="Sort by">
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_default">Default</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="scope">Scope</SelectItem>
                          <SelectItem value="createdAt">Created</SelectItem>
                          <SelectItem value="expiresAt">Expires</SelectItem>
                          <SelectItem value="lastUsedAt">Last used</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={sortDir} onValueChange={(v) => setSortDir(v as 'asc' | 'desc')}>
                        <SelectTrigger className="w-[120px] h-8 text-sm" aria-label="Sort direction">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
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
                            <Button
                              type="button"
                              variant="link"
                              className="text-blue-600 dark:text-blue-400 p-0 h-auto"
                              onClick={() => handleRotate(row.id!)}
                              disabled={rotateKeyId !== null || !row.id}
                            >
                              {rotateKeyId === row.id ? 'Rotating…' : 'Rotate'}
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              className="text-red-600 dark:text-red-400 p-0 h-auto"
                              onClick={() => handleRevoke(row.id!)}
                              disabled={revokingId !== null || !row.id}
                            >
                              {revokingId === row.id ? 'Revoking…' : 'Revoke'}
                            </Button>
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
