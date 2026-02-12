/**
 * Super Admin: Risk Catalog – Tenant Catalog View (W11)
 * GET /api/v1/risk-catalog/tenant-catalog via gateway (risk-catalog). Current tenant from session.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface TenantCatalogView {
  tenantRiskCategories: string[];
  categoryDefinitions: Record<string, { name: string; description?: string; defaultPonderation?: number }>;
  riskTemplates: Array<{ id: string; riskId: string; name: string; category: string; industryId?: string; applicableStages: string[] }>;
  industrySpecificRisks: string[];
  methodologyRisks: string[];
}

export default function RiskCatalogPage() {
  const [view, setView] = useState<TenantCatalogView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');

  useEffect(() => {
    document.title = 'Risk Catalog | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchCatalog = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (industry) params.set('industry', industry);
      if (stage) params.set('stage', stage);
      const qs = params.toString();
      const url = `${apiBaseUrl}/api/v1/risk-catalog/tenant-catalog${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setView(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [industry, stage]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Admin
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Risk Catalog</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Risk Catalog – Tenant Catalog View</h1>
      <p className="text-muted-foreground mb-6">
        Categories, templates, industry and methodology risks for the current tenant. Via risk-catalog.
      </p>
      <div className="mb-4">
        <Button asChild>
          <Link href="/admin/risk-catalog/new">New risk</Link>
        </Button>
      </div>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Industry (filter)</Label>
            <Input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Optional"
              className="w-48"
            />
          </div>
          <div className="space-y-2">
            <Label>Stage (filter)</Label>
            <Input
              type="text"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="Optional"
              className="w-48"
            />
          </div>
          <Button type="button" onClick={fetchCatalog}>
            Refresh
          </Button>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && view && (
        <div className="space-y-6">
          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Tenant risk categories</h2>
            {view.tenantRiskCategories.length === 0 ? (
              <p className="text-sm text-gray-500">None</p>
            ) : (
              <ul className="list-disc list-inside text-sm">
                {view.tenantRiskCategories.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Category definitions</h2>
            {Object.keys(view.categoryDefinitions).length === 0 ? (
              <p className="text-sm text-gray-500">None</p>
            ) : (
              <dl className="space-y-2 text-sm">
                {Object.entries(view.categoryDefinitions).map(([id, def]) => (
                  <div key={id} className="flex gap-2">
                    <dt className="font-medium">{id}:</dt>
                    <dd>{def.name}{def.description ? ` – ${def.description}` : ''}{def.defaultPonderation != null ? ` (ponderation: ${def.defaultPonderation})` : ''}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Risk templates</h2>
            {view.riskTemplates.length === 0 ? (
              <p className="text-sm text-gray-500">None</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Category</th>
                      <th className="text-left py-2">Applicable stages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.riskTemplates.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="py-2">
                          <Link href={`/admin/risk-catalog/${encodeURIComponent(t.riskId)}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {t.name}
                          </Link>
                        </td>
                        <td className="py-2">{t.category}</td>
                        <td className="py-2">{Array.isArray(t.applicableStages) ? t.applicableStages.join(', ') : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Industry-specific risks</h2>
            {view.industrySpecificRisks.length === 0 ? (
              <p className="text-sm text-gray-500">None</p>
            ) : (
              <ul className="list-disc list-inside text-sm">
                {view.industrySpecificRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-3">Methodology risks</h2>
            {view.methodologyRisks.length === 0 ? (
              <p className="text-sm text-gray-500">None</p>
            ) : (
              <ul className="list-disc list-inside text-sm">
                {view.methodologyRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
