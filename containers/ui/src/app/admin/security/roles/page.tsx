/**
 * Super Admin: Role management (W11 §10.1)
 * GET /api/v1/organizations/:orgId/roles via gateway (user_management).
 * Organization ID required (enter to load roles).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface RoleRow {
  id?: string;
  name?: string;
  description?: string | null;
  isSystemRole?: boolean;
  isCustomRole?: boolean;
  isSuperAdmin?: boolean;
  userCount?: number;
  createdAt?: string;
}

interface RolesResponse {
  data?: RoleRow[];
}

interface PermissionRow {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
}

export default function SecurityRolesPage() {
  const [orgId, setOrgId] = useState('');
  const [items, setItems] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPermissionIds, setCreatePermissionIds] = useState<string[]>([]);
  const [createAllPermissions, setCreateAllPermissions] = useState<PermissionRow[]>([]);
  const [createPermissionsLoading, setCreatePermissionsLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'' | 'name' | 'createdAt' | 'userCount'>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = (() => {
    if (!sortBy || items.length === 0) return items;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      let base: number;
      if (sortBy === 'name') {
        base = (a.name ?? '').localeCompare(b.name ?? '');
      } else if (sortBy === 'createdAt') {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        base = ta - tb;
      } else {
        base = (a.userCount ?? 0) - (b.userCount ?? 0);
      }
      return mult * base;
    });
  })();

  const fetchRoles = useCallback(async () => {
    const base = getApiBaseUrl().replace(/\/$/, '') || '';
    if (!base || !orgId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${base}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/roles?includeSystemRoles=true`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RolesResponse = await res.json();
      setItems(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const openCreateForm = useCallback(async () => {
    const base = getApiBaseUrl().replace(/\/$/, '') || '';
    if (!base || !orgId.trim()) return;
    setCreateError(null);
    setCreatePermissionsLoading(true);
    const encodedOrg = encodeURIComponent(orgId.trim());
    try {
      const res = await fetch(
        `${base}/api/v1/organizations/${encodedOrg}/permissions`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Permissions: HTTP ${res.status}`);
      const json: { data?: PermissionRow[] } = await res.json();
      setCreateAllPermissions(Array.isArray(json?.data) ? json.data : []);
      setCreateName('');
      setCreateDescription('');
      setCreatePermissionIds([]);
      setCreating(true);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setCreateError(GENERIC_ERROR_MESSAGE);
    } finally {
      setCreatePermissionsLoading(false);
    }
  }, [orgId]);

  const createRole = useCallback(async () => {
    const base = getApiBaseUrl().replace(/\/$/, '') || '';
    if (!base || !orgId.trim()) return;
    const name = createName.trim();
    if (!name) {
      setCreateError('Name is required');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    const encodedOrg = encodeURIComponent(orgId.trim());
    try {
      const res = await fetch(
        `${base}/api/v1/organizations/${encodedOrg}/roles`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: createDescription.trim() || null,
            permissionIds: createPermissionIds,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setCreating(false);
      setCreateName('');
      setCreateDescription('');
      setCreatePermissionIds([]);
      fetchRoles();
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setCreateError(GENERIC_ERROR_MESSAGE);
    } finally {
      setCreateSubmitting(false);
    }
  }, [orgId, createName, createDescription, createPermissionIds, fetchRoles]);

  useEffect(() => {
    document.title = 'Roles | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

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
      <h1 className="text-2xl font-bold mb-2">Role Management</h1>
      <p className="text-muted-foreground mb-4">
        View roles for an organization. Enter organization ID and load (user-management §10.1).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Roles</span>
        <Link href="/admin/security/users" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Users</Link>
        <Link href="/admin/security/api-keys" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Keys</Link>
        <Link href="/admin/security/audit" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Audit Log</Link>
      </nav>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <>
          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
            <h2 className="text-sm font-semibold mb-2">Pre-defined roles (§10.1)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Reference list of standard roles. Load roles for an organization below to view and manage.
            </p>
            <ul className="list-none space-y-2" aria-label="Pre-defined roles">
              <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Super Admin</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">All permissions</span>
              </li>
              <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Tenant Admin</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Tenant-specific admin</span>
              </li>
              <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Data Scientist</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">ML models, features</span>
              </li>
              <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Sales Manager</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Analytics, reports</span>
              </li>
              <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Sales User</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Opportunity view only</span>
              </li>
            </ul>
          </section>
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 mb-4">
            <Label className="block mb-2">Organization ID</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="e.g. org-123"
                className="flex-1 max-w-xs"
              />
              <Button type="button" onClick={fetchRoles} disabled={!orgId.trim() || loading}>
                {loading ? 'Loading…' : 'Load roles'}
              </Button>
              <Button type="button" variant="outline" onClick={fetchRoles} disabled={!orgId.trim() || loading} title="Refetch roles for current organization">
                Refresh
              </Button>
              <Button type="button" variant="outline" onClick={openCreateForm} disabled={!orgId.trim() || createPermissionsLoading}>
                {createPermissionsLoading ? 'Loading…' : 'Create role'}
              </Button>
            </div>
          </div>

          {creating && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
              <h2 className="text-lg font-semibold mb-3">Create custom role</h2>
              <div className="space-y-3 max-w-md">
                <div>
                  <Label className="block mb-1">Name</Label>
                  <Input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full text-sm"
                    disabled={createSubmitting}
                    placeholder="Role name"
                  />
                </div>
                <div>
                  <Label className="block mb-1">Description</Label>
                  <Input
                    type="text"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="w-full text-sm"
                    disabled={createSubmitting}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <span className="block text-sm font-medium mb-2">Permissions</span>
                  <div className="max-h-48 overflow-y-auto border rounded p-2 dark:border-gray-700 space-y-1.5 text-sm">
                    {createAllPermissions.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`create-perm-${p.id}`}
                          checked={createPermissionIds.includes(p.id)}
                          onCheckedChange={() => {
                            setCreatePermissionIds((prev) =>
                              prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                            );
                          }}
                          disabled={createSubmitting}
                        />
                        <Label htmlFor={`create-perm-${p.id}`} className="font-normal cursor-pointer">
                          <span>{p.displayName}</span>
                          <span className="text-gray-500"> ({p.code})</span>
                        </Label>
                      </div>
                    ))}
                    {createAllPermissions.length === 0 && (
                      <p className="text-gray-500">No permissions available.</p>
                    )}
                  </div>
                </div>
                {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={createRole} disabled={createSubmitting}>
                    {createSubmitting ? 'Creating…' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setCreating(false); setCreateError(null); }} disabled={createSubmitting}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <h2 className="text-lg font-semibold">Roles ({items.length})</h2>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Sort by (§10.1)</Label>
                  <Select value={sortBy || '_default'} onValueChange={(v) => setSortBy(v === '_default' ? '' : (v as typeof sortBy))}>
                    <SelectTrigger className="w-[130px] h-8 text-sm" aria-label="Sort by">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_default">Default</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="createdAt">Created</SelectItem>
                      <SelectItem value="userCount">User count</SelectItem>
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
                      <th className="text-left py-2 px-4">Description</th>
                      <th className="text-left py-2 px-4">Type</th>
                      <th className="text-left py-2 px-4">Users</th>
                      <th className="text-left py-2 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row) => (
                      <tr key={row.id ?? row.name ?? ''} className="border-b">
                        <td className="py-2 px-4">{row.name ?? '—'}</td>
                        <td className="py-2 px-4">{row.description ?? '—'}</td>
                        <td className="py-2 px-4">
                          {row.isSuperAdmin ? 'Super Admin' : row.isSystemRole ? 'System' : row.isCustomRole ? 'Custom' : '—'}
                        </td>
                        <td className="py-2 px-4">{row.userCount ?? '—'}</td>
                        <td className="py-2 px-4">
                          {row.id ? (
                            <Link href={`/admin/security/roles/${row.id}?orgId=${encodeURIComponent(orgId)}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                              View
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && orgId.trim() && items.length === 0 && !error && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
              <p className="text-sm text-gray-500">No roles returned for this organization.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
