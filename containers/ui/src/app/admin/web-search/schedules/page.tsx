/**
 * Admin: Recurring web search schedules (dataflow Phase 4.1).
 * List and create. Role-based visibility: scope filter (user | tenant_admin | super_admin).
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type Schedule = {
  id: string;
  tenantId: string;
  userId: string;
  query: string;
  cronExpression: string;
  scope: string;
  role: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { schedules?: Schedule[] };

export default function AdminWebSearchSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createQuery, setCreateQuery] = useState('');
  const [createCron, setCreateCron] = useState('0 9 * * *');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuery, setEditQuery] = useState('');
  const [editCron, setEditCron] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSchedules = useCallback((opts?: { refetchOnly?: boolean }) => {
    if (!apiBase) {
      setLoading(false);
      return;
    }
    if (!opts?.refetchOnly) setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/schedules`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load schedules');
        return r.json();
      })
      .then((data: ListResponse) => setSchedules(Array.isArray(data.schedules) ? data.schedules : []))
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = () => {
    if (!apiBase || !createQuery.trim()) return;
    setCreating(true);
    setError(null);
    fetch(`${apiBase}/api/v1/schedules`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: createQuery.trim(),
        cronExpression: createCron || '0 9 * * *',
        scope: 'user',
        role: 'user',
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Create failed');
        return r.json();
      })
      .then(() => {
        setCreateQuery('');
        fetchSchedules({ refetchOnly: true });
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setCreating(false));
  };

  const startEdit = (s: Schedule) => {
    setEditingId(s.id);
    setEditQuery(s.query);
    setEditCron(s.cronExpression);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQuery('');
    setEditCron('');
  };

  const handleSave = (id: string) => {
    if (!apiBase || !editQuery.trim() || !editCron.trim()) return;
    setSaving(true);
    setError(null);
    fetch(`${apiBase}/api/v1/schedules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: editQuery.trim(), cronExpression: editCron.trim() }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Update failed');
        return r.json();
      })
      .then(() => {
        setEditingId(null);
        setEditQuery('');
        setEditCron('');
        fetchSchedules({ refetchOnly: true });
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setSaving(false));
  };

  const handleDelete = (s: Schedule) => {
    if (!apiBase) return;
    if (!window.confirm(`Delete schedule "${s.query}"?`)) return;
    setDeletingId(s.id);
    setError(null);
    fetch(`${apiBase}/api/v1/schedules/${encodeURIComponent(s.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((r) => {
        if (r.status !== 204 && !r.ok) throw new Error(r.statusText || 'Delete failed');
        fetchSchedules({ refetchOnly: true });
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setDeletingId(null));
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Recurring web search schedules</h1>
          <Link href="/admin" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Admin
          </Link>
        </div>

        <div className="mb-6 p-4 border rounded-lg dark:border-gray-700">
          <h2 className="text-sm font-medium mb-2">Create schedule</h2>
          <div className="flex flex-col gap-2">
            <Input
              type="text"
              placeholder="Search query"
              value={createQuery}
              onChange={(e) => setCreateQuery(e.target.value)}
              className="h-8"
            />
            <Input
              type="text"
              placeholder="Cron (e.g. 0 9 * * * = daily 9am)"
              value={createCron}
              onChange={(e) => setCreateCron(e.target.value)}
              className="h-8"
            />
            <Button type="button" size="sm" onClick={handleCreate} disabled={creating || !createQuery.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && schedules.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">No schedules. Create one above.</p>
        )}
        {!loading && !error && schedules.length > 0 && (
          <ul className="space-y-2">
            {schedules.map((s) => (
              <li key={s.id} className="border rounded-lg p-3 dark:border-gray-700">
                {editingId === s.id ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="text"
                      value={editQuery}
                      onChange={(e) => setEditQuery(e.target.value)}
                      className="h-8"
                      placeholder="Search query"
                    />
                    <Input
                      type="text"
                      value={editCron}
                      onChange={(e) => setEditCron(e.target.value)}
                      className="h-8"
                      placeholder="Cron expression"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" type="button" onClick={() => handleSave(s.id)} disabled={saving || !editQuery.trim() || !editCron.trim()}>
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" type="button" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{s.query}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Cron: {s.cronExpression} · Scope: {s.scope} · Next: {s.nextRunAt ?? '—'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" variant="link" size="sm" className="text-sm p-0 h-auto" onClick={() => startEdit(s)} aria-label={`Edit schedule "${s.query}"`}>
                        Edit
                      </Button>
                      <Button type="button" variant="link" size="sm" className="text-sm text-red-600 dark:text-red-400 p-0 h-auto" onClick={() => handleDelete(s)} disabled={deletingId === s.id} aria-label={`Delete schedule "${s.query}"`}>
                        {deletingId === s.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
