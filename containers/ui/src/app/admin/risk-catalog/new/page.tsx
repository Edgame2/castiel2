'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

const CATEGORIES = ['Commercial', 'Technical', 'Legal', 'Financial', 'Competitive', 'Operational'] as const;

const DEFAULT_DETECTION_RULES = { type: 'attribute' as const, conditions: [], confidenceThreshold: 0.5 };

export default function RiskCatalogNewPage() {
  const router = useRouter();
  const [riskId, setRiskId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Commercial');
  const [defaultPonderation, setDefaultPonderation] = useState(0.5);
  const [sourceShardTypesStr, setSourceShardTypesStr] = useState('opportunity');
  const [explainabilityTemplate, setExplainabilityTemplate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !riskId.trim() || !name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    const sourceShardTypes = sourceShardTypesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const body = {
      riskId: riskId.trim(),
      name: name.trim(),
      description: description.trim(),
      category,
      defaultPonderation: Number(defaultPonderation) || 0.5,
      sourceShardTypes: sourceShardTypes.length ? sourceShardTypes : ['opportunity'],
      detectionRules: DEFAULT_DETECTION_RULES,
      explainabilityTemplate: explainabilityTemplate.trim() || 'Risk identified.',
      catalogType: 'tenant',
    };
    fetch(`${apiBase}/api/v1/risk-catalog/risks`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(new Error((j?.error?.message as string) || `HTTP ${r.status}`)));
        return r.json();
      })
      .then((saved: { riskId?: string }) => {
        const id = saved?.riskId ?? riskId.trim();
        router.push(`/admin/risk-catalog/${encodeURIComponent(id)}`);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/risk-catalog">Risk Catalog</Link><span>/</span>
          <span className="text-foreground">New risk</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create risk</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <label htmlFor="riskId" className="block text-sm font-medium mb-1">Risk ID *</label>
            <input id="riskId" type="text" value={riskId} onChange={(e) => setRiskId(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required placeholder="e.g. custom_risk_1" />
          </div>
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
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
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
            <input id="sourceShardTypes" type="text" value={sourceShardTypesStr} onChange={(e) => setSourceShardTypesStr(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" placeholder="e.g. opportunity, account" />
          </div>
          <div>
            <label htmlFor="explainabilityTemplate" className="block text-sm font-medium mb-1">Explainability template</label>
            <input id="explainabilityTemplate" type="text" value={explainabilityTemplate} onChange={(e) => setExplainabilityTemplate(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" placeholder="Optional" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !riskId.trim() || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/risk-catalog" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/risk-catalog" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Risk Catalog</Link></p>
      </div>
    </div>
  );
}
