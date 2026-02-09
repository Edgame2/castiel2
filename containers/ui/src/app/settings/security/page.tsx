/**
 * Account security — sessions (list, revoke), MFA, and API keys (auth-service user keys).
 * GET/DELETE/POST /api/users/me/sessions, /api/auth/mfa/*, /api/auth/api-keys via gateway.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';

interface SessionItem {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  isRememberMe: boolean | null;
  expiresAt: string;
  lastActivityAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeAllOthers, setRevokeAllOthers] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState<boolean | null>(null);
  const [showDisableMfaForm, setShowDisableMfaForm] = useState(false);
  const [disableMfaCode, setDisableMfaCode] = useState('');
  const [disableMfaLoading, setDisableMfaLoading] = useState(false);
  const [disableMfaError, setDisableMfaError] = useState<string | null>(null);
  const [showBackupCodesForm, setShowBackupCodesForm] = useState(false);
  const [backupCodesCode, setBackupCodesCode] = useState('');
  const [backupCodesLoading, setBackupCodesLoading] = useState(false);
  const [backupCodesError, setBackupCodesError] = useState<string | null>(null);
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState<string[] | null>(null);
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; createdAt: string; expiresAt: string | null }[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysEnabled, setApiKeysEnabled] = useState<boolean | null>(null);
  const [createKeyName, setCreateKeyName] = useState('');
  const [createKeyExpires, setCreateKeyExpires] = useState('');
  const [createKeyLoading, setCreateKeyLoading] = useState(false);
  const [createKeyError, setCreateKeyError] = useState<string | null>(null);
  const [createdKeyOnce, setCreatedKeyOnce] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/users/me/sessions');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSessions(json?.data?.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMfaStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/mfa/status');
      if (res.status === 403) {
        setMfaEnrolled(null);
        return;
      }
      if (!res.ok) {
        setMfaEnrolled(null);
        return;
      }
      const json = await res.json().catch(() => ({}));
      setMfaEnrolled(!!json?.enrolled);
    } catch {
      setMfaEnrolled(null);
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    try {
      const res = await apiFetch('/api/auth/api-keys');
      if (res.status === 403) {
        setApiKeysEnabled(false);
        setApiKeys([]);
        return;
      }
      if (!res.ok) {
        setApiKeysEnabled(false);
        return;
      }
      const json = await res.json().catch(() => ({}));
      setApiKeysEnabled(true);
      setApiKeys(Array.isArray(json?.keys) ? json.keys : []);
    } catch {
      setApiKeysEnabled(false);
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMfaStatus();
  }, [fetchMfaStatus]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    setError(null);
    try {
      const res = await apiFetch(`/api/users/me/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      await fetchSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('Revoke all other sessions? You will stay signed in on this device.')) return;
    setRevokeAllOthers(true);
    setError(null);
    try {
      const res = await apiFetch('/api/users/me/sessions/revoke-all-others', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      await fetchSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke sessions');
    } finally {
      setRevokeAllOthers(false);
    }
  };

  const handleGenerateBackupCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = backupCodesCode.replace(/\s/g, '');
    if (code.length < 6) {
      setBackupCodesError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBackupCodesError(null);
    setBackupCodesLoading(true);
    try {
      const res = await apiFetch('/api/auth/mfa/backup-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        skip401Redirect: true,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setBackupCodesError('Invalid or expired code. Try again.');
        return;
      }
      if (res.status === 403) {
        setBackupCodesError('MFA is not enabled.');
        return;
      }
      if (!res.ok) {
        setBackupCodesError((data?.error as string) || 'Failed to generate backup codes');
        return;
      }
      setGeneratedBackupCodes(Array.isArray(data?.codes) ? data.codes : []);
      setShowBackupCodesForm(false);
      setBackupCodesCode('');
    } catch (e) {
      setBackupCodesError(e instanceof Error ? e.message : 'Failed to generate backup codes');
    } finally {
      setBackupCodesLoading(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = disableMfaCode.replace(/\s/g, '');
    if (code.length < 6) {
      setDisableMfaError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setDisableMfaError(null);
    setDisableMfaLoading(true);
    try {
      const res = await apiFetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        skip401Redirect: true,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setDisableMfaError('Invalid or expired code. Try again.');
        return;
      }
      if (res.status === 403) {
        setDisableMfaError('MFA is not enabled.');
        return;
      }
      if (!res.ok) {
        setDisableMfaError((data?.error as string) || 'Failed to disable MFA');
        return;
      }
      setShowDisableMfaForm(false);
      setDisableMfaCode('');
      await fetchMfaStatus();
    } catch (e) {
      setDisableMfaError(e instanceof Error ? e.message : 'Failed to disable MFA');
    } finally {
      setDisableMfaLoading(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createKeyName.trim();
    if (!name) {
      setCreateKeyError('Name is required.');
      return;
    }
    setCreateKeyError(null);
    setCreateKeyLoading(true);
    try {
      const body: { name: string; expiresInDays?: number } = { name };
      const days = createKeyExpires.trim() ? parseInt(createKeyExpires.trim(), 10) : undefined;
      if (days != null && !Number.isNaN(days) && days > 0) body.expiresInDays = days;
      const res = await apiFetch('/api/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setCreateKeyError('API keys are not enabled or you cannot create keys with an API key.');
        return;
      }
      if (!res.ok) {
        setCreateKeyError((data?.error as string) || 'Failed to create API key');
        return;
      }
      if (data?.key) {
        setCreatedKeyOnce(data.key);
        setCreateKeyName('');
        setCreateKeyExpires('');
        fetchApiKeys();
      }
    } catch (e) {
      setCreateKeyError(e instanceof Error ? e.message : 'Failed to create API key');
    } finally {
      setCreateKeyLoading(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return;
    setRevokingKeyId(id);
    setCreateKeyError(null);
    try {
      const res = await apiFetch(`/api/auth/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.status === 404) {
        setCreateKeyError('API key not found.');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateKeyError((data?.error as string) || 'Failed to revoke API key');
        return;
      }
      await fetchApiKeys();
    } catch (e) {
      setCreateKeyError(e instanceof Error ? e.message : 'Failed to revoke API key');
    } finally {
      setRevokingKeyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold mb-4">Security</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage your account security and active sessions.
          </p>
        </div>

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-medium mb-2">Multi-factor authentication</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Add an extra layer of security with an authenticator app or backup codes.
          </p>
          {mfaEnrolled === true ? (
            <p className="text-sm text-green-600 dark:text-green-400 mb-2">MFA is enabled.</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {mfaEnrolled !== true && (
              <Link
                href="/settings/mfa/enroll"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Set up MFA
              </Link>
            )}
            {mfaEnrolled === true && !showDisableMfaForm && !showBackupCodesForm && generatedBackupCodes === null && (
              <>
                <Link
                  href="/settings/mfa/verify"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                >
                  Verify code
                </Link>
                <Button type="button" variant="link" className="p-0 h-auto text-blue-600" onClick={() => setShowBackupCodesForm(true)}>
                  Generate backup codes
                </Button>
                <Button type="button" variant="link" className="p-0 h-auto text-red-600" onClick={() => setShowDisableMfaForm(true)}>
                  Disable MFA
                </Button>
              </>
            )}
            {mfaEnrolled === true && showBackupCodesForm && generatedBackupCodes === null && (
              <form onSubmit={handleGenerateBackupCodes} className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  id="backup-codes-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="Enter 6-digit code"
                  value={backupCodesCode}
                  onChange={(e) => setBackupCodesCode(e.target.value.replace(/\D/g, ''))}
                  className="w-36"
                />
                <Button type="submit" size="sm" disabled={backupCodesLoading || backupCodesCode.length < 6}>
                  {backupCodesLoading ? 'Generating…' : 'Generate codes'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowBackupCodesForm(false); setBackupCodesCode(''); setBackupCodesError(null); }}>
                  Cancel
                </Button>
                {backupCodesError && <span className="text-sm text-destructive w-full">{backupCodesError}</span>}
              </form>
            )}
            {generatedBackupCodes && generatedBackupCodes.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Save these codes in a secure place. They won’t be shown again.</p>
                <ul className="list-disc list-inside text-sm font-mono mb-2">
                  {generatedBackupCodes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <Button type="button" variant="link" className="p-0 h-auto" onClick={() => { setGeneratedBackupCodes(null); }}>
                  Done
                </Button>
              </div>
            )}
            {mfaEnrolled === true && showDisableMfaForm && (
              <form onSubmit={handleDisableMfa} className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  id="disable-mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="Enter 6-digit code"
                  value={disableMfaCode}
                  onChange={(e) => setDisableMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-36"
                />
                <Button type="submit" size="sm" variant="destructive" disabled={disableMfaLoading || disableMfaCode.length < 6}>
                  {disableMfaLoading ? 'Disabling…' : 'Confirm disable'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowDisableMfaForm(false); setDisableMfaCode(''); setDisableMfaError(null); }}>
                  Cancel
                </Button>
                {disableMfaError && <span className="text-sm text-destructive w-full">{disableMfaError}</span>}
              </form>
            )}
          </div>
        </section>

        {apiKeysEnabled === true && (
          <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-medium mb-2">API keys</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create API keys for programmatic access. Use them in the <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">Authorization: Bearer &lt;key&gt;</code> header or <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">X-API-Key</code>. The full key is only shown once when created.
            </p>
            {createKeyError && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3 mb-4">
                {createKeyError}
              </div>
            )}
            {createdKeyOnce ? (
              <div className="mb-4 p-3 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Copy your API key now. It won&apos;t be shown again.</p>
                <p className="text-sm font-mono break-all text-gray-800 dark:text-gray-200">{createdKeyOnce}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button type="button" variant="link" className="p-0 h-auto text-blue-600" onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(createdKeyOnce);
                      setKeyCopied(true);
                      setTimeout(() => setKeyCopied(false), 2000);
                    } catch {
                      // Clipboard API not available (e.g. non-secure context)
                    }
                  }}>
                    {keyCopied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setCreatedKeyOnce(null); setKeyCopied(false); }}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="mb-4 flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="api-key-name">Name</Label>
                  <Input
                    id="api-key-name"
                    type="text"
                    value={createKeyName}
                    onChange={(e) => setCreateKeyName(e.target.value)}
                    placeholder="e.g. CI pipeline"
                    className="w-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key-expires">Expires (days, optional)</Label>
                  <Input
                    id="api-key-expires"
                    type="number"
                    min={1}
                    value={createKeyExpires}
                    onChange={(e) => setCreateKeyExpires(e.target.value)}
                    placeholder="blank = no expiry"
                    className="w-24"
                  />
                </div>
                <Button type="submit" size="sm" disabled={createKeyLoading || !createKeyName.trim()}>
                  {createKeyLoading ? 'Creating…' : 'Create API key'}
                </Button>
              </form>
            )}
            {apiKeysLoading ? (
              <p className="text-sm text-gray-500">Loading API keys…</p>
            ) : apiKeys.length === 0 ? (
              <p className="text-sm text-gray-500">No API keys. Create one above.</p>
            ) : (
              <ul className="space-y-2">
                {apiKeys.map((k) => (
                  <li
                    key={k.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 dark:border-gray-600 p-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{k.name}</span>
                      <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                        Created {formatDate(k.createdAt)}
                        {k.expiresAt ? ` · Expires ${formatDate(k.expiresAt)}` : ''}
                      </p>
                    </div>
                    <Button type="button" variant="link" size="sm" className="p-0 h-auto text-red-600" onClick={() => handleRevokeApiKey(k.id)} disabled={revokingKeyId === k.id}>
                      {revokingKeyId === k.id ? 'Revoking…' : 'Revoke'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-medium mb-2">Active sessions</h2>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3 mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-gray-500">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500">No active sessions.</p>
          ) : (
            <>
              <ul className="space-y-3 mb-4">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 dark:border-gray-600 p-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {s.deviceName || s.deviceType || 'Unknown device'}
                        {s.isCurrent && (
                          <span className="ml-2 text-gray-500">(this session)</span>
                        )}
                      </span>
                      <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                        {[s.city, s.country].filter(Boolean).join(', ') || s.ipAddress || '—'} · Last active {formatDate(s.lastActivityAt)}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <Button type="button" variant="link" size="sm" className="p-0 h-auto text-red-600" onClick={() => handleRevoke(s.id)} disabled={revoking === s.id}>
                        {revoking === s.id ? 'Revoking…' : 'Revoke'}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <Button type="button" variant="destructive" size="sm" onClick={handleRevokeAllOthers} disabled={revokeAllOthers}>
                  {revokeAllOthers ? 'Revoking…' : 'Revoke all other sessions'}
                </Button>
              )}
            </>
          )}
        </section>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          <Link href="/settings/profile" className="underline hover:no-underline">
            Back to profile
          </Link>
        </p>
      </div>
    </div>
  );
}
