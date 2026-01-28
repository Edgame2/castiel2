/**
 * Super Admin: System Settings
 * Manage system-wide settings (rate limits, capacity, queues, feature flags)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface SystemSettings {
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  processingCapacity: {
    maxConcurrentSyncs: number;
    maxRecordsPerSync: number;
    maxBatchSize: number;
  };
  queueConfiguration: {
    prefetch: number;
    batchSize: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
  featureFlags: Record<string, boolean>;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rate-limits' | 'capacity' | 'queues' | 'features'>('rate-limits');

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Requests per Second</label>
                    <input
                      type="number"
                      value={settings.rateLimits.requestsPerSecond}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Requests per Minute</label>
                    <input
                      type="number"
                      value={settings.rateLimits.requestsPerMinute}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Requests per Hour</label>
                    <input
                      type="number"
                      value={settings.rateLimits.requestsPerHour}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Requests per Day</label>
                    <input
                      type="number"
                      value={settings.rateLimits.requestsPerDay}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Edit functionality to be implemented with PUT /api/v1/admin/settings/rate-limits
                </p>
              </div>
            )}

            {activeTab === 'capacity' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Processing Capacity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Concurrent Syncs</label>
                    <input
                      type="number"
                      value={settings.processingCapacity.maxConcurrentSyncs}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Records per Sync</label>
                    <input
                      type="number"
                      value={settings.processingCapacity.maxRecordsPerSync}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Batch Size</label>
                    <input
                      type="number"
                      value={settings.processingCapacity.maxBatchSize}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Edit functionality to be implemented with PUT /api/v1/admin/settings/capacity
                </p>
              </div>
            )}

            {activeTab === 'queues' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Queue Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Prefetch</label>
                    <input
                      type="number"
                      value={settings.queueConfiguration.prefetch}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch Size</label>
                    <input
                      type="number"
                      value={settings.queueConfiguration.batchSize}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Retry Attempts</label>
                    <input
                      type="number"
                      value={settings.queueConfiguration.retryAttempts}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Retry Delay (ms)</label>
                    <input
                      type="number"
                      value={settings.queueConfiguration.retryDelayMs}
                      className="w-full px-3 py-2 border rounded"
                      readOnly
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Edit functionality to be implemented with PUT /api/v1/admin/settings/queue-config
                </p>
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
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            value
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {value ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Toggle functionality to be implemented with POST /api/v1/admin/settings/feature-flags/:flag/toggle
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
