'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface Permission {
  id: string;
  code?: string;
  displayName?: string;
}

export default function AdminSecurityRoleNewPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(() => {
    if (!getApiBaseUrl() || !orgId.trim()) {
      setPermissions([]);
      return;
    }
    setPermsLoading(true);
    apiFetch(`/api/v1/organizations/${encodeURIComponent(orgId.trim())}/permissions`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json: { data?: Permission[] }) => setPermissions(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setPermissions([]))
      .finally(() => setPermsLoading(false));
  }, [orgId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const togglePermission = (id: string) => {
    setPermissionIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const o = orgId.trim();
    const n = name.trim();
    if (!getApiBaseUrl() || !o || !n || submitting) return;
    setError(null);
    setSubmitting(true);
    apiFetch(`/api/v1/organizations/${encodeURIComponent(o)}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, description: description.trim() || null, permissionIds }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((body: { error?: string }) => { throw new Error(body?.error || r.statusText); });
        return r.json();
      })
      .then((data: { data?: { id: string } }) => {
        if (data?.data?.id) router.push(`/admin/security/roles/${data.data.id}?orgId=${encodeURIComponent(o)}`);
        else router.push(`/admin/security/roles?orgId=${o}`);
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/security" className="hover:underline">Security</Link>
          <span>/</span>
          <Link href="/admin/security/roles" className="hover:underline">Roles</Link>
          <span>/</span>
          <span className="text-foreground">New role</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create role</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <Label htmlFor="orgId" className="block mb-1">Organization ID</Label>
            <Input id="orgId" type="text" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-full" required />
          </div>
          <div>
            <Label htmlFor="name" className="block mb-1">Role name</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
          </div>
          <div>
            <Label htmlFor="description" className="block mb-1">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full" />
          </div>
          <div>
            <span className="block text-sm font-medium mb-2">Permissions</span>
            {permsLoading && <p className="text-sm text-gray-500">Loading…</p>}
            {!permsLoading && permissions.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded p-2 dark:border-gray-700 space-y-1">
                {permissions.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={`perm-${p.id}`}
                      checked={permissionIds.includes(p.id)}
                      onCheckedChange={() => togglePermission(p.id)}
                    />
                    <Label htmlFor={`perm-${p.id}`} className="font-normal cursor-pointer">
                      {p.displayName ?? p.code ?? p.id}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {!permsLoading && permissions.length === 0 && orgId.trim() && <p className="text-sm text-gray-500">No permissions found.</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !orgId.trim() || !name.trim()}>
              {submitting ? 'Creating…' : 'Create role'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/security/roles">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/security/roles" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Roles</Link></p>
      </div>
    </div>
  );
}
