/**
 * Competitor settings – catalog (Plan §6.5, §936; Full UI).
 * List competitors (GET /api/v1/competitors), add (POST) when competitors_use_shards.
 */

'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type Competitor = { id: string; name: string; aliases?: string[]; industry?: string };

export default function CompetitorSettingsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCompetitors = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/competitors`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { competitors?: Competitor[] };
      setCompetitors(Array.isArray(json?.competitors) ? json.competitors : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !apiBaseUrl) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: createName.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      setCreateName('');
      await fetchCompetitors();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Competitor catalog</h1>
      <p className="text-muted-foreground mb-6">
        Admin: competitor master. List from GET /api/v1/competitors; add when competitors_use_shards is enabled.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 max-w-2xl mb-6">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 mb-4">
          <Label className="sr-only" htmlFor="competitor-name">Name</Label>
          <Input
            id="competitor-name"
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Competitor name"
            className="w-48 text-sm"
          />
          <Button type="submit" variant="outline" size="sm" disabled={creating || !createName.trim()}>
            {creating ? 'Adding…' : 'Add competitor'}
          </Button>
        </form>
        {createError && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{createError}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No competitors. Add one above (requires competitors_use_shards).</p>
        ) : (
          <ul className="text-sm space-y-1">
            {competitors.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span>
                {c.industry && <span className="text-muted-foreground"> — {c.industry}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        <Link href="/analytics/competitive" className="font-medium hover:underline">
          → Competitive intelligence
        </Link>
      </p>
    </div>
  );
}
