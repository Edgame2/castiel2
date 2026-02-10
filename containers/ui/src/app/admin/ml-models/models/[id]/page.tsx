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
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const STATUSES = ['draft', 'training', 'evaluating', 'ready', 'deployed', 'archived', 'failed'] as const;

interface ModelItem {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  description?: string;
  modelPath?: string;
  limitations?: string[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function MLModelsModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [model, setModel] = useState<ModelItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [modelPath, setModelPath] = useState('');
  const [limitationsStr, setLimitationsStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchModel = useCallback(async () => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/ml/models/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) {
          setModel(null);
          return null;
        }
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: ModelItem | null) => {
        if (data) {
          setModel(data);
          setName(data.name ?? '');
          setDescription(data.description ?? '');
          setStatus(data.status ?? 'draft');
          setModelPath(data.modelPath ?? '');
          setLimitationsStr(Array.isArray(data.limitations) ? data.limitations.join('\n') : '');
        }
      })
      .catch((e) => {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
        setModel(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !model || saving) return;
    setSaveError(null);
    setSaving(true);
    const limitations = limitationsStr.split('\n').map((s) => s.trim()).filter(Boolean);
    fetch(`${apiBase}/api/v1/ml/models/${encodeURIComponent(model.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        status: status as (typeof STATUSES)[number],
        modelPath: modelPath.trim() || undefined,
        limitations: limitations.length ? limitations : undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || r.statusText)));
        setEditing(false);
        fetchModel();
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setSaveError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !model || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/ml/models/${encodeURIComponent(model.id)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (r.status === 204 || r.status === 404) {
          router.push('/admin/ml-models/models');
          return;
        }
        return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || 'Delete failed')));
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setSaveError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/ml-models">ML Models</Link><span>/</span>
          <Link href="/admin/ml-models/models">Models</Link><span>/</span>
          <span className="text-foreground">Model</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && model && (
          <>
            <h1 className="text-xl font-semibold mb-4">{model.name ?? model.id}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {model.id}</p>
                <p><span className="text-gray-500">Name:</span> {model.name ?? '—'}</p>
                <p><span className="text-gray-500">Type:</span> {model.type ?? '—'}</p>
                <p><span className="text-gray-500">Status:</span> {model.status ?? '—'}</p>
                {model.description && <p><span className="text-gray-500">Description:</span> {model.description}</p>}
                {model.modelPath && <p><span className="text-gray-500">Model path:</span> {model.modelPath}</p>}
                {model.version != null && <p><span className="text-gray-500">Version:</span> {model.version}</p>}
                {model.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(model.createdAt).toLocaleString()}</p>}
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelPath">Model path</Label>
                  <Input id="modelPath" type="text" value={modelPath} onChange={(e) => setModelPath(e.target.value)} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limitations">Limitations (one per line)</Label>
                  <Textarea id="limitations" value={limitationsStr} onChange={(e) => setLimitationsStr(e.target.value)} className="w-full" rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-destructive/30 bg-destructive/10">
                <p className="text-sm mb-2">Delete this model?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !model && <p className="text-sm text-gray-500">Model not found.</p>}
        <p className="mt-4"><Link href="/admin/ml-models/models" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Models</Link></p>
      </div>
    </div>
  );
}
