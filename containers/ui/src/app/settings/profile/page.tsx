/**
 * Current user profile — GET /api/users/me, PUT /api/users/me via gateway.
 * Edit name, firstName, lastName; requires authenticated session (Bearer or cookie per gateway).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
  language?: string | null;
  isEmailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = getApiBaseUrl().replace(/\/$/, '') || '';
      const url = base ? `${base}/api/users/me` : '/api/users/me';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const data = json?.data ?? null;
      setProfile(data);
      if (data) {
        setName(data.name ?? '');
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
      }
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSaving(true);
    try {
      const base = getApiBaseUrl().replace(/\/$/, '') || '';
      const url = base ? `${base}/api/users/me` : '/api/users/me';
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim() || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j?.error as string) || `HTTP ${res.status}`);
      setProfile((prev) => (prev ? { ...prev, name: name.trim() || null, firstName: firstName.trim() || null, lastName: lastName.trim() || null } : null));
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading profile…</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h1 className="text-xl font-semibold mb-4">Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" value={profile?.email ?? ''} readOnly className="w-full bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="profile-firstName">First name</Label>
              <Input id="profile-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-lastName">Last name</Label>
              <Input id="profile-lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} className="w-full" />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <Link href="/settings/security" className="underline hover:no-underline">
            Security & MFA
          </Link>
        </p>
      </div>
    </div>
  );
}
