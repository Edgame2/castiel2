'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
type Category = 'action' | 'relevance' | 'quality' | 'timing' | 'other';
type Sentiment = 'positive' | 'neutral' | 'negative';
const SENTIMENT_SCORE: Record<Sentiment, number> = { positive: 1, neutral: 0, negative: -1 };
const DEFAULT_BEHAVIOR = { createsTask: false, hidesRecommendation: false, suppressSimilar: false, requiresComment: false };

export default function FeedbackTypeNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<Category>('action');
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [order, setOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !displayName.trim() || submitting) return;
    const slug = name.trim() || displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'new_type';
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/admin/feedback-types`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: slug,
        displayName: displayName.trim(),
        category,
        sentiment,
        sentimentScore: SENTIMENT_SCORE[sentiment],
        order,
        behavior: DEFAULT_BEHAVIOR,
        applicableToRecTypes: [],
        isActive: true,
        isDefault: false,
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { id?: string; error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        if (data?.id) router.push(`/admin/feedback/types/${encodeURIComponent(data.id)}`);
        else router.push('/admin/feedback/types');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Create failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/feedback">Feedback</Link><span>/</span>
          <Link href="/admin/feedback/types">Types</Link><span>/</span>
          <span className="text-foreground">New type</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create feedback type</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name (slug, optional)</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">Display name</label>
            <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
              <option value="action">Action</option><option value="relevance">Relevance</option><option value="quality">Quality</option><option value="timing">Timing</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="sentiment" className="block text-sm font-medium mb-1">Sentiment</label>
            <select id="sentiment" value={sentiment} onChange={(e) => setSentiment(e.target.value as Sentiment)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
              <option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option>
            </select>
          </div>
          <div>
            <label htmlFor="order" className="block text-sm font-medium mb-1">Order</label>
            <input id="order" type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !displayName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/feedback/types" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/feedback/types" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Types</Link></p>
      </div>
    </div>
  );
}
