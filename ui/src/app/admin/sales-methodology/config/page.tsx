/**
 * Super Admin: Sales Methodology — Current tenant config (§3.1, §3.1.2 View/Edit Methodology)
 * Tabbed configuration: Basic info, Stages, Required fields, Risks, Integration.
 * GET/PUT /api/v1/sales-methodology via gateway (risk-analytics). Current tenant from session.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/sales-methodology');
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
      setError(GENERIC_ERROR_MESSAGE);
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
    if (!getApiBaseUrl()) return;
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
      const res = await apiFetch('/api/v1/sales-methodology', {
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
      setError(GENERIC_ERROR_MESSAGE);
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

      {getApiBaseUrl() && (
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setLoading(true); fetchConfig().finally(() => setLoading(false)); }}
            disabled={loading}
            title="Refetch methodology config"
          >
            Refresh
          </Button>
        </div>
      )}

      {!getApiBaseUrl() && (
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

      {!loading && getApiBaseUrl() && (
        <form onSubmit={handleSave} className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="p-6">
            <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-t border-b-2 -mb-px ${
                    activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>

            {activeTab === 'basic' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-basic">
                <h2 className="text-lg font-semibold">Basic info (§3.1.2)</h2>
                <div className="space-y-2">
                  <Label htmlFor="methodologyType">Methodology type</Label>
                  <Select
                    value={formData.methodologyType}
                    onValueChange={(v) => setConfig((c) => (c ? { ...c, methodologyType: v as MethodologyType } : null))}
                  >
                    <SelectTrigger id="methodologyType" className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEDDIC">MEDDIC</SelectItem>
                      <SelectItem value="MEDDPICC">MEDDPICC</SelectItem>
                      <SelectItem value="Challenger">Challenger</SelectItem>
                      <SelectItem value="Sandler">Sandler</SelectItem>
                      <SelectItem value="SPIN">SPIN</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="methodologyName">Name</Label>
                  <Input
                    id="methodologyName"
                    value={formData.name ?? ''}
                    onChange={(e) => setConfig((c) => (c ? { ...c, name: e.target.value } : null))}
                    className="max-w-md"
                    placeholder="Optional display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="methodologyDisplayName">Display name</Label>
                  <Input
                    id="methodologyDisplayName"
                    value={formData.displayName ?? ''}
                    onChange={(e) => setConfig((c) => (c ? { ...c, displayName: e.target.value } : null))}
                    className="max-w-md"
                    placeholder="Optional UI display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="methodologyDescription">Description</Label>
                  <Textarea
                    id="methodologyDescription"
                    value={formData.description ?? ''}
                    onChange={(e) => setConfig((c) => (c ? { ...c, description: e.target.value } : null))}
                    className="max-w-md min-h-[80px]"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="methodologyActive"
                      checked={formData.isActive ?? true}
                      onCheckedChange={(c) => setConfig((cfg) => (cfg ? { ...cfg, isActive: !!c } : null))}
                    />
                    <Label htmlFor="methodologyActive" className="text-sm font-medium cursor-pointer">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="methodologyDefault"
                      checked={formData.isDefault ?? false}
                      onCheckedChange={(c) => setConfig((cfg) => (cfg ? { ...cfg, isDefault: !!c } : null))}
                    />
                    <Label htmlFor="methodologyDefault" className="text-sm font-medium cursor-pointer">Default methodology</Label>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'stages' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-stages">
                <h2 className="text-lg font-semibold">Stages</h2>
                <p className="text-sm text-muted-foreground">
                  JSON array of stages (stageId, stageName, displayName, order, requirements, exitCriteria, typicalDurationDays, expectedActivities).
                </p>
                <Textarea
                  value={stagesJson}
                  onChange={(e) => setStagesJson(e.target.value)}
                  rows={12}
                  className="w-full font-mono text-sm"
                  spellCheck={false}
                />
              </section>
            )}

            {activeTab === 'required' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-required">
                <h2 className="text-lg font-semibold">Required fields</h2>
                <p className="text-sm text-muted-foreground">
                  JSON array of required fields (fieldName, stages, dataType). Stages is an array of stage IDs that require this field.
                </p>
                <Textarea
                  value={requiredFieldsJson}
                  onChange={(e) => setRequiredFieldsJson(e.target.value)}
                  rows={8}
                  className="w-full font-mono text-sm"
                  spellCheck={false}
                />
              </section>
            )}

            {activeTab === 'risks' && (
              <section className="space-y-4" role="tabpanel" aria-labelledby="tab-risks">
                <h2 className="text-lg font-semibold">Risks</h2>
                <p className="text-sm text-muted-foreground">
                  JSON array of methodology-specific risks (riskId, stage, description, severity). Link to risk catalog by riskId.
                </p>
                <Textarea
                  value={risksJson}
                  onChange={(e) => setRisksJson(e.target.value)}
                  rows={8}
                  className="w-full font-mono text-sm"
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
                        <h3 className="text-sm font-medium">Feature engineering</h3>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="fe-enabled"
                            checked={fe.enabled}
                            onCheckedChange={(c) =>
                              setConfig((cfg) =>
                                cfg
                                  ? {
                                      ...cfg,
                                      integrationConfig: {
                                        ...(cfg.integrationConfig ?? defaultIntegrationConfig),
                                        featureEngineering: { ...fe, enabled: !!c },
                                      },
                                    }
                                  : null
                              )}
                          />
                          <Label htmlFor="fe-enabled" className="text-sm cursor-pointer">Enabled</Label>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="integrationFeatures" className="text-sm text-muted-foreground">Features (one per line)</Label>
                          <Textarea
                            id="integrationFeatures"
                            value={(fe.features ?? []).join('\n')}
                            onChange={(e) =>
                              setConfig((cfg) =>
                                cfg
                                  ? {
                                      ...cfg,
                                      integrationConfig: {
                                        ...(cfg.integrationConfig ?? defaultIntegrationConfig),
                                        featureEngineering: {
                                          ...fe,
                                          features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                                        },
                                      },
                                    }
                                  : null
                              )}
                            className="max-w-md text-sm min-h-[80px]"
                            rows={4}
                            placeholder="feature1&#10;feature2"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Risk detection</h3>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="rd-enabled"
                            checked={rd.enabled}
                            onCheckedChange={(c) =>
                              setConfig((cfg) =>
                                cfg
                                  ? {
                                      ...cfg,
                                      integrationConfig: {
                                        ...(cfg.integrationConfig ?? defaultIntegrationConfig),
                                        riskDetection: { ...rd, enabled: !!c },
                                      },
                                    }
                                  : null
                              )}
                          />
                          <Label htmlFor="rd-enabled" className="text-sm cursor-pointer">Enabled</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="rd-detect"
                            checked={rd.detectNonCompliance}
                            onCheckedChange={(c) =>
                              setConfig((cfg) =>
                                cfg
                                  ? {
                                      ...cfg,
                                      integrationConfig: {
                                        ...(cfg.integrationConfig ?? defaultIntegrationConfig),
                                        riskDetection: { ...rd, detectNonCompliance: !!c },
                                      },
                                    }
                                  : null
                              )}
                          />
                          <Label htmlFor="rd-detect" className="text-sm cursor-pointer">Detect non-compliance</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Recommendations</h3>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="rec-enabled"
                            checked={rec.enabled}
                            onCheckedChange={(c) =>
                              setConfig((cfg) =>
                                cfg
                                  ? {
                                      ...cfg,
                                      integrationConfig: {
                                        ...(cfg.integrationConfig ?? defaultIntegrationConfig),
                                        recommendations: { ...rec, enabled: !!c },
                                      },
                                    }
                                  : null
                              )}
                          />
                          <Label htmlFor="rec-enabled" className="text-sm cursor-pointer">Enabled</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="rec-suggest"
                            checked={rec.suggestMissingSteps}
                            onCheckedChange={(c) =>
                              setConfig((cfg) =>
                                cfg
                                  ? {
                                      ...cfg,
                                      integrationConfig: {
                                        ...(cfg.integrationConfig ?? defaultIntegrationConfig),
                                        recommendations: { ...rec, suggestMissingSteps: !!c },
                                      },
                                    }
                                  : null
                              )}
                          />
                          <Label htmlFor="rec-suggest" className="text-sm cursor-pointer">Suggest missing steps</Label>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </section>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
