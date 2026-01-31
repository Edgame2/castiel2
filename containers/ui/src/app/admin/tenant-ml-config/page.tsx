/**
 * Super Admin: Tenant ML Config (W11)
 * GET/PUT /api/v1/tenant-ml-config via gateway (risk-analytics). Current tenant from session.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type RiskToleranceLevel = 'conservative' | 'balanced' | 'aggressive';

interface RiskTolerance {
  overallTolerance: RiskToleranceLevel;
  categoryTolerances: Record<string, number>;
  autoEscalationThreshold: number;
}

interface DecisionPreferences {
  autoMarkHot: boolean;
  autoCreateTasks: boolean;
  requireApprovalForActions: boolean;
}

interface ModelPreferences {
  preferIndustryModels: boolean;
  abTestingEnabled: boolean;
  minConfidenceThreshold: number;
}

interface CustomFeature {
  featureName: string;
  dataSource: string;
  transformation: string;
  enabled: boolean;
}

interface TenantMLConfig {
  tenantId: string;
  riskTolerance: RiskTolerance;
  decisionPreferences: DecisionPreferences;
  modelPreferences: ModelPreferences;
  customFeatures: CustomFeature[];
}

const defaultRiskTolerance: RiskTolerance = {
  overallTolerance: 'balanced',
  categoryTolerances: {},
  autoEscalationThreshold: 0.8,
};

const defaultDecisionPreferences: DecisionPreferences = {
  autoMarkHot: false,
  autoCreateTasks: false,
  requireApprovalForActions: true,
};

const defaultModelPreferences: ModelPreferences = {
  preferIndustryModels: true,
  abTestingEnabled: false,
  minConfidenceThreshold: 0.7,
};

export default function TenantMLConfigPage() {
  const [config, setConfig] = useState<TenantMLConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Tenant ML Config | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant-ml-config`, { credentials: 'include' });
      if (res.status === 404) {
        setConfig({
          tenantId: '',
          riskTolerance: defaultRiskTolerance,
          decisionPreferences: defaultDecisionPreferences,
          modelPreferences: defaultModelPreferences,
          customFeatures: [],
        });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setConfig(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    const bodyConfig = config ?? formData;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const body = {
        riskTolerance: bodyConfig.riskTolerance,
        decisionPreferences: bodyConfig.decisionPreferences,
        modelPreferences: bodyConfig.modelPreferences,
        customFeatures: bodyConfig.customFeatures,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant-ml-config`, {
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

  const formData = config ?? {
    tenantId: '',
    riskTolerance: defaultRiskTolerance,
    decisionPreferences: defaultDecisionPreferences,
    modelPreferences: defaultModelPreferences,
    customFeatures: [] as CustomFeature[],
  };

  const updateRiskTolerance = (patch: Partial<RiskTolerance>) => {
    setConfig((c) => {
      const base = c ?? formData;
      return { ...base, riskTolerance: { ...base.riskTolerance, ...patch } };
    });
  };
  const updateDecisionPreferences = (patch: Partial<DecisionPreferences>) => {
    setConfig((c) => {
      const base = c ?? formData;
      return { ...base, decisionPreferences: { ...base.decisionPreferences, ...patch } };
    });
  };
  const updateModelPreferences = (patch: Partial<ModelPreferences>) => {
    setConfig((c) => {
      const base = c ?? formData;
      return { ...base, modelPreferences: { ...base.modelPreferences, ...patch } };
    });
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
        <span className="text-sm font-medium">Tenant ML Config</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Tenant ML Config</h1>
      <p className="text-muted-foreground mb-6">
        Risk tolerance, decision preferences, model preferences (current tenant). Via risk-analytics.
      </p>

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
              <h2 className="text-lg font-semibold mb-3">Risk tolerance</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Overall tolerance</label>
                  <select
                    value={formData.riskTolerance.overallTolerance}
                    onChange={(e) => updateRiskTolerance({ overallTolerance: e.target.value as RiskToleranceLevel })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Auto-escalation threshold (HITL risk min)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.riskTolerance.autoEscalationThreshold}
                    onChange={(e) => updateRiskTolerance({ autoEscalationThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Decision preferences</h2>
              <div className="space-y-2">
                {(['autoMarkHot', 'autoCreateTasks', 'requireApprovalForActions'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.decisionPreferences[key]}
                      onChange={(e) => updateDecisionPreferences({ [key]: e.target.checked })}
                      className="rounded border"
                    />
                    <span className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Model preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="preferIndustryModels"
                    checked={formData.modelPreferences.preferIndustryModels}
                    onChange={(e) => updateModelPreferences({ preferIndustryModels: e.target.checked })}
                    className="rounded border"
                  />
                  <label htmlFor="preferIndustryModels" className="text-sm">Prefer industry models</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="abTestingEnabled"
                    checked={formData.modelPreferences.abTestingEnabled}
                    onChange={(e) => updateModelPreferences({ abTestingEnabled: e.target.checked })}
                    className="rounded border"
                  />
                  <label htmlFor="abTestingEnabled" className="text-sm">A/B testing enabled</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min confidence threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.modelPreferences.minConfidenceThreshold}
                    onChange={(e) => updateModelPreferences({ minConfidenceThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>
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
