/**
 * Super Admin: System Settings
 * Manage system-wide settings (rate limits, capacity, queues, feature flags)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/** Matches integration-manager SystemSettings (GET /api/v1/admin/settings). */
interface SystemSettings {
  id?: string;
  rateLimits: {
    global: {
      requestsPerSecond: number;
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    defaultByIntegrationType?: Record<string, { requestsPerMinute: number; requestsPerHour: number }>;
    bypassTenants?: string[];
  };
  capacity: {
    lightProcessors: {
      minInstances: number;
      maxInstances: number;
      autoScaleThreshold: number;
      prefetch: number;
      concurrentProcessing: number;
      memoryLimitMB: number;
    };
    heavyProcessors: {
      minInstances: number;
      maxInstances: number;
      autoScaleThreshold: number;
      prefetch: number;
      concurrentProcessing: number;
      memoryLimitMB: number;
    };
  };
  queueConfig: {
    ttl: Record<string, number>;
    dlq: { maxRetries: number; alertThreshold: number };
    priority: { enabled: boolean; highPriorityQueues: string[] };
    depthAlerts: { enabled: boolean; warningThreshold: number; criticalThreshold: number };
    autoScaling: { enabled: boolean; scaleUpThreshold: number; scaleDownThreshold: number };
  };
  featureFlags: Record<string, boolean>;
  updatedAt?: string | Date;
  updatedBy?: string;
}

type RateLimitGlobal = { requestsPerSecond: number; requestsPerMinute: number; requestsPerHour: number };

type ProcessorBlock = {
  minInstances: number;
  maxInstances: number;
  autoScaleThreshold: number;
  prefetch: number;
  concurrentProcessing: number;
  memoryLimitMB: number;
};
type CapacityDraft = { lightProcessors: ProcessorBlock; heavyProcessors: ProcessorBlock };

type QueueConfigDraft = {
  ttl: Record<string, number>;
  dlq: { maxRetries: number; alertThreshold: number };
  priority: { enabled: boolean; highPriorityQueues: string[] };
  depthAlerts: { enabled: boolean; warningThreshold: number; criticalThreshold: number };
  autoScaling: { enabled: boolean; scaleUpThreshold: number; scaleDownThreshold: number };
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rate-limits' | 'capacity' | 'queues' | 'features'>('rate-limits');
  const [rateLimitDraft, setRateLimitDraft] = useState<RateLimitGlobal | null>(null);
  const [rateLimitsSaving, setRateLimitsSaving] = useState(false);
  const [rateLimitsError, setRateLimitsError] = useState<string | null>(null);
  const [featureFlagToggling, setFeatureFlagToggling] = useState<string | null>(null);
  const [featureFlagsError, setFeatureFlagsError] = useState<string | null>(null);
  const [capacityDraft, setCapacityDraft] = useState<CapacityDraft | null>(null);
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [queueConfigDraft, setQueueConfigDraft] = useState<QueueConfigDraft | null>(null);
  const [queueConfigSaving, setQueueConfigSaving] = useState(false);
  const [queueConfigError, setQueueConfigError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Settings | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  useEffect(() => {
    if (settings?.rateLimits?.global) {
      setRateLimitDraft({ ...settings.rateLimits.global });
    } else {
      setRateLimitDraft(null);
    }
  }, [settings?.rateLimits?.global]);

  useEffect(() => {
    if (settings?.capacity?.lightProcessors && settings?.capacity?.heavyProcessors) {
      setCapacityDraft({
        lightProcessors: { ...settings.capacity.lightProcessors },
        heavyProcessors: { ...settings.capacity.heavyProcessors },
      });
    } else {
      setCapacityDraft(null);
    }
  }, [
    settings?.capacity?.lightProcessors,
    settings?.capacity?.heavyProcessors,
  ]);

  useEffect(() => {
    if (settings?.queueConfig) {
      const q = settings.queueConfig;
      setQueueConfigDraft({
        ttl: { ...(q.ttl || {}) },
        dlq: { maxRetries: q.dlq?.maxRetries ?? 0, alertThreshold: q.dlq?.alertThreshold ?? 0 },
        priority: {
          enabled: q.priority?.enabled ?? false,
          highPriorityQueues: Array.isArray(q.priority?.highPriorityQueues) ? [...q.priority.highPriorityQueues] : [],
        },
        depthAlerts: {
          enabled: q.depthAlerts?.enabled ?? false,
          warningThreshold: q.depthAlerts?.warningThreshold ?? 0,
          criticalThreshold: q.depthAlerts?.criticalThreshold ?? 0,
        },
        autoScaling: {
          enabled: q.autoScaling?.enabled ?? false,
          scaleUpThreshold: q.autoScaling?.scaleUpThreshold ?? 0,
          scaleDownThreshold: q.autoScaling?.scaleDownThreshold ?? 0,
        },
      });
    } else {
      setQueueConfigDraft(null);
    }
  }, [settings?.queueConfig]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/settings`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSettings(json?.settings || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveRateLimits = useCallback(async () => {
    if (!apiBaseUrl || !rateLimitDraft || !settings?.rateLimits) return;
    setRateLimitsError(null);
    setRateLimitsSaving(true);
    try {
      const body = {
        global: {
          requestsPerSecond: Number(rateLimitDraft.requestsPerSecond) || 0,
          requestsPerMinute: Number(rateLimitDraft.requestsPerMinute) || 0,
          requestsPerHour: Number(rateLimitDraft.requestsPerHour) || 0,
        },
        defaultByIntegrationType: settings.rateLimits.defaultByIntegrationType,
        bypassTenants: settings.rateLimits.bypassTenants,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/settings/rate-limits`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSettings();
    } catch (e) {
      setRateLimitsError(e instanceof Error ? e.message : String(e));
    } finally {
      setRateLimitsSaving(false);
    }
  }, [apiBaseUrl, rateLimitDraft, settings?.rateLimits, fetchSettings]);

