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
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    if (!getApiBaseUrl() || !riskId.trim() || !name.trim() || submitting) return;
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
    apiFetch('/api/v1/risk-catalog/risks', {
      method: 'POST',
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
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
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
          <div className="space-y-2">
            <Label htmlFor="riskId">Risk ID *</Label>
            <Input id="riskId" type="text" value={riskId} onChange={(e) => setRiskId(e.target.value)} className="w-full" required placeholder="e.g. custom_risk_1" />
          </div>
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
            <Select value={category} onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}>
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
            <Input id="sourceShardTypes" type="text" value={sourceShardTypesStr} onChange={(e) => setSourceShardTypesStr(e.target.value)} className="w-full" placeholder="e.g. opportunity, account" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="explainabilityTemplate">Explainability template</Label>
            <Input id="explainabilityTemplate" type="text" value={explainabilityTemplate} onChange={(e) => setExplainabilityTemplate(e.target.value)} className="w-full" placeholder="Optional" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !riskId.trim() || !name.trim()}>Create</Button>
            <Button asChild variant="outline">
              <Link href="/admin/risk-catalog">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/risk-catalog" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Risk Catalog</Link></p>
      </div>
    </div>
  );
}
