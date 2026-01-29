/**
 * Super Admin: Sales Methodology — MEDDIC mapper (§3.1.4)
 * GET/PUT /api/v1/sales-methodology via gateway (risk-analytics). meddic field maps opportunity fields to MEDDIC components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const MEDDIC_KEYS = [
  { key: 'metrics', label: 'Metrics' },
  { key: 'economicBuyer', label: 'Economic buyer' },
  { key: 'decisionCriteria', label: 'Decision criteria' },
  { key: 'decisionProcess', label: 'Decision process' },
  { key: 'identifyPain', label: 'Identify pain' },
  { key: 'champion', label: 'Champion' },
  { key: 'competition', label: 'Competition' },
] as const;

type MeddicKey = (typeof MEDDIC_KEYS)[number]['key'];

interface MeddicComponentMapping {
  fields: string[];
  required: boolean;
  validationRule?: string;
}

type MeddicMapping = Partial<Record<MeddicKey, MeddicComponentMapping>>;

const emptyComponent = (): MeddicComponentMapping => ({
  fields: [],
  required: false,
});

export default function SalesMethodologyMeddicPage() {
  const [config, setConfig] = useState<{ methodologyType?: string; stages?: unknown[]; requiredFields?: unknown[]; risks?: unknown[]; meddic?: MeddicMapping } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [meddic, setMeddic] = useState<MeddicMapping>({});

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/sales-methodology`, { credentials: 'include' });
      if (res.status === 404) {
        setConfig(null);
        setMeddic({});
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setConfig(json);
      setMeddic(json.meddic ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfig(null);
      setMeddic({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.title = 'MEDDIC mapper | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const updateComponent = (key: MeddicKey, upd: Partial<MeddicComponentMapping>) => {
    setMeddic((m) => ({
      ...m,
      [key]: { ...emptyComponent(), ...m[key], ...upd },
    }));
  };

  const setFieldsFor = (key: MeddicKey, value: string) => {
    const fields = value.split(',').map((s) => s.trim()).filter(Boolean);
    updateComponent(key, { fields });
  };

  const getFieldsStr = (key: MeddicKey) => (meddic[key]?.fields ?? []).join(', ');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const body = {
        methodologyType: config?.methodologyType ?? 'MEDDIC',
        stages: config?.stages ?? [],
        requiredFields: config?.requiredFields ?? [],
        risks: config?.risks ?? [],
        meddic: meddic,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/sales-methodology`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      setSaveMessage('Saved.');
      await fetchConfig();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

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
        <span className="text-sm font-medium">MEDDIC mapper</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">MEDDIC mapper</h1>
      <p className="text-muted-foreground mb-4">
        Map opportunity fields to MEDDIC components (Metrics, Economic buyer, Decision criteria, etc.). §3.1.4.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/sales-methodology"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/sales-methodology/config"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Current tenant config
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          MEDDIC mapper
        </span>
      </nav>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && apiBaseUrl && (
        <form onSubmit={handleSave} className="space-y-6">
          {saveMessage && (
            <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-900/20 text-sm text-green-800 dark:text-green-200">
              {saveMessage}
            </div>
          )}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-6">
            <p className="text-sm text-gray-500">
              Fields: comma-separated opportunity field names (e.g. Amount, StageName, CloseDate). Required = component must be filled for scoring.
            </p>
            {MEDDIC_KEYS.map(({ key, label }) => (
              <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</h3>
                <div className="grid gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fields (comma-separated)</label>
                    <input
                      type="text"
                      value={getFieldsStr(key)}
                      onChange={(e) => setFieldsFor(key, e.target.value)}
                      placeholder="e.g. Amount, StageName, CloseDate"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`${key}-required`}
                      checked={meddic[key]?.required ?? false}
                      onChange={(e) => updateComponent(key, { required: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor={`${key}-required`} className="text-sm text-gray-700 dark:text-gray-300">
                      Required for MEDDIC score
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Validation rule (optional)</label>
                    <input
                      type="text"
                      value={meddic[key]?.validationRule ?? ''}
                      onChange={(e) => updateComponent(key, { validationRule: e.target.value || undefined })}
                      placeholder="e.g. non-empty"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              Save MEDDIC mapping
            </button>
            <button
              type="button"
              onClick={fetchConfig}
              className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
            >
              Refresh
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
