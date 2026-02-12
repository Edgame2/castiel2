/**
 * Admin: Invite user — POST /api/v1/organizations/:orgId/invitations (gateway → user_management).
 * Requires orgId, email, roleId; optional message.
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type RoleOption = { id: string; name?: string };

type RolesResponse = { data?: RoleOption[] };

export default function AdminSecurityUserInvitePage() {
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [message, setMessage] = useState('');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchRoles = useCallback(() => {
    if (!apiBase || !orgId.trim()) {
      setRoles([]);
      return;
    }
    setRolesLoading(true);
    fetch(
      `${apiBase}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/roles`,
      { credentials: 'include' }
    )
      .then((r) => {
        if (!r.ok) return { data: [] };
        return r.json();
      })
      .then((json: RolesResponse) => setRoles(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }, [orgId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const o = orgId.trim();
    const em = email.trim();
    const r = roleId.trim();
    if (!apiBase || !o || !em || !r || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/organizations/${encodeURIComponent(o)}/invitations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: em,
        roleId: r,
        message: message.trim() || undefined,
        invitationType: 'email',
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((body) => { throw new Error((body as { error?: string })?.error || res.statusText); });
        setSuccess(true);
      })
      .catch((e) => { if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e); setSubmitError(GENERIC_ERROR_MESSAGE); })
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
          <Link href="/admin/security/users" className="hover:underline">Users</Link>
          <span>/</span>
          <span className="text-foreground">Invite user</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Invite user</h1>

        {success && (
          <p className="text-sm text-green-600 dark:text-green-400 mb-4" role="status">
            Invitation created. The user will receive an email to accept.
          </p>
        )}

        {submitError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgId">Organization ID</Label>
            <Input id="orgId" type="text" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-full" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleId">Role</Label>
            {roles.length > 0 ? (
              <Select value={roleId || '_none'} onValueChange={(v) => setRoleId(v === '_none' ? '' : v)}>
                <SelectTrigger id="roleId" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Select role</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name ?? r.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="roleId"
                type="text"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                placeholder={rolesLoading ? 'Loading roles…' : 'Enter role ID (load org first)'}
                className="w-full"
                required
                disabled={rolesLoading}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !orgId.trim() || !email.trim() || !roleId.trim()}>
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/security/users">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4">
          <Link href="/admin/security/users" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to Users
          </Link>
        </p>
      </div>
    </div>
  );
}
