'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    if (!getApiBaseUrl() || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/admin/feedback-types/${encodeURIComponent(id)}`)
      .then((r: Response) => {
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
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setType(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchType();
  }, [fetchType]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl() || !id || !type || saving) return;
    setSaveError(null);
    setSaving(true);
    apiFetch(`/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, {
      method: 'PUT',
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
      .then((r: Response) => r.json().catch(() => ({})))
      .then((data: { error?: { message?: string } }) => {
        if (data?.error?.message) throw new Error(data.error.message);
        setEditing(false);
        fetchType();
      })
      .catch(() => setSaveError(GENERIC_ERROR_MESSAGE))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!getApiBaseUrl() || !id || deleting) return;
    setDeleting(true);
    apiFetch(`/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then((r: Response) => {
        if (!r.ok && r.status !== 204) return r.json().then((d: { error?: { message?: string } }) => { throw new Error(d?.error?.message ?? r.statusText); });
        router.push('/admin/feedback/types');
      })
      .catch(() => {
        setSaveError(GENERIC_ERROR_MESSAGE);
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
                  <Button type="button" onClick={() => setEditing(true)}>Edit</Button>
                  <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>Delete</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                      <SelectItem value="timing">Timing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sentiment">Sentiment</Label>
                  <Select value={sentiment} onValueChange={(v) => { const s = v as Sentiment; setSentiment(s); setSentimentScore(s === 'positive' ? 1 : s === 'negative' ? -1 : 0); }}>
                    <SelectTrigger id="sentiment" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Order</Label>
                  <Input id="order" type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)} className="w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isActive" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
                  <Label htmlFor="isActive" className="text-sm font-medium">Active</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-destructive/30 bg-destructive/10">
                <p className="text-sm mb-2">Delete this feedback type? Pre-deletion checks may apply (not default, not in use, inactive 30 days).</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
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
