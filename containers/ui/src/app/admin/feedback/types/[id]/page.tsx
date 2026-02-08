'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type Category = 'action' | 'relevance' | 'quality' | 'timing' | 'other';
type Sentiment = 'positive' | 'neutral' | 'negative';

interface FeedbackType {
  id: string;
  name?: string;
  displayName: string;
  category: Category;
  sentiment: Sentiment;
  sentimentScore: number;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  isDefault: boolean;
  updatedAt?: string;
}

export default function FeedbackTypeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [type, setType] = useState<FeedbackType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<Category>('action');
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [sentimentScore, setSentimentScore] = useState(0);
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchType = useCallback(() => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) throw new Error('Feedback type not found');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: FeedbackType) => {
        setType(data);
        setDisplayName(data.displayName ?? '');
        setCategory((data.category as Category) ?? 'action');
        setSentiment((data.sentiment as Sentiment) ?? 'neutral');
        setSentimentScore(data.sentimentScore ?? 0);
        setOrder(data.order ?? 0);
        setIsActive(data.isActive ?? true);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setType(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchType();
  }, [fetchType]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !id || !type || saving) return;
    setSaveError(null);
    setSaving(true);
    fetch(`${apiBase}/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        category,
        sentiment,
        sentimentScore,
        order,
        isActive,
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data: { error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        setEditing(false);
        fetchType();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !id || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (!r.ok && r.status !== 204) return r.json().then((d: { error?: { message?: string } }) => { throw new Error(d?.error?.message ?? r.statusText); });
        router.push('/admin/feedback/types');
      })
      .catch((e) => {
        setSaveError(e instanceof Error ? e.message : 'Delete failed');
        setDeleting(false);
      });
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/feedback" className="hover:underline">Feedback</Link>
          <span>/</span>
          <Link href="/admin/feedback/types" className="hover:underline">Types</Link>
          <span>/</span>
          <span className="text-foreground">Type</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && type && (
          <>
            <h1 className="text-xl font-semibold mb-4">{type.displayName}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {type.id}</p>
                <p><span className="text-gray-500">Name:</span> {type.name ?? type.id}</p>
                <p><span className="text-gray-500">Category:</span> {type.category}</p>
                <p><span className="text-gray-500">Sentiment:</span> {type.sentiment} ({type.sentimentScore})</p>
                <p><span className="text-gray-500">Order:</span> {type.order}</p>
                <p><span className="text-gray-500">Active:</span> {type.isActive ? 'Yes' : 'No'}</p>
                <p><span className="text-gray-500">Default:</span> {type.isDefault ? 'Yes' : 'No'}</p>
                {type.updatedAt && <p><span className="text-gray-500">Updated:</span> {new Date(type.updatedAt).toLocaleString()}</p>}
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium mb-1">Display name</label>
                  <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-1">Category</label>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <option value="action">Action</option>
                    <option value="relevance">Relevance</option>
                    <option value="quality">Quality</option>
                    <option value="timing">Timing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sentiment" className="block text-sm font-medium mb-1">Sentiment</label>
                  <select id="sentiment" value={sentiment} onChange={(e) => { const v = e.target.value as Sentiment; setSentiment(v); setSentimentScore(v === 'positive' ? 1 : v === 'negative' ? -1 : 0); }} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="order" className="block text-sm font-medium mb-1">Order</label>
                  <input id="order" type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                  <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this feedback type? Pre-deletion checks may apply (not default, not in use, inactive 30 days).</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
        <p className="mt-4"><Link href="/admin/feedback/types" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Types</Link></p>
      </div>
    </div>
  );
}
