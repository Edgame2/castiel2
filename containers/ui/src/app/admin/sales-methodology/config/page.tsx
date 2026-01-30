/**
 * Super Admin: Sales Methodology — Current tenant config (§3.1, §3.1.2 View/Edit Methodology)
 * Tabbed configuration: Basic info, Stages, Required fields, Risks, Integration.
 * GET/PUT /api/v1/sales-methodology via gateway (risk-analytics). Current tenant from session.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type MethodologyType = 'MEDDIC' | 'MEDDPICC' | 'Challenger' | 'Sandler' | 'SPIN' | 'Custom';

type ConfigTab = 'basic' | 'stages' | 'required' | 'risks' | 'integration';

interface IntegrationConfig {
  featureEngineering?: { enabled: boolean; features: string[] };
  riskDetection?: { enabled: boolean; detectNonCompliance: boolean };
  recommendations?: { enabled: boolean; suggestMissingSteps: boolean };
}

interface SalesMethodology {
  tenantId: string;
  methodologyType: MethodologyType;
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  stages: unknown[];
  requiredFields: unknown[];
  risks: unknown[];
  integrationConfig?: IntegrationConfig;
}

const defaultIntegrationConfig: IntegrationConfig = {
  featureEngineering: { enabled: true, features: [] },
  riskDetection: { enabled: true, detectNonCompliance: true },
  recommendations: { enabled: true, suggestMissingSteps: true },
};

const defaultMethodology: SalesMethodology = {
  tenantId: '',
  methodologyType: 'MEDDIC',
  name: '',
  displayName: '',
  description: '',
  isActive: true,
  isDefault: false,
  stages: [],
  requiredFields: [],
  risks: [],
  integrationConfig: defaultIntegrationConfig,
};

const TABS: { id: ConfigTab; label: string }[] = [
  { id: 'basic', label: 'Basic info' },
  { id: 'stages', label: 'Stages' },
  { id: 'required', label: 'Required fields' },
  { id: 'risks', label: 'Risks' },
  { id: 'integration', label: 'Integration' },
];

export default function SalesMethodologyConfigPage() {
  const [config, setConfig] = useState<SalesMethodology | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigTab>('basic');
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
        name: bodyConfig.name ?? undefined,
        displayName: bodyConfig.displayName ?? undefined,
        description: bodyConfig.description ?? undefined,
        isActive: bodyConfig.isActive ?? undefined,
        isDefault: bodyConfig.isDefault ?? undefined,
        integrationConfig: bodyConfig.integrationConfig ?? undefined,
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
          <div className="p-6">
            <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'basic' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-basic">
                <h2 className="text-lg font-semibold">Basic info (§3.1.2)</h2>
                <div>
                  <label htmlFor="methodologyType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Methodology type
                  </label>
                  <select
                    id="methodologyType"
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
                </div>
                <div>
                  <label htmlFor="methodologyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    id="methodologyName"
                    type="text"
                    value={formData.name ?? ''}
                    onChange={(e) => setConfig((c) => (c ? { ...c, name: e.target.value } : null))}
                    className="w-full max-w-md px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    placeholder="Optional display name"
                  />
                </div>
                <div>
                  <label htmlFor="methodologyDisplayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display name
                  </label>
                  <input
                    id="methodologyDisplayName"
                    type="text"
                    value={formData.displayName ?? ''}
                    onChange={(e) => setConfig((c) => (c ? { ...c, displayName: e.target.value } : null))}
                    className="w-full max-w-md px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    placeholder="Optional UI display name"
                  />
                </div>
                <div>
                  <label htmlFor="methodologyDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    id="methodologyDescription"
                    value={formData.description ?? ''}
                    onChange={(e) => setConfig((c) => (c ? { ...c, description: e.target.value } : null))}
                    className="w-full max-w-md px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 min-h-[80px]"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      onChange={(e) => setConfig((c) => (c ? { ...c, isActive: e.target.checked } : null))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault ?? false}
                      onChange={(e) => setConfig((c) => (c ? { ...c, isDefault: e.target.checked } : null))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Default methodology</span>
                  </label>
                </div>
              </section>
            )}

            {activeTab === 'stages' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-stages">
                <h2 className="text-lg font-semibold">Stages</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  JSON array of stages (stageId, stageName, displayName, order, requirements, exitCriteria, typicalDurationDays, expectedActivities).
                </p>
                <textarea
                  value={stagesJson}
                  onChange={(e) => setStagesJson(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border rounded font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                  spellCheck={false}
                />
              </section>
            )}

            {activeTab === 'required' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-required">
                <h2 className="text-lg font-semibold">Required fields</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  JSON array of required fields (fieldName, stages, dataType). Stages is an array of stage IDs that require this field.
                </p>
                <textarea
                  value={requiredFieldsJson}
                  onChange={(e) => setRequiredFieldsJson(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                  spellCheck={false}
                />
              </section>
            )}

            {activeTab === 'risks' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-risks">
                <h2 className="text-lg font-semibold">Risks</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  JSON array of methodology-specific risks (riskId, stage, description, severity). Link to risk catalog by riskId.
                </p>
                <textarea
                  value={risksJson}
                  onChange={(e) => setRisksJson(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
                  spellCheck={false}
                />
              </section>
            )}

            {activeTab === 'integration' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-integration">
                <h2 className="text-lg font-semibold">Integration (§3.1.2 – How to use in CAIS)</h2>
                {(() => {
                  const ic = formData.integrationConfig ?? defaultIntegrationConfig;
                  const fe = ic.featureEngineering ?? defaultIntegrationConfig.featureEngineering!;
                  const rd = ic.riskDetection ?? defaultIntegrationConfig.riskDetection!;
                  const rec = ic.recommendations ?? defaultIntegrationConfig.recommendations!;
                  return (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Feature engineering</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fe.enabled}
                            onChange={(e) =>
                              setConfig((c) =>
                                c
                                  ? {
                                      ...c,
                                      integrationConfig: {
                                        ...(c.integrationConfig ?? defaultIntegrationConfig),
                                        featureEngineering: { ...fe, enabled: e.target.checked },
                                      },
                                    }
                                  : null
                              )}
                            className="rounded"
                          />
                          <span className="text-sm">Enabled</span>
                        </label>
                        <div>
                          <label htmlFor="integrationFeatures" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Features (one per line)
                          </label>
                          <textarea
                            id="integrationFeatures"
                            value={(fe.features ?? []).join('\n')}
                            onChange={(e) =>
                              setConfig((c) =>
                                c
                                  ? {
                                      ...c,
                                      integrationConfig: {
                                        ...(c.integrationConfig ?? defaultIntegrationConfig),
                                        featureEngineering: {
                                          ...fe,
                                          features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                                        },
                                      },
                                    }
                                  : null
                              )}
                            className="w-full max-w-md px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm min-h-[80px]"
                            rows={4}
                            placeholder="feature1&#10;feature2"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk detection</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rd.enabled}
                            onChange={(e) =>
                              setConfig((c) =>
                                c
                                  ? {
                                      ...c,
                                      integrationConfig: {
                                        ...(c.integrationConfig ?? defaultIntegrationConfig),
                                        riskDetection: { ...rd, enabled: e.target.checked },
                                      },
                                    }
                                  : null
                              )}
                            className="rounded"
                          />
                          <span className="text-sm">Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rd.detectNonCompliance}
                            onChange={(e) =>
                              setConfig((c) =>
                                c
                                  ? {
                                      ...c,
                                      integrationConfig: {
                                        ...(c.integrationConfig ?? defaultIntegrationConfig),
                                        riskDetection: { ...rd, detectNonCompliance: e.target.checked },
                                      },
                                    }
                                  : null
                              )}
                            className="rounded"
                          />
                          <span className="text-sm">Detect non-compliance</span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recommendations</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rec.enabled}
                            onChange={(e) =>
                              setConfig((c) =>
                                c
                                  ? {
                                      ...c,
                                      integrationConfig: {
                                        ...(c.integrationConfig ?? defaultIntegrationConfig),
                                        recommendations: { ...rec, enabled: e.target.checked },
                                      },
                                    }
                                  : null
                              )}
                            className="rounded"
                          />
                          <span className="text-sm">Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rec.suggestMissingSteps}
                            onChange={(e) =>
                              setConfig((c) =>
                                c
                                  ? {
                                      ...c,
                                      integrationConfig: {
                                        ...(c.integrationConfig ?? defaultIntegrationConfig),
                                        recommendations: { ...rec, suggestMissingSteps: e.target.checked },
                                      },
                                    }
                                  : null
                              )}
                            className="rounded"
                          />
                          <span className="text-sm">Suggest missing steps</span>
                        </label>
                      </div>
                    </>
                  );
                })()}
              </section>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
