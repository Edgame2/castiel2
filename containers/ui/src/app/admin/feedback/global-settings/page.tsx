/**
 * Super Admin: Feedback Global Settings (§1.2)
 * GET/PUT /api/v1/admin/feedback-config via gateway (recommendations).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type PatternReportFrequency = 'daily' | 'weekly' | 'monthly';

interface FeedbackCollectionSettings {
  requireFeedback: boolean;
  requireFeedbackAfterDays: number;
  allowComments: boolean;
  maxCommentLength: number;
  moderateComments: boolean;
  allowMultipleSelection: boolean;
  maxSelectionsPerFeedback: number;
  allowFeedbackEdit: boolean;
  editWindowDays: number;
  trackFeedbackHistory: boolean;
  allowAnonymousFeedback: boolean;
  anonymousForNegative: boolean;
}

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
    thresholds: { ignoreRate: number; actionRate: number; sentimentThreshold: number };
    autoSuppressEnabled: boolean;
    autoBoostEnabled: boolean;
    notifyOnPattern: boolean;
    patternReportFrequency: PatternReportFrequency;
  };
  feedbackCollection?: FeedbackCollectionSettings;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_FEEDBACK_COLLECTION: FeedbackCollectionSettings = {
  requireFeedback: false,
  requireFeedbackAfterDays: 7,
  allowComments: true,
  maxCommentLength: 500,
  moderateComments: false,
  allowMultipleSelection: false,
  maxSelectionsPerFeedback: 1,
  allowFeedbackEdit: false,
  editWindowDays: 1,
  trackFeedbackHistory: false,
  allowAnonymousFeedback: false,
  anonymousForNegative: false,
};

const DEFAULT_PATTERN: NonNullable<GlobalFeedbackConfig['patternDetection']> = {
  enabled: true,
  minSampleSize: 50,
  thresholds: { ignoreRate: 0.6, actionRate: 0.4, sentimentThreshold: 0.3 },
  autoSuppressEnabled: false,
  autoBoostEnabled: false,
  notifyOnPattern: false,
  patternReportFrequency: 'weekly',
};

const DEFAULT_CONFIG: GlobalFeedbackConfig = {
  defaultLimit: 5,
  minLimit: 3,
  maxLimit: 10,
  availableTypes: [],
  defaultActiveTypes: [],
  patternDetection: DEFAULT_PATTERN,
  feedbackCollection: DEFAULT_FEEDBACK_COLLECTION,
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

  const pd: NonNullable<GlobalFeedbackConfig['patternDetection']> = {
    ...DEFAULT_PATTERN,
    ...formConfig.patternDetection,
    thresholds: { ...DEFAULT_PATTERN.thresholds, ...formConfig.patternDetection?.thresholds },
  };
  const updatePattern = (patch: Partial<NonNullable<GlobalFeedbackConfig['patternDetection']>>) => {
    updateConfig({
      patternDetection: {
        ...pd,
        ...patch,
        thresholds: patch.thresholds ? { ...pd.thresholds, ...patch.thresholds } : pd.thresholds,
      },
    });
  };

  const fc: FeedbackCollectionSettings = {
    ...DEFAULT_FEEDBACK_COLLECTION,
    ...formConfig.feedbackCollection,
  };
  const updateFeedbackCollection = (patch: Partial<FeedbackCollectionSettings>) => {
    updateConfig({ feedbackCollection: { ...fc, ...patch } });
  };

  /** Validation per §1.2.1: minLimit <= maxLimit, minLimit <= defaultLimit <= maxLimit */
  const validateLimits = (c: GlobalFeedbackConfig): string[] => {
    const min = c.minLimit ?? 3;
    const max = c.maxLimit ?? 10;
    const def = c.defaultLimit ?? 5;
    const errs: string[] = [];
    if (min > max) errs.push('Min limit must be less than or equal to max limit.');
    if (def < min || def > max) errs.push('Default limit must be between min and max (inclusive).');
    return errs;
  };

  const validationErrors = validateLimits(formConfig);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    const bodyConfig = config ?? DEFAULT_CONFIG;
    const errs = validateLimits(bodyConfig);
    if (errs.length > 0) {
      setError(errs.join(' '));
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const pdSave: NonNullable<GlobalFeedbackConfig['patternDetection']> = {
        ...DEFAULT_PATTERN,
        ...bodyConfig.patternDetection,
        thresholds: { ...DEFAULT_PATTERN.thresholds, ...bodyConfig.patternDetection?.thresholds },
      };
      const fcSave: FeedbackCollectionSettings = {
        ...DEFAULT_FEEDBACK_COLLECTION,
        ...bodyConfig.feedbackCollection,
      };
      const body = {
        defaultLimit: bodyConfig.defaultLimit,
        minLimit: bodyConfig.minLimit,
        maxLimit: bodyConfig.maxLimit,
        availableTypes: bodyConfig.availableTypes ?? [],
        defaultActiveTypes: bodyConfig.defaultActiveTypes ?? [],
        patternDetection: {
          enabled: pdSave.enabled,
          minSampleSize: pdSave.minSampleSize,
          thresholds: {
            ignoreRate: pdSave.thresholds.ignoreRate,
            actionRate: pdSave.thresholds.actionRate,
            sentimentThreshold: pdSave.thresholds.sentimentThreshold,
          },
          autoSuppressEnabled: pdSave.autoSuppressEnabled,
          autoBoostEnabled: pdSave.autoBoostEnabled,
          notifyOnPattern: pdSave.notifyOnPattern,
          patternReportFrequency: pdSave.patternReportFrequency,
        },
        feedbackCollection: fcSave,
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
          {validationErrors.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3" role="alert">
              {validationErrors.join(' ')}
            </p>
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
              <h3 className="text-sm font-medium mb-2">Pattern detection (§1.2.2)</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="patternEnabled"
                    checked={pd.enabled}
                    onChange={(e) => updatePattern({ enabled: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="patternEnabled" className="text-sm">Enabled</label>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Min sample size</label>
                  <input
                    type="number"
                    min={1}
                    value={pd.minSampleSize}
                    onChange={(e) => updatePattern({ minSampleSize: parseInt(e.target.value, 10) || 1 })}
                    className="w-full max-w-xs px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 max-w-lg">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Ignore rate (0–1)</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={pd.thresholds.ignoreRate}
                      onChange={(e) =>
                        updatePattern({
                          thresholds: { ...pd.thresholds, ignoreRate: parseFloat(e.target.value) || 0 },
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
                      value={pd.thresholds.actionRate}
                      onChange={(e) =>
                        updatePattern({
                          thresholds: { ...pd.thresholds, actionRate: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Sentiment threshold (0–1)</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={pd.thresholds.sentimentThreshold}
                      onChange={(e) =>
                        updatePattern({
                          thresholds: { ...pd.thresholds, sentimentThreshold: parseFloat(e.target.value) ?? 0.3 },
                        })
                      }
                      className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoSuppress"
                      checked={pd.autoSuppressEnabled}
                      onChange={(e) => updatePattern({ autoSuppressEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="autoSuppress" className="text-sm">Auto-suppress based on patterns</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoBoost"
                      checked={pd.autoBoostEnabled}
                      onChange={(e) => updatePattern({ autoBoostEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="autoBoost" className="text-sm">Auto-boost based on patterns</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="notifyOnPattern"
                      checked={pd.notifyOnPattern}
                      onChange={(e) => updatePattern({ notifyOnPattern: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="notifyOnPattern" className="text-sm">Notify admins of detected patterns</label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Pattern report frequency</label>
                  <select
                    value={pd.patternReportFrequency}
                    onChange={(e) =>
                      updatePattern({
                        patternReportFrequency: e.target.value as PatternReportFrequency,
                      })
                    }
                    className="w-full max-w-xs px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium mb-2">Feedback collection (§1.2.3)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Defaults for requirement, comments, multi-select, editing, and privacy.
              </p>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireFeedback"
                      checked={fc.requireFeedback}
                      onChange={(e) => updateFeedbackCollection({ requireFeedback: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="requireFeedback" className="text-sm">Require feedback</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Require after (days)</span>
                    <input
                      type="number"
                      min={0}
                      value={fc.requireFeedbackAfterDays}
                      onChange={(e) => updateFeedbackCollection({ requireFeedbackAfterDays: parseInt(e.target.value, 10) || 0 })}
                      className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowComments"
                      checked={fc.allowComments}
                      onChange={(e) => updateFeedbackCollection({ allowComments: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="allowComments" className="text-sm">Allow comments</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Max comment length</span>
                    <input
                      type="number"
                      min={1}
                      value={fc.maxCommentLength}
                      onChange={(e) => updateFeedbackCollection({ maxCommentLength: parseInt(e.target.value, 10) || 500 })}
                      className="w-24 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="moderateComments"
                      checked={fc.moderateComments}
                      onChange={(e) => updateFeedbackCollection({ moderateComments: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="moderateComments" className="text-sm">Moderate comments</label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowMultipleSelection"
                      checked={fc.allowMultipleSelection}
                      onChange={(e) => updateFeedbackCollection({ allowMultipleSelection: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="allowMultipleSelection" className="text-sm">Allow multiple selection</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Max selections per feedback</span>
                    <input
                      type="number"
                      min={1}
                      value={fc.maxSelectionsPerFeedback}
                      onChange={(e) => updateFeedbackCollection({ maxSelectionsPerFeedback: parseInt(e.target.value, 10) || 1 })}
                      className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowFeedbackEdit"
                      checked={fc.allowFeedbackEdit}
                      onChange={(e) => updateFeedbackCollection({ allowFeedbackEdit: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="allowFeedbackEdit" className="text-sm">Allow feedback edit</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Edit window (days)</span>
                    <input
                      type="number"
                      min={0}
                      value={fc.editWindowDays}
                      onChange={(e) => updateFeedbackCollection({ editWindowDays: parseInt(e.target.value, 10) || 0 })}
                      className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="trackFeedbackHistory"
                      checked={fc.trackFeedbackHistory}
                      onChange={(e) => updateFeedbackCollection({ trackFeedbackHistory: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="trackFeedbackHistory" className="text-sm">Track feedback history</label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowAnonymousFeedback"
                      checked={fc.allowAnonymousFeedback}
                      onChange={(e) => updateFeedbackCollection({ allowAnonymousFeedback: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="allowAnonymousFeedback" className="text-sm">Allow anonymous feedback</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="anonymousForNegative"
                      checked={fc.anonymousForNegative}
                      onChange={(e) => updateFeedbackCollection({ anonymousForNegative: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="anonymousForNegative" className="text-sm">Anonymous for negative only</label>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || validationErrors.length > 0}
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
