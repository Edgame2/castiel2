/**
 * Super Admin: Sales Methodology — Current tenant config (§3.1)
 * GET/PUT /api/v1/sales-methodology via gateway (risk-analytics). Current tenant from session.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type MethodologyType = 'MEDDIC' | 'MEDDPICC' | 'Challenger' | 'Sandler' | 'SPIN' | 'Custom';

interface SalesMethodology {
  tenantId: string;
  methodologyType: MethodologyType;
  stages: unknown[];
  requiredFields: unknown[];
  risks: unknown[];
}

const defaultMethodology: SalesMethodology = {
  tenantId: '',
  methodologyType: 'MEDDIC',
  stages: [],
  requiredFields: [],
  risks: [],
};

export default function SalesMethodologyConfigPage() {
  const [config, setConfig] = useState<SalesMethodology | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [stagesJson, setStagesJson] = useState('[]');
  const [requiredFieldsJson, setRequiredFieldsJson] = useState('[]');
  const [risksJson, setRisksJson] = useState('[]');

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/sales-methodology`, { credentials: 'include' });
      if (res.status === 404) {
        setConfig(defaultMethodology);
        setStagesJson('[]');
        setRequiredFieldsJson('[]');
        setRisksJson('[]');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setConfig(json);
      setStagesJson(JSON.stringify(json.stages ?? [], null, 2));
      setRequiredFieldsJson(JSON.stringify(json.requiredFields ?? [], null, 2));
      setRisksJson(JSON.stringify(json.risks ?? [], null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfig(defaultMethodology);
      setStagesJson('[]');
      setRequiredFieldsJson('[]');
      setRisksJson('[]');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.title = 'Current tenant config | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    let stages: unknown[];
    let requiredFields: unknown[];
    let risks: unknown[];
    try {
      stages = JSON.parse(stagesJson);
      requiredFields = JSON.parse(requiredFieldsJson);
      risks = JSON.parse(risksJson);
    } catch {
      setError('Invalid JSON in stages, required fields, or risks');
      return;
    }
    if (!Array.isArray(stages) || !Array.isArray(requiredFields) || !Array.isArray(risks)) {
      setError('Stages, required fields, and risks must be JSON arrays');
      return;
    }
    const bodyConfig = config ?? defaultMethodology;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const body = {
        methodologyType: bodyConfig.methodologyType,
        stages,
        requiredFields,
        risks,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/sales-methodology`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      setSaveMessage('Saved.');
      await fetchConfig();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const formData = config ?? defaultMethodology;

  const subNav = (
    <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
      <Link
        href="/admin/sales-methodology"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Overview
      </Link>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
        Current tenant config
      </span>
      <Link
        href="/admin/sales-methodology/meddic"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        MEDDIC mapper
      </Link>
    </nav>
  );

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
        <Link href="/admin/sales-methodology" className="text-sm font-medium hover:underline">
          Sales Methodology
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Current tenant config</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Current tenant config</h1>
      <p className="text-muted-foreground mb-4">
        Methodology type, stages, requirements, risks (current tenant). Via risk-analytics.
      </p>
      {subNav}

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
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

      {saveMessage && (
        <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">{saveMessage}</p>
        </div>
      )}

      {!loading && apiBaseUrl && (
        <form onSubmit={handleSave} className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">Methodology type</h2>
              <select
                value={formData.methodologyType}
                onChange={(e) => setConfig((c) => (c ? { ...c, methodologyType: e.target.value as MethodologyType } : null))}
                className="w-full max-w-xs px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="MEDDIC">MEDDIC</option>
                <option value="MEDDPICC">MEDDPICC</option>
                <option value="Challenger">Challenger</option>
                <option value="Sandler">Sandler</option>
                <option value="SPIN">SPIN</option>
                <option value="Custom">Custom</option>
              </select>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Stages (JSON array)</h2>
              <textarea
                value={stagesJson}
                onChange={(e) => setStagesJson(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border rounded font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                spellCheck={false}
              />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Required fields (JSON array)</h2>
              <textarea
                value={requiredFieldsJson}
                onChange={(e) => setRequiredFieldsJson(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                spellCheck={false}
              />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Risks (JSON array)</h2>
              <textarea
                value={risksJson}
                onChange={(e) => setRisksJson(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                spellCheck={false}
              />
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
