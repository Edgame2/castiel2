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
import { Textarea } from '@/components/ui/textarea';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const TYPES = ['classification', 'regression', 'clustering', 'recommendation', 'forecasting', 'anomaly_detection'] as const;

export default function MLModelsModelNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('classification');
  const [featuresStr, setFeaturesStr] = useState('');
  const [description, setDescription] = useState('');
  const [algorithm, setAlgorithm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const features = featuresStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (!apiBase || !name.trim() || features.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/ml/models`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, features, description: description.trim() || undefined, algorithm: algorithm.trim() || undefined }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || `HTTP ${r.status}`)));
        return r.json();
      })
      .then((saved: { id?: string }) => {
        if (saved?.id) router.push(`/admin/ml-models/models/${encodeURIComponent(saved.id)}`);
        else router.push('/admin/ml-models/models');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/ml-models">ML Models</Link><span>/</span>
          <Link href="/admin/ml-models/models">Models</Link><span>/</span>
          <span className="text-foreground">New model</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create model</h1>
        {error && <p className="text-sm text-destructive mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 border-border space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as (typeof TYPES)[number])}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="features">Feature IDs (comma-separated UUIDs) *</Label>
            <Input id="features" type="text" value={featuresStr} onChange={(e) => setFeaturesStr(e.target.value)} placeholder="uuid1,uuid2" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="algorithm">Algorithm</Label>
            <Input id="algorithm" type="text" value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim() || !featuresStr.trim()}>
              Create
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/ml-models/models">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/ml-models/models" className="text-sm text-primary hover:underline">Back to Models</Link></p>
      </div>
    </div>
  );
}
