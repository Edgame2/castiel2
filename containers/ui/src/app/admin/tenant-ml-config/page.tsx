/**
 * Super Admin: Tenant ML Config (W11)
 * GET/PUT /api/v1/tenant-ml-config via gateway (risk-analytics). Current tenant from session.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
                <div className="space-y-2">
                  <Label>Overall tolerance</Label>
                  <Select value={formData.riskTolerance.overallTolerance} onValueChange={(v) => updateRiskTolerance({ overallTolerance: v as RiskToleranceLevel })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auto-escalation threshold (HITL risk min)</Label>
                  <Input type="number" step={0.01} min={0} max={1} value={formData.riskTolerance.autoEscalationThreshold} onChange={(e) => updateRiskTolerance({ autoEscalationThreshold: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Decision preferences</h2>
              <div className="space-y-2">
                {(['autoMarkHot', 'autoCreateTasks', 'requireApprovalForActions'] as const).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox id={key} checked={formData.decisionPreferences[key]} onCheckedChange={(c) => updateDecisionPreferences({ [key]: !!c })} />
                    <Label htmlFor={key} className="text-sm cursor-pointer">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Model preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="preferIndustryModels" checked={formData.modelPreferences.preferIndustryModels} onCheckedChange={(c) => updateModelPreferences({ preferIndustryModels: !!c })} />
                  <Label htmlFor="preferIndustryModels" className="text-sm cursor-pointer">Prefer industry models</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="abTestingEnabled" checked={formData.modelPreferences.abTestingEnabled} onCheckedChange={(c) => updateModelPreferences({ abTestingEnabled: !!c })} />
                  <Label htmlFor="abTestingEnabled" className="text-sm cursor-pointer">A/B testing enabled</Label>
                </div>
                <div className="space-y-2">
                  <Label>Min confidence threshold</Label>
                  <Input type="number" step={0.01} min={0} max={1} value={formData.modelPreferences.minConfidenceThreshold} onChange={(e) => updateModelPreferences({ minConfidenceThreshold: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
