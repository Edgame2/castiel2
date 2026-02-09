/**
 * Single conversation (chat) — GET /api/conversations/:id, POST /api/conversations/:id/messages.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const apiBase =
  typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '') : '';

type Message = {
  id: string;
  role: string;
  content: string;
  status?: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  structuredData?: {
    title?: string;
    messages?: Message[];
  };
};

export default function ConversationDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversation = useCallback(() => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/conversations/${id}?includeMessages=true&messageLimit=100`, {
      credentials: 'include',
    })
      .then((r) => {
        if (r.status === 404) throw new Error('Conversation not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load conversation');
        return r.json();
      })
      .then((data: Conversation) => setConversation(data))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setConversation(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const content = message.trim();
    if (!apiBase || !id || !content || sending) return;
    setSending(true);
    fetch(`${apiBase}/api/conversations/${id}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Send failed');
        return r.json();
      })
      .then(() => {
        setMessage('');
        fetchConversation();
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Send failed'))
      .finally(() => setSending(false));
  };

  const messages = conversation?.structuredData?.messages ?? [];

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/conversations" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          ← Back to conversations
        </Link>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && conversation && (
          <>
            <h1 className="text-xl font-semibold mb-4">
              {conversation.structuredData?.title || `Conversation ${id.slice(0, 8)}`}
            </h1>

            <div className="border rounded-lg p-4 mb-4 min-h-[200px] dark:border-gray-700">
              {messages.length === 0 && (
                <p className="text-sm text-gray-500">No messages yet. Send one below.</p>
              )}
              <ul className="space-y-3">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <span className="font-medium text-gray-500 mr-2">{m.role}:</span>
                    <span className="break-words">{m.content}</span>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message…"
                className="flex-1"
                disabled={sending}
              />
              <Button type="submit" disabled={sending || !message.trim()} size="sm">
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
