/**
 * Current user profile — GET /api/users/me, PUT /api/users/me via gateway.
 * Edit name, firstName, lastName; requires authenticated session (Bearer or cookie per gateway).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

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
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/users/me`, { credentials: 'include' });
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
      setError(e instanceof Error ? e.message : 'Failed to load profile');
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
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/users/me`, {
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
      setError(e instanceof Error ? e.message : 'Failed to save');
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
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={profile?.email ?? ''}
              readOnly
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium mb-1">
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-firstName" className="block text-sm font-medium mb-1">
                First name
              </label>
              <input
                id="profile-firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={100}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-lastName" className="block text-sm font-medium mb-1">
                Last name
              </label>
              <input
                id="profile-lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={100}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
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
