/**
 * CompetitorSelectModal – link a competitor to an opportunity (Gap 4).
 * On open: GET /api/v1/competitors. On select+confirm: POST /api/v1/competitors/:id/track body { opportunityId }.
 */

'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useCallback } from 'react';

export type CompetitorSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  onLinked?: () => void;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

type Competitor = { id: string; name: string; aliases?: string[]; industry?: string };

export function CompetitorSelectModal({
  isOpen,
  onClose,
  opportunityId,
  onLinked,
  apiBaseUrl = '',
  getHeaders,
}: CompetitorSelectModalProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const listUrl = `${base}/api/v1/competitors`;

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
      const res = await fetch(listUrl, {
        headers: { ...headers },
        credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials),
      });
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
  }, [listUrl, getHeaders]);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setSearch('');
      setError(null);
      fetchCompetitors();
    }
  }, [isOpen, fetchCompetitors]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelectedId(null);
        setSearch('');
        setError(null);
        onClose();
      }
    },
    [onClose]
  );

  const handleLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedId) return;
      setError(null);
      setLinking(true);
      try {
        const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
        const res = await fetch(`${base}/api/v1/competitors/${selectedId}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ opportunityId }),
          credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
        onLinked?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLinking(false);
      }
    },
    [selectedId, opportunityId, base, getHeaders, onLinked, onClose]
  );

  const filtered = competitors.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.aliases?.some((a) => String(a).toLowerCase().includes(q)) ||
      c.industry?.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-900 dark:border-gray-700">
          <Dialog.Title className="text-sm font-semibold">Link competitor</Dialog.Title>
          <Dialog.Description className="text-xs text-gray-500 mt-1">Choose a competitor to link to this opportunity.</Dialog.Description>
          <form onSubmit={handleLink} className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search competitors…"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <ul className="max-h-48 overflow-y-auto rounded border border-gray-200 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-600">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                        className={`w-full text-left px-3 py-2 text-sm ${selectedId === c.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        {c.name}
                        {c.industry ? <span className="text-gray-500 ml-1">({c.industry})</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
                {filtered.length === 0 && <p className="text-sm text-gray-500">No competitors match.</p>}
              </>
            )}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || linking || !selectedId}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {linking ? 'Linking…' : 'Link'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
