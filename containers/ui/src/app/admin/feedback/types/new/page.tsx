'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
          <div className="space-y-2">
            <Label htmlFor="name">Name (slug, optional)</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
          </div>
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
            <Select value={sentiment} onValueChange={(v) => setSentiment(v as Sentiment)}>
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
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !displayName.trim()}>Create</Button>
            <Button asChild variant="outline">
              <Link href="/admin/feedback/types">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/feedback/types" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Types</Link></p>
      </div>
    </div>
  );
}
