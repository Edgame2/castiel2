/**
 * Super Admin: Feedback Global Settings (§1.2)
 * GET/PUT /api/v1/admin/feedback-config via gateway (recommendations).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface GlobalFeedbackConfig {
  id?: string;
  defaultLimit?: number;
  minLimit?: number;
  maxLimit?: number;
  availableTypes?: string[];
  defaultActiveTypes?: string[];
  patternDetection?: {
    enabled: boolean;
    minSampleSize: number;
    thresholds: { ignoreRate: number; actionRate: number };
  };
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_CONFIG: GlobalFeedbackConfig = {
  defaultLimit: 5,
  minLimit: 3,
  maxLimit: 10,
  availableTypes: [],
  defaultActiveTypes: [],
  patternDetection: {
    enabled: true,
    minSampleSize: 50,
    thresholds: { ignoreRate: 0.6, actionRate: 0.4 },
  },
};

export default function FeedbackGlobalSettingsPage() {
  const [config, setConfig] = useState<GlobalFeedbackConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-config`, { credentials: 'include' });
      if (res.status === 404) {
        setConfig(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setConfig(json);
    } catch (e) {
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (apiBaseUrl) {
      fetchConfig().finally(() => setLoading(false));
    } else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [apiBaseUrl, fetchConfig]);

  useEffect(() => {
    document.title = 'Global Settings | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const formConfig = config ?? DEFAULT_CONFIG;

  const updateConfig = (patch: Partial<GlobalFeedbackConfig>) => {
    setConfig((c) => (c ? { ...c, ...patch } : { ...DEFAULT_CONFIG, ...patch }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    const bodyConfig = config ?? DEFAULT_CONFIG;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const body = {
        defaultLimit: bodyConfig.defaultLimit,
        minLimit: bodyConfig.minLimit,
        maxLimit: bodyConfig.maxLimit,
        availableTypes: bodyConfig.availableTypes ?? [],
        defaultActiveTypes: bodyConfig.defaultActiveTypes ?? [],
        patternDetection:
          bodyConfig.patternDetection != null
            ? {
                enabled: bodyConfig.patternDetection.enabled,
                minSampleSize: bodyConfig.patternDetection.minSampleSize,
                thresholds: {
                  ignoreRate: bodyConfig.patternDetection.thresholds.ignoreRate,
                  actionRate: bodyConfig.patternDetection.thresholds.actionRate,
                },
              }
            : undefined,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-config`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
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
        <Link href="/dashboard" className="text-sm font-medium underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium underline">
          Admin
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/feedback" className="text-sm font-medium underline">
          Feedback System
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Global Settings</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Global Feedback Settings</h1>
      <p className="text-muted-foreground mb-6">
        Default limits, pattern detection, and default active types for feedback (Super Admin §1.2).
      </p>

      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/feedback"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/feedback/types"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Feedback Types
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Global Settings
        </span>
      </nav>

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
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold mb-3">Global feedback config</h2>
          {config === null && (
            <p className="text-sm text-gray-500 mb-4">No config set. Save below to create.</p>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-1">Default limit</label>
                <input
                  type="number"
                  min={0}
                  value={formConfig.defaultLimit ?? 5}
                  onChange={(e) => updateConfig({ defaultLimit: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min limit</label>
                <input
                  type="number"
                  min={0}
                  value={formConfig.minLimit ?? 3}
                  onChange={(e) => updateConfig({ minLimit: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max limit</label>
                <input
                  type="number"
                  min={0}
                  value={formConfig.maxLimit ?? 10}
                  onChange={(e) => updateConfig({ maxLimit: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Available types (comma-separated IDs)</label>
              <input
                type="text"
                value={(formConfig.availableTypes ?? []).join(', ')}
                onChange={(e) => updateConfig({ availableTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="e.g. type1, type2"
                className="w-full max-w-md px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default active types (comma-separated IDs)</label>
              <input
                type="text"
                value={(formConfig.defaultActiveTypes ?? []).join(', ')}
                onChange={(e) => updateConfig({ defaultActiveTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="e.g. type1, type2"
                className="w-full max-w-md px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium mb-2">Pattern detection</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="patternEnabled"
                    checked={formConfig.patternDetection?.enabled ?? true}
                    onChange={(e) =>
                      updateConfig({
                        patternDetection: {
                          enabled: e.target.checked,
                          minSampleSize: formConfig.patternDetection?.minSampleSize ?? 50,
                          thresholds: formConfig.patternDetection?.thresholds ?? { ignoreRate: 0.6, actionRate: 0.4 },
                        },
                      })
                    }
                    className="rounded"
                  />
                  <label htmlFor="patternEnabled" className="text-sm">Enabled</label>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Min sample size</label>
                  <input
                    type="number"
                    min={1}
                    value={formConfig.patternDetection?.minSampleSize ?? 50}
                    onChange={(e) =>
                      updateConfig({
                        patternDetection: {
                          enabled: formConfig.patternDetection?.enabled ?? true,
                          minSampleSize: parseInt(e.target.value, 10) || 1,
                          thresholds: formConfig.patternDetection?.thresholds ?? { ignoreRate: 0.6, actionRate: 0.4 },
                        },
                      })
                    }
                    className="w-full max-w-xs px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Ignore rate (0–1)</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={formConfig.patternDetection?.thresholds?.ignoreRate ?? 0.6}
                      onChange={(e) =>
                        updateConfig({
                          patternDetection: {
                            enabled: formConfig.patternDetection?.enabled ?? true,
                            minSampleSize: formConfig.patternDetection?.minSampleSize ?? 50,
                            thresholds: {
                              ignoreRate: parseFloat(e.target.value) || 0,
                              actionRate: formConfig.patternDetection?.thresholds?.actionRate ?? 0.4,
                            },
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action rate (0–1)</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={formConfig.patternDetection?.thresholds?.actionRate ?? 0.4}
                      onChange={(e) =>
                        updateConfig({
                          patternDetection: {
                            enabled: formConfig.patternDetection?.enabled ?? true,
                            minSampleSize: formConfig.patternDetection?.minSampleSize ?? 50,
                            thresholds: {
                              ignoreRate: formConfig.patternDetection?.thresholds?.ignoreRate ?? 0.6,
                              actionRate: parseFloat(e.target.value) || 0,
                            },
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save global config'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
