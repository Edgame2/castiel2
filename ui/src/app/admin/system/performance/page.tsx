/**
 * Super Admin: Performance configuration (§8.1)
 * GET/PUT /api/v1/system/performance via gateway (configuration-service).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface LatencyTargetGroup {
  p50: number;
  p95: number;
  p99: number;
}

interface PerformanceConfig {
  latencyTargets: {
    featureExtraction: LatencyTargetGroup;
    mlPrediction: LatencyTargetGroup;
    explanation: LatencyTargetGroup;
    llmReasoning: LatencyTargetGroup;
    decisionEvaluation: LatencyTargetGroup;
    endToEnd: LatencyTargetGroup;
  };
  throughputTargets: {
    predictionsPerSecond: number;
    batchSize: number;
    concurrentRequests: number;
  };
  alerts: {
    alertIfExceeded: boolean;
    alertThreshold: number;
  };
}

const LATENCY_KEYS = [
  'featureExtraction',
  'mlPrediction',
  'explanation',
  'llmReasoning',
  'decisionEvaluation',
  'endToEnd',
] as const;

const LABELS: Record<(typeof LATENCY_KEYS)[number], string> = {
  featureExtraction: 'Feature extraction',
  mlPrediction: 'ML prediction',
  explanation: 'Explanation',
  llmReasoning: 'LLM reasoning',
  decisionEvaluation: 'Decision evaluation',
  endToEnd: 'End-to-end',
};

const DEFAULT_CONFIG: PerformanceConfig = {
  latencyTargets: {
    featureExtraction: { p50: 250, p95: 500, p99: 600 },
    mlPrediction: { p50: 1000, p95: 2000, p99: 2400 },
    explanation: { p50: 500, p95: 1000, p99: 1200 },
    llmReasoning: { p50: 1500, p95: 3000, p99: 3600 },
    decisionEvaluation: { p50: 50, p95: 100, p99: 120 },
    endToEnd: { p50: 2500, p95: 5000, p99: 6000 },
  },
  throughputTargets: {
    predictionsPerSecond: 50,
    batchSize: 100,
    concurrentRequests: 100,
  },
  alerts: {
    alertIfExceeded: true,
    alertThreshold: 10,
  },
};

export default function SystemPerformancePage() {
  const [config, setConfig] = useState<PerformanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/system/performance');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.title = 'Performance | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const handleSave = async () => {
    if (!getApiBaseUrl() || !config) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiFetch('/api/v1/system/performance', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setConfig(data);
      setDirty(false);
    } catch {
      setSaveError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const updateLatency = (
    key: (typeof LATENCY_KEYS)[number],
    field: keyof LatencyTargetGroup,
    value: number
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      latencyTargets: {
        ...config.latencyTargets,
        [key]: { ...config.latencyTargets[key], [field]: value },
      },
    });
    setDirty(true);
  };

  const updateThroughput = (field: keyof PerformanceConfig['throughputTargets'], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      throughputTargets: { ...config.throughputTargets, [field]: value },
    });
    setDirty(true);
  };

  const updateAlerts = (field: keyof PerformanceConfig['alerts'], value: boolean | number) => {
    if (!config) return;
    setConfig({
      ...config,
      alerts: { ...config.alerts, [field]: value },
    });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/admin/system" className="text-sm font-medium hover:underline">
            ← System
          </Link>
        </div>
        <p className="text-muted-foreground">Loading performance configuration…</p>
      </div>
    );
  }

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
        <Link href="/admin/system" className="text-sm font-medium hover:underline">
          System Configuration
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Performance Configuration</h1>
      <p className="text-muted-foreground mb-4">
        Latency and throughput targets; alert when exceeded (§8.1).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/system"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Performance
        </span>
        <Link
          href="/admin/system/data-lake"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Data Lake
        </Link>
        <Link
          href="/admin/system/logging"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Logging
        </Link>
        <Link
          href="/admin/system/api-security"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          API Security
        </Link>
      </nav>

      {error && (
        <div className="mb-4 p-3 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
          {error}
          <p className="text-sm mt-1">
            Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL. Showing defaults.
          </p>
        </div>
      )}

      {saveError && (
        <div className="mb-4 p-3 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
          {saveError}
        </div>
      )}

      {config && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold">Performance (§8.1)</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => { setLoading(true); fetchConfig().finally(() => setLoading(false)); }} disabled={loading} aria-label="Refresh performance config">
              Refresh
            </Button>
          </div>
          <section>
            <h3 className="text-sm font-semibold mb-3">Latency targets (ms)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {LATENCY_KEYS.map((key) => (
                <div key={key} className="border rounded p-3 space-y-2">
                  <div className="font-medium text-sm">{LABELS[key]}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">p50</Label>
                      <Input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full h-8 text-sm"
                        value={config.latencyTargets[key].p50}
                        onChange={(e) =>
                          updateLatency(key, 'p50', parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">p95</Label>
                      <Input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full h-8 text-sm"
                        value={config.latencyTargets[key].p95}
                        onChange={(e) =>
                          updateLatency(key, 'p95', parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">p99</Label>
                      <Input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full h-8 text-sm"
                        value={config.latencyTargets[key].p99}
                        onChange={(e) =>
                          updateLatency(key, 'p99', parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Throughput targets</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <Label className="text-sm">Predictions/sec</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1 w-24 h-8"
                  value={config.throughputTargets.predictionsPerSecond}
                  onChange={(e) =>
                    updateThroughput('predictionsPerSecond', parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
              <div>
                <Label className="text-sm">Batch size</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1 w-24 h-8"
                  value={config.throughputTargets.batchSize}
                  onChange={(e) =>
                    updateThroughput('batchSize', parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
              <div>
                <Label className="text-sm">Concurrent requests</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1 w-24 h-8"
                  value={config.throughputTargets.concurrentRequests}
                  onChange={(e) =>
                    updateThroughput('concurrentRequests', parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Alerts</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="alertIfExceeded"
                  checked={config.alerts.alertIfExceeded}
                  onCheckedChange={(c) => updateAlerts('alertIfExceeded', !!c)}
                />
                <Label htmlFor="alertIfExceeded" className="text-sm font-normal">Alert when target exceeded</Label>
              </div>
              <div>
                <Label className="text-sm">Alert if over target by (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-20 h-8"
                  value={config.alerts.alertThreshold}
                  onChange={(e) =>
                    updateAlerts('alertThreshold', parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
            </div>
          </section>

          <section>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              §8.1.2 Caching (Redis, cacheStrategy, hit-rate monitoring) is configured per-service via YAML/env; no central admin API for caching yet.
            </p>
          </section>

          {dirty && (
            <div className="pt-2">
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      )}

      <Link href="/admin/system" className="mt-4 inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to System Configuration
      </Link>
    </div>
  );
}