  const handleSaveCapacity = useCallback(async () => {
    if (!apiBaseUrl || !capacityDraft) return;
    setCapacityError(null);
    setCapacitySaving(true);
    try {
      const body = {
        lightProcessors: {
          minInstances: Number(capacityDraft.lightProcessors.minInstances) || 0,
          maxInstances: Number(capacityDraft.lightProcessors.maxInstances) || 0,
          autoScaleThreshold: Number(capacityDraft.lightProcessors.autoScaleThreshold) || 0,
          prefetch: Number(capacityDraft.lightProcessors.prefetch) || 0,
          concurrentProcessing: Number(capacityDraft.lightProcessors.concurrentProcessing) || 0,
          memoryLimitMB: Number(capacityDraft.lightProcessors.memoryLimitMB) || 0,
        },
        heavyProcessors: {
          minInstances: Number(capacityDraft.heavyProcessors.minInstances) || 0,
          maxInstances: Number(capacityDraft.heavyProcessors.maxInstances) || 0,
          autoScaleThreshold: Number(capacityDraft.heavyProcessors.autoScaleThreshold) || 0,
          prefetch: Number(capacityDraft.heavyProcessors.prefetch) || 0,
          concurrentProcessing: Number(capacityDraft.heavyProcessors.concurrentProcessing) || 0,
          memoryLimitMB: Number(capacityDraft.heavyProcessors.memoryLimitMB) || 0,
        },
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/settings/capacity`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSettings();
    } catch (e) {
      setCapacityError(e instanceof Error ? e.message : String(e));
    } finally {
      setCapacitySaving(false);
    }
  }, [apiBaseUrl, capacityDraft, fetchSettings]);

  const handleSaveQueueConfig = useCallback(async () => {
    if (!apiBaseUrl || !queueConfigDraft) return;
    setQueueConfigError(null);
    setQueueConfigSaving(true);
    try {
      const body = {
        queueConfig: {
          ...queueConfigDraft,
          dlq: {
            maxRetries: Number(queueConfigDraft.dlq.maxRetries) || 0,
            alertThreshold: Number(queueConfigDraft.dlq.alertThreshold) || 0,
          },
          priority: {
            enabled: Boolean(queueConfigDraft.priority.enabled),
            highPriorityQueues: Array.isArray(queueConfigDraft.priority.highPriorityQueues)
              ? queueConfigDraft.priority.highPriorityQueues
              : [],
          },
          depthAlerts: {
            enabled: Boolean(queueConfigDraft.depthAlerts.enabled),
            warningThreshold: Number(queueConfigDraft.depthAlerts.warningThreshold) || 0,
            criticalThreshold: Number(queueConfigDraft.depthAlerts.criticalThreshold) || 0,
          },
          autoScaling: {
            enabled: Boolean(queueConfigDraft.autoScaling.enabled),
            scaleUpThreshold: Number(queueConfigDraft.autoScaling.scaleUpThreshold) || 0,
            scaleDownThreshold: Number(queueConfigDraft.autoScaling.scaleDownThreshold) || 0,
          },
        },
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSettings();
    } catch (e) {
      setQueueConfigError(e instanceof Error ? e.message : String(e));
    } finally {
      setQueueConfigSaving(false);
    }
  }, [apiBaseUrl, queueConfigDraft, fetchSettings]);

  const handleToggleFeatureFlag = useCallback(
    async (flagName: string, enabled: boolean) => {
      if (!apiBaseUrl) return;
      setFeatureFlagsError(null);
      setFeatureFlagToggling(flagName);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/admin/settings/feature-flags/${encodeURIComponent(flagName)}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
          }
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
        await fetchSettings();
      } catch (e) {
        setFeatureFlagsError(e instanceof Error ? e.message : String(e));
      } finally {
        setFeatureFlagToggling(null);
      }
    },
    [apiBaseUrl, fetchSettings]
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
      </div>
      <h1 className="text-2xl font-bold mb-2">System Settings</h1>
      <p className="text-muted-foreground mb-6">
        Manage system-wide settings (Super Admin only)
      </p>

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading system settings…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && settings && (
        <div className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="border-b">
            <nav className="flex gap-4 px-4">
              <button
                onClick={() => setActiveTab('rate-limits')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'rate-limits'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Rate Limits
              </button>
              <button
                onClick={() => setActiveTab('capacity')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'capacity'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Processing Capacity
              </button>
              <button
                onClick={() => setActiveTab('queues')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'queues'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Queue Configuration
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'features'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Feature Flags
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'rate-limits' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Rate Limits</h3>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Global</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Requests per Second</label>
                    <input
                      type="number"
                      min={0}
                      value={rateLimitDraft?.requestsPerSecond ?? settings.rateLimits?.global?.requestsPerSecond ?? ''}
                      onChange={(e) =>
                        setRateLimitDraft((prev) =>
                          prev ? { ...prev, requestsPerSecond: Number(e.target.value) || 0 } : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!rateLimitDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Requests per Minute</label>
                    <input
                      type="number"
                      min={0}
                      value={rateLimitDraft?.requestsPerMinute ?? settings.rateLimits?.global?.requestsPerMinute ?? ''}
                      onChange={(e) =>
                        setRateLimitDraft((prev) =>
                          prev ? { ...prev, requestsPerMinute: Number(e.target.value) || 0 } : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!rateLimitDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Requests per Hour</label>
                    <input
                      type="number"
                      min={0}
                      value={rateLimitDraft?.requestsPerHour ?? settings.rateLimits?.global?.requestsPerHour ?? ''}
                      onChange={(e) =>
                        setRateLimitDraft((prev) =>
                          prev ? { ...prev, requestsPerHour: Number(e.target.value) || 0 } : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!rateLimitDraft}
                    />
                  </div>
                </div>
                {settings.rateLimits?.bypassTenants && settings.rateLimits.bypassTenants.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Bypass tenants: {settings.rateLimits.bypassTenants.join(', ')}
                  </p>
                )}
                {rateLimitsError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{rateLimitsError}</p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleSaveRateLimits}
                    disabled={!apiBaseUrl || !rateLimitDraft || rateLimitsSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {rateLimitsSaving ? 'Saving…' : 'Save rate limits'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'capacity' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Processing Capacity</h3>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Light processors</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min instances</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.lightProcessors?.minInstances ?? settings.capacity?.lightProcessors?.minInstances ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                lightProcessors: {
                                  ...prev.lightProcessors,
                                  minInstances: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max instances</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.lightProcessors?.maxInstances ?? settings.capacity?.lightProcessors?.maxInstances ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                lightProcessors: {
                                  ...prev.lightProcessors,
                                  maxInstances: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prefetch</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.lightProcessors?.prefetch ?? settings.capacity?.lightProcessors?.prefetch ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                lightProcessors: {
                                  ...prev.lightProcessors,
                                  prefetch: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Concurrent processing</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.lightProcessors?.concurrentProcessing ?? settings.capacity?.lightProcessors?.concurrentProcessing ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                lightProcessors: {
                                  ...prev.lightProcessors,
                                  concurrentProcessing: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Memory limit (MB)</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.lightProcessors?.memoryLimitMB ?? settings.capacity?.lightProcessors?.memoryLimitMB ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                lightProcessors: {
                                  ...prev.lightProcessors,
                                  memoryLimitMB: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Auto-scale threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.lightProcessors?.autoScaleThreshold ?? settings.capacity?.lightProcessors?.autoScaleThreshold ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                lightProcessors: {
                                  ...prev.lightProcessors,
                                  autoScaleThreshold: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 mt-4">Heavy processors</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min instances</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.heavyProcessors?.minInstances ?? settings.capacity?.heavyProcessors?.minInstances ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                heavyProcessors: {
                                  ...prev.heavyProcessors,
                                  minInstances: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max instances</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.heavyProcessors?.maxInstances ?? settings.capacity?.heavyProcessors?.maxInstances ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                heavyProcessors: {
                                  ...prev.heavyProcessors,
                                  maxInstances: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prefetch</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.heavyProcessors?.prefetch ?? settings.capacity?.heavyProcessors?.prefetch ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                heavyProcessors: {
                                  ...prev.heavyProcessors,
                                  prefetch: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Concurrent processing</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.heavyProcessors?.concurrentProcessing ?? settings.capacity?.heavyProcessors?.concurrentProcessing ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                heavyProcessors: {
                                  ...prev.heavyProcessors,
                                  concurrentProcessing: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Memory limit (MB)</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.heavyProcessors?.memoryLimitMB ?? settings.capacity?.heavyProcessors?.memoryLimitMB ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                heavyProcessors: {
                                  ...prev.heavyProcessors,
                                  memoryLimitMB: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Auto-scale threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={capacityDraft?.heavyProcessors?.autoScaleThreshold ?? settings.capacity?.heavyProcessors?.autoScaleThreshold ?? ''}
                      onChange={(e) =>
                        setCapacityDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                heavyProcessors: {
                                  ...prev.heavyProcessors,
                                  autoScaleThreshold: Number(e.target.value) || 0,
                                },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!capacityDraft}
                    />
                  </div>
                </div>
                {capacityError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{capacityError}</p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleSaveCapacity}
                    disabled={!apiBaseUrl || !capacityDraft || capacitySaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {capacitySaving ? 'Saving…' : 'Save capacity'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'queues' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Queue Configuration</h3>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">DLQ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max retries</label>
                    <input
                      type="number"
                      min={0}
                      value={queueConfigDraft?.dlq?.maxRetries ?? settings.queueConfig?.dlq?.maxRetries ?? ''}
                      onChange={(e) =>
                        setQueueConfigDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                dlq: { ...prev.dlq, maxRetries: Number(e.target.value) || 0 },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!queueConfigDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alert threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={queueConfigDraft?.dlq?.alertThreshold ?? settings.queueConfig?.dlq?.alertThreshold ?? ''}
                      onChange={(e) =>
                        setQueueConfigDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                dlq: { ...prev.dlq, alertThreshold: Number(e.target.value) || 0 },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!queueConfigDraft}
                    />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 mt-4">Priority</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="queue-priority-enabled"
                      checked={queueConfigDraft?.priority?.enabled ?? settings.queueConfig?.priority?.enabled ?? false}
                      onChange={(e) =>
                        setQueueConfigDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                priority: { ...prev.priority, enabled: e.target.checked },
                              }
                            : null
                        )
                      }
                      disabled={!queueConfigDraft}
                      className="rounded"
                    />
                    <label htmlFor="queue-priority-enabled" className="text-sm font-medium">
                      Enabled
                    </label>
                  </div>
                </div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 mt-4">Auto-scaling</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="queue-autoscaling-enabled"
                      checked={queueConfigDraft?.autoScaling?.enabled ?? settings.queueConfig?.autoScaling?.enabled ?? false}
                      onChange={(e) =>
                        setQueueConfigDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                autoScaling: { ...prev.autoScaling, enabled: e.target.checked },
                              }
                            : null
                        )
                      }
                      disabled={!queueConfigDraft}
                      className="rounded"
                    />
                    <label htmlFor="queue-autoscaling-enabled" className="text-sm font-medium">
                      Enabled
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Scale up threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={queueConfigDraft?.autoScaling?.scaleUpThreshold ?? settings.queueConfig?.autoScaling?.scaleUpThreshold ?? ''}
                      onChange={(e) =>
                        setQueueConfigDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                autoScaling: { ...prev.autoScaling, scaleUpThreshold: Number(e.target.value) || 0 },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!queueConfigDraft}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Scale down threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={queueConfigDraft?.autoScaling?.scaleDownThreshold ?? settings.queueConfig?.autoScaling?.scaleDownThreshold ?? ''}
                      onChange={(e) =>
                        setQueueConfigDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                autoScaling: { ...prev.autoScaling, scaleDownThreshold: Number(e.target.value) || 0 },
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                      readOnly={!queueConfigDraft}
                    />
                  </div>
                </div>
                {queueConfigError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{queueConfigError}</p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleSaveQueueConfig}
                    disabled={!apiBaseUrl || !queueConfigDraft || queueConfigSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {queueConfigSaving ? 'Saving…' : 'Save queue config'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Feature Flags</h3>
                <div className="space-y-2">
                  {Object.entries(settings.featureFlags).length === 0 ? (
                    <p className="text-sm text-gray-500">No feature flags configured</p>
                  ) : (
                    Object.entries(settings.featureFlags).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm font-medium">{key}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              value
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {value ? 'Enabled' : 'Disabled'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureFlag(key, !value)}
                            disabled={!apiBaseUrl || featureFlagToggling !== null}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {featureFlagToggling === key ? '…' : value ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {featureFlagsError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{featureFlagsError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
