/**
 * Conversations list — GET /api/conversations (gateway → ai-conversation).
 * Create: POST /api/conversations. Links to /conversations/[id].
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBase =
  typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '') : '';

type ConversationItem = {
  id: string;
  tenantId?: string;
  structuredData?: { title?: string; summary?: string; lastActivityAt?: string; messageCount?: number };
  createdAt?: string;
  updatedAt?: string;
};

type ListResponse = { conversations?: ConversationItem[]; total?: number };

export default function ConversationsListPage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchConversations = useCallback(() => {
    if (!apiBase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/conversations?limit=50`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load conversations');
        return r.json();
      })
      .then((data: ListResponse) => {
        setItems(Array.isArray(data.conversations) ? data.conversations : []);
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = () => {
    if (!apiBase || creating) return;
    setCreating(true);
    setError(null);
    fetch(`${apiBase}/api/conversations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to create conversation');
        return r.json();
      })
      .then((data: { id?: string }) => {
        if (data?.id) window.location.href = `/conversations/${data.id}`;
        else fetchConversations();
      })
      .catch((e) => {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
        setCreating(false);
      })
      .finally(() => setCreating(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Conversations</h1>
          <Button type="button" onClick={createConversation} disabled={creating || !apiBase} size="sm">
            {creating ? 'Creating…' : 'New conversation'}
          </Button>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No conversations yet. Start a new one above.
          </p>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id} className="border rounded-lg p-3 dark:border-gray-700">
                <Link
                  href={`/conversations/${c.id}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline block"
                >
                  {c.structuredData?.title || `Conversation ${c.id.slice(0, 8)}`}
                </Link>
                {(c.structuredData?.summary ?? c.structuredData?.messageCount != null) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {c.structuredData?.summary ?? `${c.structuredData?.messageCount ?? 0} messages`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
