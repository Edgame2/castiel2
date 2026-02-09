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
const TYPES = ['numeric', 'categorical', 'text', 'datetime', 'boolean'] as const;

export default function FeatureEngineeringFeatureNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('numeric');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [transformation, setTransformation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/ml/features`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        source: source.trim() || undefined,
        transformation: transformation.trim() || undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || `HTTP ${r.status}`)));
        return r.json();
      })
      .then((saved: { id?: string }) => {
        if (saved?.id) router.push(`/admin/feature-engineering/features/${encodeURIComponent(saved.id)}`);
        else router.push('/admin/feature-engineering/features');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/feature-engineering">Feature Engineering</Link><span>/</span>
          <Link href="/admin/feature-engineering/features">Features</Link><span>/</span>
          <span className="text-foreground">New feature</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create feature</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as (typeof TYPES)[number])}>
              <SelectTrigger id="type" className="w-full">
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
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" type="text" value={source} onChange={(e) => setSource(e.target.value)} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transformation">Transformation</Label>
            <Input id="transformation" type="text" value={transformation} onChange={(e) => setTransformation(e.target.value)} className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim()}>Create</Button>
            <Button asChild variant="outline">
              <Link href="/admin/feature-engineering/features">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/feature-engineering/features" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Features</Link></p>
      </div>
    </div>
  );
}
