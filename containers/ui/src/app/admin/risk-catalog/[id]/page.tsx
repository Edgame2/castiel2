'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

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
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/risk-catalog/risks/${encodeURIComponent(id)}`, { credentials: 'include' })
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
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setRisk(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !risk || saving) return;
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
    fetch(`${apiBase}/api/v1/risk-catalog/risks/${encodeURIComponent(risk.riskId)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || r.statusText)));
        setEditing(false);
        fetchRisk();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !risk || deleting) return;
    setDeleting(true);
    fetch(`${apiBase}/api/v1/risk-catalog/risks/${encodeURIComponent(risk.riskId)}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (r.status === 204 || r.status === 404) {
          router.push('/admin/risk-catalog');
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
                  <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" rows={2} />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-1">Category</label>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="defaultPonderation" className="block text-sm font-medium mb-1">Default ponderation (0–1)</label>
                  <input id="defaultPonderation" type="number" min={0} max={1} step={0.1} value={defaultPonderation} onChange={(e) => setDefaultPonderation(Number(e.target.value))} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="sourceShardTypes" className="block text-sm font-medium mb-1">Source shard types (comma-separated)</label>
                  <input id="sourceShardTypes" type="text" value={sourceShardTypesStr} onChange={(e) => setSourceShardTypesStr(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="explainabilityTemplate" className="block text-sm font-medium mb-1">Explainability template</label>
                  <input id="explainabilityTemplate" type="text" value={explainabilityTemplate} onChange={(e) => setExplainabilityTemplate(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this risk? Only tenant-specific risks can be deleted.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
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
