/**
 * Super Admin: CAIS (Context-Aware Intelligent System) — weights and model selection (Phase 9).
 * View/edit learned weights and model selection per tenant.
 * GET/PUT /api/v1/adaptive-learning/weights/:tenantId, GET/PUT /api/v1/adaptive-learning/model-selection/:tenantId.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

const WEIGHT_COMPONENTS = ['risk-evaluation', 'recommendations', 'forecasting', 'ml-prediction'] as const;
const MODEL_CONTEXTS = ['risk-scoring', 'forecasting', 'recommendations'] as const;

type WeightsMap = Record<string, number>;

export default function CAISAdminPage() {
  const [tenants, setTenants] = useState<{ id: string; name?: string }[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [weights, setWeights] = useState<WeightsMap>({});
  const [weightsComponent, setWeightsComponent] = useState<string>('risk-evaluation');
  const [modelSelection, setModelSelection] = useState<{ modelId: string; confidence: number }>({ modelId: '', confidence: 0.8 });
  const [modelContext, setModelContext] = useState<string>('risk-scoring');
  const [tenantConfig, setTenantConfig] = useState<{ outcomeSyncToCais: boolean; automaticLearningEnabled: boolean }>({
    outcomeSyncToCais: false,
    automaticLearningEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenants`, { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      setTenants(items);
      if (items.length > 0 && !tenantId) setTenantId(items[0].id ?? '');
    } catch {
      // ignore
    }
  }, [tenantId]);

  const fetchWeights = useCallback(async () => {
    if (!apiBaseUrl || !tenantId) return;
    setError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/adaptive-learning/weights/${encodeURIComponent(tenantId)}?component=${encodeURIComponent(weightsComponent)}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Weights: ${res.status}`);
      const data = await res.json();
      setWeights(typeof data === 'object' && data !== null ? data : {});
    } catch (e) {
      setWeights({});
      setError(e instanceof Error ? e.message : 'Failed to load weights');
    }
  }, [tenantId, weightsComponent]);

  const fetchModelSelection = useCallback(async () => {
    if (!apiBaseUrl || !tenantId) return;
    setError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/adaptive-learning/model-selection/${encodeURIComponent(tenantId)}?context=${encodeURIComponent(modelContext)}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Model selection: ${res.status}`);
      const data = await res.json();
      setModelSelection({
        modelId: typeof data?.modelId === 'string' ? data.modelId : '',
        confidence: typeof data?.confidence === 'number' ? data.confidence : 0.8,
      });
    } catch (e) {
      setModelSelection({ modelId: '', confidence: 0.8 });
      setError(e instanceof Error ? e.message : 'Failed to load model selection');
    }
  }, [tenantId, modelContext]);

  const fetchTenantConfig = useCallback(async () => {
    if (!apiBaseUrl || !tenantId) return;
    setError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/adaptive-learning/tenant-config/${encodeURIComponent(tenantId)}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Tenant config: ${res.status}`);
      const data = await res.json();
      setTenantConfig({
        outcomeSyncToCais: data.outcomeSyncToCais === true,
        automaticLearningEnabled: data.automaticLearningEnabled === true,
      });
    } catch (e) {
      setTenantConfig({ outcomeSyncToCais: false, automaticLearningEnabled: false });
      setError(e instanceof Error ? e.message : 'Failed to load tenant config');
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    fetchTenantConfig();
  }, [tenantId, fetchTenantConfig]);

  useEffect(() => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchTenants().finally(() => setLoading(false));
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!tenantId) return;
    setError(null);
    fetchWeights();
  }, [tenantId, weightsComponent, fetchWeights]);

  useEffect(() => {
    if (!tenantId) return;
    fetchModelSelection();
  }, [tenantId, modelContext, fetchModelSelection]);

  const handleSaveWeights = async () => {
    if (!apiBaseUrl || !tenantId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/adaptive-learning/weights/${encodeURIComponent(tenantId)}?component=${encodeURIComponent(weightsComponent)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(weights),
        }
      );
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setMessage('Weights saved');
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModelSelection = async () => {
    if (!apiBaseUrl || !tenantId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/adaptive-learning/model-selection/${encodeURIComponent(tenantId)}?context=${encodeURIComponent(modelContext)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelSelection),
        }
      );
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setMessage('Model selection saved');
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTenantConfigToggle = async (
    field: 'outcomeSyncToCais' | 'automaticLearningEnabled',
    value: boolean
  ) => {
    if (!apiBaseUrl || !tenantId) return;
    const next = { ...tenantConfig, [field]: value };
    setTenantConfig(next);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/adaptive-learning/tenant-config/${encodeURIComponent(tenantId)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcomeSyncToCais: next.outcomeSyncToCais, automaticLearningEnabled: next.automaticLearningEnabled }),
        }
      );
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    } catch (e) {
      setTenantConfig(tenantConfig);
      setMessage(e instanceof Error ? e.message : 'Failed to save');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const weightKeys = ['ruleBased', 'ml', 'ai', 'historical'];

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
        <span className="text-sm font-medium">CAIS</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">CAIS — Weights &amp; Model Selection</h1>
      {!apiBaseUrl && (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.
        </p>
      )}
      {apiBaseUrl && (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Tenant</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800"
            >
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.id}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
          {message && <p className="text-sm text-green-600 dark:text-green-400 mb-4">{message}</p>}
          {tenantId && (
            <>
              <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 mb-6 max-w-2xl">
                <h2 className="text-lg font-semibold mb-3">CAIS feature flags</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Per-tenant toggles for outcome sync and automatic learning.
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tenantConfig.outcomeSyncToCais}
                      onChange={(e) => handleTenantConfigToggle('outcomeSyncToCais', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">
                      Sync opportunity outcomes to CAIS (risk prediction vs won/lost)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tenantConfig.automaticLearningEnabled}
                      onChange={(e) => handleTenantConfigToggle('automaticLearningEnabled', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">
                      Automatically learn weights and model selection from outcomes
                    </span>
                  </label>
                </div>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
                <h2 className="text-lg font-semibold mb-3">Weights</h2>
                <div className="mb-3">
                  <label className="block text-sm mb-1">Component</label>
                  <select
                    value={weightsComponent}
                    onChange={(e) => setWeightsComponent(e.target.value)}
                    className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 w-full"
                  >
                    {WEIGHT_COMPONENTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {weightKeys.map((key) => (
                  <div key={key} className="flex items-center gap-2 mb-2">
                    <label className="text-sm w-24">{key}</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={weights[key] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWeights((prev) => ({ ...prev, [key]: v === '' ? undefined : Number(v) }));
                      }}
                      className="border rounded px-2 py-1 text-sm w-20 bg-white dark:bg-gray-800"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleSaveWeights}
                  disabled={saving}
                  className="mt-2 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save weights'}
                </button>
              </div>
              <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
                <h2 className="text-lg font-semibold mb-3">Model selection</h2>
                <div className="mb-3">
                  <label className="block text-sm mb-1">Context</label>
                  <select
                    value={modelContext}
                    onChange={(e) => setModelContext(e.target.value)}
                    className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 w-full"
                  >
                    {MODEL_CONTEXTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="block text-sm mb-1">Model ID</label>
                  <input
                    type="text"
                    value={modelSelection.modelId}
                    onChange={(e) => setModelSelection((prev) => ({ ...prev, modelId: e.target.value }))}
                    className="border rounded px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm mb-1">Confidence</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={modelSelection.confidence}
                    onChange={(e) =>
                      setModelSelection((prev) => ({ ...prev, confidence: Number(e.target.value) }))
                    }
                    className="border rounded px-3 py-2 text-sm w-24 bg-white dark:bg-gray-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveModelSelection}
                  disabled={saving}
                  className="mt-2 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save model selection'}
                </button>
              </div>
            </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
