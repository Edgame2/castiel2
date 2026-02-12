/**
 * Admin: Prompt template detail — GET /api/v1/prompts/:id (gateway → prompt_service).
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

type PromptDetail = {
  id: string;
  name?: string;
  slug?: string;
  status?: string;
  category?: string;
  content?: string;
  description?: string;
};

export default function AdminPromptDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = useCallback(() => {
    if (!getApiBaseUrl() || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/prompts/${encodeURIComponent(id)}`)
      .then((r: Response) => {
        if (r.status === 404) throw new Error('Prompt not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load prompt');
        return r.json();
      })
      .then((data: PromptDetail) => setPrompt(data))
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setPrompt(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/prompts" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          ← Back to prompts
        </Link>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && prompt && (
          <div className="border rounded-lg p-6 dark:border-gray-700">
            <h1 className="text-xl font-semibold mb-2">{prompt.name || prompt.slug || prompt.id}</h1>
            {(prompt.status ?? prompt.category) && (
              <p className="text-sm text-gray-500 mb-2">
                {[prompt.status, prompt.category].filter(Boolean).join(' · ')}
              </p>
            )}
            {prompt.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{prompt.description}</p>
            )}
            {prompt.content != null && (
              <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                {prompt.content}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
