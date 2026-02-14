'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

export default function AdminSecurityApiKeyNewPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [scope, setScope] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ key?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tenantId.trim();
    const n = name.trim();
    if (!getApiBaseUrl() || !t || !n || submitting) return;
    setError(null);
    setSubmitting(true);
    apiFetch(`/api/v1/tenants/${encodeURIComponent(t)}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, scope: scope.trim() || undefined, expiresAt: expiresAt.trim() || undefined }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((body: { error?: string }) => { throw new Error(body?.error || r.statusText); });
        return r.json();
      })
      .then((data: { key?: string }) => {
        setCreated(data);
        if (!data?.key) router.push(`/admin/security/api-keys?tenantId=${encodeURIComponent(t)}`);
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
          <Link href="/admin/security/api-keys" className="hover:underline">API Keys</Link>
          <span>/</span>
          <span className="text-foreground">New API key</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create API key</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {created?.key && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 mb-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Copy the key now. It will not be shown again.</p>
            <pre className="text-sm mt-2 break-all font-mono">{created.key}</pre>
          </div>
        )}
        {!created?.key && (
          <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
            <div>
              <Label htmlFor="tenantId" className="block mb-1">Tenant ID</Label>
              <Input id="tenantId" type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full" required />
            </div>
            <div>
              <Label htmlFor="name" className="block mb-1">Key name</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
            </div>
            <div>
              <Label htmlFor="scope" className="block mb-1">Scope (optional)</Label>
              <Input id="scope" type="text" value={scope} onChange={(e) => setScope(e.target.value)} className="w-full" />
            </div>
            <div>
              <Label htmlFor="expiresAt" className="block mb-1">Expires at (optional)</Label>
              <Input id="expiresAt" type="text" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} placeholder="e.g. 2026-12-31" className="w-full" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting || !tenantId.trim() || !name.trim()}>
                {submitting ? 'Creating…' : 'Create API key'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/security/api-keys">Cancel</Link>
              </Button>
            </div>
          </form>
        )}
        <p className="mt-4"><Link href="/admin/security/api-keys" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to API Keys</Link></p>
      </div>
    </div>
  );
}
