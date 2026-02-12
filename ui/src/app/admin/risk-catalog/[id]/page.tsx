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
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

const CATEGORIES = ['Commercial', 'Technical', 'Legal', 'Financial', 'Competitive', 'Operational'] as const;

interface RiskCatalog {
  id: string;
  tenantId: string;
  catalogType: string;
  industryId?: string;
  riskId: string;
  name: string;
  description: string;
  category: string;
  defaultPonderation: number;
  sourceShardTypes: string[];
  isActive: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  explainabilityTemplate?: string;
}

export default function RiskCatalogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [risk, setRisk] = useState<RiskCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Commercial');
  const [defaultPonderation, setDefaultPonderation] = useState(0.5);
  const [sourceShardTypesStr, setSourceShardTypesStr] = useState('');
  const [explainabilityTemplate, setExplainabilityTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRisk = useCallback(async () => {
    if (!getApiBaseUrl() || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/risk-catalog/risks/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 404) {
          setRisk(null);
          return null;
        }
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: RiskCatalog | null) => {
        if (data) {
          setRisk(data);
          setName(data.name ?? '');
          setDescription(data.description ?? '');
          setCategory(data.category ?? 'Commercial');
          setDefaultPonderation(data.defaultPonderation ?? 0.5);
          setSourceShardTypesStr(Array.isArray(data.sourceShardTypes) ? data.sourceShardTypes.join(', ') : '');
          setExplainabilityTemplate(data.explainabilityTemplate ?? '');
        }
      })
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setRisk(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiBaseUrl() || !risk || saving) return;
    setSaveError(null);
    setSaving(true);
    const sourceShardTypes = sourceShardTypesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const body = {
      name: name.trim(),
      description: description.trim(),
      category: category as (typeof CATEGORIES)[number],
      defaultPonderation: Number(defaultPonderation) || 0.5,
      sourceShardTypes: sourceShardTypes.length ? sourceShardTypes : undefined,
      explainabilityTemplate: explainabilityTemplate.trim() || undefined,
    };
    apiFetch(`/api/v1/risk-catalog/risks/${encodeURIComponent(risk.riskId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || r.statusText)));
        setEditing(false);
        fetchRisk();
      })
      .catch(() => setSaveError(GENERIC_ERROR_MESSAGE))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!getApiBaseUrl() || !risk || deleting) return;
    setDeleting(true);
    apiFetch(`/api/v1/risk-catalog/risks/${encodeURIComponent(risk.riskId)}`, { method: 'DELETE' })
      .then((r) => {
        if (r.status === 204 || r.status === 404) {
          router.push('/admin/risk-catalog');
          return;
        }
        return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || 'Delete failed')));
      })
      .catch(() => setSaveError(GENERIC_ERROR_MESSAGE))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/risk-catalog">Risk Catalog</Link><span>/</span>
          <span className="text-foreground">Risk</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && risk && (
          <>
            <h1 className="text-xl font-semibold mb-4">{risk.name}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">Risk ID:</span> {risk.riskId}</p>
                <p><span className="text-gray-500">Name:</span> {risk.name}</p>
                {risk.description && <p><span className="text-gray-500">Description:</span> {risk.description}</p>}
                <p><span className="text-gray-500">Category:</span> {risk.category}</p>
                <p><span className="text-gray-500">Default ponderation:</span> {risk.defaultPonderation}</p>
                {risk.sourceShardTypes?.length ? <p><span className="text-gray-500">Source shard types:</span> {risk.sourceShardTypes.join(', ')}</p> : null}
                <p><span className="text-gray-500">Active:</span> {risk.isActive ? 'Yes' : 'No'}</p>
                {risk.catalogType && <p><span className="text-gray-500">Catalog type:</span> {risk.catalogType}</p>}
                {risk.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(risk.createdAt).toLocaleString()}</p>}
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
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultPonderation">Default ponderation (0–1)</Label>
                  <Input id="defaultPonderation" type="number" min={0} max={1} step={0.1} value={defaultPonderation} onChange={(e) => setDefaultPonderation(Number(e.target.value))} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceShardTypes">Source shard types (comma-separated)</Label>
                  <Input id="sourceShardTypes" type="text" value={sourceShardTypesStr} onChange={(e) => setSourceShardTypesStr(e.target.value)} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="explainabilityTemplate">Explainability template</Label>
                  <Input id="explainabilityTemplate" type="text" value={explainabilityTemplate} onChange={(e) => setExplainabilityTemplate(e.target.value)} className="w-full" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-destructive/30 bg-destructive/10">
                <p className="text-sm mb-2">Delete this risk? Only tenant-specific risks can be deleted.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !risk && (
          <p className="text-sm text-gray-500">Risk not found.</p>
        )}
        <p className="mt-4"><Link href="/admin/risk-catalog" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Risk Catalog</Link></p>
      </div>
    </div>
  );
}
