'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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

const FEATURE_TYPES = ['numeric', 'categorical', 'text', 'datetime', 'boolean'] as const;

interface FeatureItem {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  source?: string;
  transformation?: string;
  statistics?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export default function FeatureEngineeringFeatureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [feature, setFeature] = useState<FeatureItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('numeric');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [transformation, setTransformation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchFeature = useCallback(async () => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/ml/features/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) {
          setFeature(null);
          return null;
        }
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: FeatureItem | null) => {
        if (data) {
          setFeature(data);
          setName(data.name ?? '');
          setType(data.type ?? 'numeric');
          setDescription(data.description ?? '');
          setSource(data.source ?? '');
          setTransformation(data.transformation ?? '');
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setFeature(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchFeature();
  }, [fetchFeature]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !feature || saving) return;
    setSaveError(null);
    setSaving(true);
    const body = {
      name: name.trim(),
      type: type as (typeof FEATURE_TYPES)[number],
      description: description.trim() || undefined,
      source: source.trim() || undefined,
      transformation: transformation.trim() || undefined,
    };
    fetch(`${apiBase}/api/v1/ml/features/${encodeURIComponent(feature.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || r.statusText)));
        setEditing(false);
        fetchFeature();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !feature || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/ml/features/${encodeURIComponent(feature.id)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (r.status === 204 || r.status === 404) {
          router.push('/admin/feature-engineering/features');
          return;
        }
        return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || 'Delete failed')));
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Delete failed'))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/feature-engineering">Feature Engineering</Link><span>/</span>
          <Link href="/admin/feature-engineering/features">Features</Link><span>/</span>
          <span className="text-foreground">Feature</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && feature && (
          <>
            <h1 className="text-xl font-semibold mb-4">{feature.name ?? feature.id}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {feature.id}</p>
                <p><span className="text-gray-500">Name:</span> {feature.name ?? '—'}</p>
                <p><span className="text-gray-500">Type:</span> {feature.type ?? '—'}</p>
                {feature.description != null && feature.description !== '' && <p><span className="text-gray-500">Description:</span> {feature.description}</p>}
                {feature.source != null && feature.source !== '' && <p><span className="text-gray-500">Source:</span> {feature.source}</p>}
                {feature.transformation != null && feature.transformation !== '' && <p><span className="text-gray-500">Transformation:</span> {feature.transformation}</p>}
                {feature.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(feature.createdAt).toLocaleString()}</p>}
                <div className="flex gap-2 mt-4">
                  <Button type="button" onClick={() => setEditing(true)}>Edit</Button>
                  <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>Delete</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_TYPES.map((t) => (
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
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-destructive/30 bg-destructive/10">
                <p className="text-sm mb-2">Delete this feature?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !feature && (
          <p className="text-sm text-gray-500">Feature not found.</p>
        )}
        <p className="mt-4"><Link href="/admin/feature-engineering/features" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Features</Link></p>
      </div>
    </div>
  );
}
