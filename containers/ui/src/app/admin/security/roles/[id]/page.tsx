/**
 * Super Admin: Role detail (W11 §10.1)
 * Fetches role and permissions from user-management via gateway.
 */

'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface PermissionRow {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
}

interface RoleData {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isCustomRole: boolean;
  isSuperAdmin: boolean;
  createdByUserId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: PermissionRow[];
  userCount?: number;
}

interface RoleResponse {
  data?: RoleData;
}

function RoleDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const orgId = searchParams?.get('orgId') ?? '';

  const [role, setRole] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPermissionIds, setEditPermissionIds] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionRow[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Role | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchRole = useCallback(async () => {
    if (!apiBaseUrl || !orgId.trim() || !id.trim()) return;
    setLoading(true);
    setError(null);
    setRole(null);
    const encodedOrg = encodeURIComponent(orgId.trim());
    const encodedRoleId = encodeURIComponent(id.trim());
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/users/api/v1/organizations/${encodedOrg}/roles/${encodedRoleId}`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        if (res.status === 404) throw new Error('Role not found');
        throw new Error(`HTTP ${res.status}`);
      }
      const json: RoleResponse = await res.json();
      setRole(json?.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, id]);

  const deleteRole = useCallback(async () => {
    if (!apiBaseUrl || !orgId.trim() || !id.trim()) return;
    setDeleting(true);
    setDeleteError(null);
    const encodedOrg = encodeURIComponent(orgId.trim());
    const encodedRoleId = encodeURIComponent(id.trim());
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/users/api/v1/organizations/${encodedOrg}/roles/${encodedRoleId}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const backUrl = `/admin/security/roles?orgId=${encodeURIComponent(orgId)}`;
      router.push(backUrl);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  }, [orgId, id, router]);

  const updateRole = useCallback(async () => {
    if (!apiBaseUrl || !orgId.trim() || !id.trim()) return;
    const name = editName.trim();
    if (!name) {
      setSaveError('Name is required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const encodedOrg = encodeURIComponent(orgId.trim());
    const encodedRoleId = encodeURIComponent(id.trim());
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/users/api/v1/organizations/${encodedOrg}/roles/${encodedRoleId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: editDescription.trim() || null,
            permissionIds: editPermissionIds,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const json: RoleResponse = await res.json();
      if (json?.data) setRole(json.data);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [orgId, id, editName, editDescription, editPermissionIds]);

  useEffect(() => {
    if (orgId.trim() && id.trim()) fetchRole();
  }, [orgId, id, fetchRole]);

  const backToRolesUrl = orgId ? `/admin/security/roles?orgId=${encodeURIComponent(orgId)}` : '/admin/security/roles';

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/security" className="text-sm font-medium hover:underline">Security & Access Control</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href={backToRolesUrl} className="text-sm font-medium hover:underline">Roles</Link>
        {(id.trim() || role?.name) && (
          <>
            <span className="text-sm text-gray-500">/</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Role: {role?.name ?? id ?? '—'}</span>
          </>
        )}
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/security"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href={backToRolesUrl}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Roles
        </Link>
        <Link
          href="/admin/security/users"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Users
        </Link>
        <Link
          href="/admin/security/api-keys"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          API Keys
        </Link>
        <Link
          href="/admin/security/audit"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Audit Log
        </Link>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Role: {role?.name ?? (id || '—')}</h1>
      <p className="text-muted-foreground mb-6">
        Organization: {orgId || '—'}. Loaded from user-management.
      </p>

      {(!orgId.trim() || !id.trim()) && (
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-6 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Open this page from the Roles list (View) with an organization ID in the query. Missing orgId or role id.
          </p>
          <Link href="/admin/security/roles" className="text-sm font-medium text-blue-600 hover:underline mt-2 inline-block">
            Back to Roles
          </Link>
        </div>
      )}

      {apiBaseUrl && orgId.trim() && id.trim() && (
        <>
          {!loading && !role && !error && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 mb-4">
              <Button type="button" size="sm" onClick={fetchRole}>
                Load role
              </Button>
            </div>
          )}
          {error && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
              <Button type="button" variant="link" size="sm" className="mt-2" onClick={fetchRole}>
                Retry
              </Button>
            </div>
          )}
          {loading && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          )}
          {!loading && role && (
            <>
              <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-lg font-semibold">Details</h2>
                  <Button type="button" variant="link" size="sm" onClick={fetchRole} disabled={loading} aria-label="Refresh role details">Refresh</Button>
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input className="max-w-md text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input className="max-w-md text-sm" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} disabled={saving} />
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</span>
                      {permissionsLoading ? (
                        <p className="text-sm text-gray-500">Loading permissions…</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto border rounded p-2 dark:bg-gray-800 dark:border-gray-700 space-y-1.5 text-sm">
                          {allPermissions.map((p) => (
                            <Label key={p.id} className="flex cursor-pointer items-center gap-2">
                              <Checkbox
                                checked={editPermissionIds.includes(p.id)}
                                onCheckedChange={() => {
                                  setEditPermissionIds((prev) =>
                                    prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                                  );
                                }}
                                disabled={saving}
                              />
                              <span>{p.displayName}</span>
                              <span className="text-gray-500">({p.code})</span>
                            </Label>
                          ))}
                          {allPermissions.length === 0 && !permissionsLoading && (
                            <p className="text-gray-500">No permissions available.</p>
                          )}
                        </div>
                      )}
                    </div>
                    {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={updateRole} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setSaveError(null); }} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <dl className="text-sm space-y-2">
                      <div><dt className="font-medium text-gray-500">Name</dt><dd>{role.name}</dd></div>
                      <div><dt className="font-medium text-gray-500">Description</dt><dd>{role.description ?? '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Type</dt><dd>{role.isSystemRole ? 'System' : 'Custom'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Super Admin</dt><dd>{role.isSuperAdmin ? 'Yes' : 'No'}</dd></div>
                      <div><dt className="font-medium text-gray-500">User count</dt><dd>{role.userCount ?? '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Created</dt><dd>{role.createdAt ? new Date(role.createdAt).toLocaleString() : '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Updated</dt><dd>{role.updatedAt ? new Date(role.updatedAt).toLocaleString() : '—'}</dd></div>
                    </dl>
                    <div className="mt-4 flex items-center gap-4 flex-wrap">
                      <Link href={backToRolesUrl} className="text-sm font-medium text-blue-600 hover:underline">
                        ← Back to Roles
                      </Link>
                      {role.isCustomRole && !deleteConfirm && (
                        <>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={async () => {
                              setSaveError(null);
                              setPermissionsLoading(true);
                              const encodedOrg = encodeURIComponent(orgId.trim());
                              try {
                                const res = await fetch(
                                  `${apiBaseUrl}/api/users/api/v1/organizations/${encodedOrg}/permissions`,
                                  { credentials: 'include' }
                                );
                                if (!res.ok) throw new Error(`Permissions: HTTP ${res.status}`);
                                const json: { data?: PermissionRow[] } = await res.json();
                                const list = Array.isArray(json?.data) ? json.data : [];
                                setAllPermissions(list);
                                setEditName(role.name);
                                setEditDescription(role.description ?? '');
                                setEditPermissionIds(role.permissions.map((p) => p.id));
                                setEditing(true);
                              } catch (e) {
                                setSaveError(e instanceof Error ? e.message : String(e));
                              } finally {
                                setPermissionsLoading(false);
                              }
                            }}
                            disabled={permissionsLoading}
                          >
                            {permissionsLoading ? 'Loading…' : 'Edit'}
                          </Button>
                          <Button type="button" variant="link" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(true)} disabled={deleting}>
                            Delete role
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
                {role.isCustomRole && deleteConfirm && !editing && (
                  <div className="mt-4 p-4 rounded border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200 mb-2">Are you sure? This cannot be undone.</p>
                    {deleteError && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{deleteError}</p>}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setDeleteConfirm(false); setDeleteError(null); }} disabled={deleting}>
                        Cancel
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={deleteRole} disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Delete role'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {role.permissions && role.permissions.length > 0 && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
                  <h2 className="text-lg font-semibold mb-3">Permissions ({role.permissions.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
                          <th className="text-left py-2 px-4">Code</th>
                          <th className="text-left py-2 px-4">Display name</th>
                          <th className="text-left py-2 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {role.permissions.map((p) => (
                          <tr key={p.id} className="border-b">
                            <td className="py-2 px-4">{p.code}</td>
                            <td className="py-2 px-4">{p.displayName}</td>
                            <td className="py-2 px-4">{p.description ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {role.permissions && role.permissions.length === 0 && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
                  <h2 className="text-lg font-semibold mb-2">Permissions</h2>
                  <p className="text-sm text-gray-500">No permissions assigned.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!apiBaseUrl && orgId.trim() && id.trim() && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}
    </div>
  );
}

export default function RoleDetailPage() {
  return (
    <Suspense fallback={<div className="p-6"><p className="text-sm text-muted-foreground">Loading…</p></div>}>
      <RoleDetailContent />
    </Suspense>
  );
}
