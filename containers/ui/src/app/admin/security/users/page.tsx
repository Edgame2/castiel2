/**
 * Super Admin: User management (W11 §10.2)
 * GET /api/users/api/v1/organizations/:orgId/member-count, member-limit, members via gateway (user_management).
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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface MemberCountResponse {
  data?: { memberCount?: number };
}

interface MemberLimitResponse {
  data?: { memberCount?: number; memberLimit?: number; isAtLimit?: boolean };
}

interface MemberRow {
  userId: string;
  email?: string | null;
  name?: string | null;
  roleName: string;
  status: string;
  joinedAt: string;
}

interface MembersResponse {
  data?: MemberRow[];
}

export default function SecurityUsersPage() {
  const [orgId, setOrgId] = useState('');
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [memberLimit, setMemberLimit] = useState<number | null>(null);
  const [isAtLimit, setIsAtLimit] = useState<boolean | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'' | 'userId' | 'email' | 'name' | 'roleName' | 'status' | 'joinedAt'>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = (() => {
    if (!sortBy || members.length === 0) return members;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...members].sort((a, b) => {
      let base: number;
      if (sortBy === 'joinedAt') {
        const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        base = ta - tb;
      } else {
        const va = (a[sortBy] ?? '').toString().toLowerCase();
        const vb = (b[sortBy] ?? '').toString().toLowerCase();
        base = va.localeCompare(vb);
      }
      return mult * base;
    });
  })();

  useEffect(() => {
    document.title = 'Users | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!apiBaseUrl || !orgId.trim()) return;
    setLoading(true);
    setError(null);
    setMemberCount(null);
    setMemberLimit(null);
    setIsAtLimit(null);
    setMembers([]);
    const encoded = encodeURIComponent(orgId.trim());
    try {
      const [countRes, limitRes, membersRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/users/api/v1/organizations/${encoded}/member-count`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/users/api/v1/organizations/${encoded}/member-limit`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/users/api/v1/organizations/${encoded}/members`, { credentials: 'include' }),
      ]);
      if (!countRes.ok) throw new Error(`member-count: HTTP ${countRes.status}`);
      if (!limitRes.ok) throw new Error(`member-limit: HTTP ${limitRes.status}`);
      if (!membersRes.ok) throw new Error(`members: HTTP ${membersRes.status}`);
      const countJson: MemberCountResponse = await countRes.json();
      const limitJson: MemberLimitResponse = await limitRes.json();
      const membersJson: MembersResponse = await membersRes.json();
      setMemberCount(countJson?.data?.memberCount ?? limitJson?.data?.memberCount ?? null);
      setMemberLimit(limitJson?.data?.memberLimit ?? null);
      setIsAtLimit(limitJson?.data?.isAtLimit ?? null);
      setMembers(Array.isArray(membersJson?.data) ? membersJson.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMemberCount(null);
      setMemberLimit(null);
      setIsAtLimit(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/security" className="text-sm font-medium hover:underline">Security & Access Control</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">User Management</h1>
      <p className="text-muted-foreground mb-4">
        Organization member summary and list (count, limit, members). Enter organization ID and load (§10.2).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/security/roles" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Roles</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Users</span>
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
          <div className="rounded-lg border bg-card p-4 mb-4">
            <Label htmlFor="admin-users-org-id" className="block mb-2">Organization ID</Label>
            <div className="flex gap-2 flex-wrap">
              <Input
                id="admin-users-org-id"
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="e.g. org-123"
                className="flex-1 max-w-xs"
                aria-required="true"
              />
              <Button asChild variant="outline">
                <Link href="/admin/security/users/invite">Invite user</Link>
              </Button>
              <Button
                type="button"
                onClick={fetchSummary}
                disabled={!orgId.trim() || loading}
              >
                {loading ? 'Loading…' : 'Load summary'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={fetchSummary}
                disabled={!orgId.trim() || loading}
                title="Refetch member summary for current organization"
              >
                Refresh
              </Button>
            </div>
          </div>

          {loading && orgId.trim() && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-gray-500">Loading member summary…</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
            </div>
          )}

          {!loading && orgId.trim() && !error && (memberCount !== null || memberLimit !== null || members.length > 0) && (
            <>
              <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
                <h2 className="text-lg font-semibold mb-3">Member summary</h2>
                <div className="text-sm space-y-2">
                  {memberCount !== null && <p><strong>Member count:</strong> {memberCount}</p>}
                  {memberLimit !== null && <p><strong>Member limit:</strong> {memberLimit}</p>}
                  {isAtLimit !== null && <p><strong>At limit:</strong> {isAtLimit ? 'Yes' : 'No'}</p>}
                </div>
              </div>
              {members.length > 0 ? (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <h2 className="text-lg font-semibold">Members ({members.length})</h2>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="admin-users-sort-by" className="text-sm font-medium shrink-0">Sort by (§10.2)</Label>
                      <Select value={sortBy || '_default'} onValueChange={(v) => setSortBy(v === '_default' ? '' : v as typeof sortBy)}>
                        <SelectTrigger id="admin-users-sort-by" className="w-[140px]">
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_default">Default</SelectItem>
                          <SelectItem value="userId">User ID</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="roleName">Role</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="joinedAt">Joined</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={sortDir} onValueChange={(v) => setSortDir(v as 'asc' | 'desc')}>
                        <SelectTrigger id="admin-users-sort-dir" className="w-[130px]" aria-label="Sort direction">
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
                          <th className="text-left py-2 px-4">User ID</th>
                          <th className="text-left py-2 px-4">Email</th>
                          <th className="text-left py-2 px-4">Name</th>
                          <th className="text-left py-2 px-4">Role</th>
                          <th className="text-left py-2 px-4">Status</th>
                          <th className="text-left py-2 px-4">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((row) => (
                          <tr key={row.userId} className="border-b">
                            <td className="py-2 px-4">
                              <Link href={`/admin/security/users/${encodeURIComponent(row.userId)}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {row.userId}
                              </Link>
                            </td>
                            <td className="py-2 px-4">{row.email ?? '—'}</td>
                            <td className="py-2 px-4">{row.name ?? '—'}</td>
                            <td className="py-2 px-4">{row.roleName ?? '—'}</td>
                            <td className="py-2 px-4">{row.status ?? '—'}</td>
                            <td className="py-2 px-4">{row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
                  <h2 className="text-lg font-semibold mb-2">Members</h2>
                  <p className="text-sm text-gray-500">No members in this organization.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
