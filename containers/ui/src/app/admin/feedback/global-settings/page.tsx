/**
 * Super Admin: Feedback Global Settings (§1.2)
 * GET/PUT /api/v1/admin/feedback-config via gateway (recommendations).
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
  /** §1.2.1 Can Super Admin override per tenant? Default true. */
  allowTenantOverride?: boolean;
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
  allowTenantOverride: true,
  availableTypes: [],
  defaultActiveTypes: [],
  patternDetection: DEFAULT_PATTERN,
  feedbackCollection: DEFAULT_FEEDBACK_COLLECTION,
};

interface ApplyToAllResult {
  applied: string[];
  failed: { tenantId: string; error: string }[];
}

export default function FeedbackGlobalSettingsPage() {
  const [config, setConfig] = useState<GlobalFeedbackConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [applyingToAll, setApplyingToAll] = useState(false);
  const [applyToAllResult, setApplyToAllResult] = useState<ApplyToAllResult | null>(null);
  const [defaultTypesDragId, setDefaultTypesDragId] = useState<string | null>(null);
  const [defaultTypesDropTargetId, setDefaultTypesDropTargetId] = useState<string | null>(null);
  const [addTypeInput, setAddTypeInput] = useState('');
  /** §1.2.2 Test with historical data modal */
  const [patternTestModalOpen, setPatternTestModalOpen] = useState(false);
  const [patternTestLoading, setPatternTestLoading] = useState(false);
  const [patternTestError, setPatternTestError] = useState<string | null>(null);
  const [patternTestResult, setPatternTestResult] = useState<{
    totalFeedbackRows: number;
    recommendationCount: number;
    suppressedCount: number;
    flaggedCount: number;
    sampleSuppressed: { recommendationId: string; tenantId: string; feedbackCount: number; ignoreRate: number; actionRate: number; avgSentiment: number }[];
    sampleFlagged: { recommendationId: string; tenantId: string; feedbackCount: number; ignoreRate: number; actionRate: number; avgSentiment: number }[];
    appliedThresholds: { minSampleSize: number; ignoreRate: number; actionRate: number; sentimentThreshold: number };
  } | null>(null);

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

  const defaultActiveTypesList = formConfig.defaultActiveTypes ?? [];
  const setDefaultActiveTypesOrder = useCallback((newOrder: string[]) => {
    updateConfig({ defaultActiveTypes: newOrder });
  }, []);

  /** §1.2.1 Drag-to-reorder default active types (same pattern as action-catalog categories) */
  const handleDefaultTypesDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDefaultTypesDragId(id);
  }, []);

  const handleDefaultTypesDragEnd = useCallback(() => {
    setDefaultTypesDragId(null);
    setDefaultTypesDropTargetId(null);
  }, []);

  const handleDefaultTypesDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (defaultTypesDragId && defaultTypesDragId !== targetId) setDefaultTypesDropTargetId(targetId);
  }, [defaultTypesDragId]);

  const handleDefaultTypesDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      setDefaultTypesDropTargetId(null);
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === targetId) return;
      const without = defaultActiveTypesList.filter((id) => id !== draggedId);
      const targetIndex = without.indexOf(targetId);
      if (targetIndex === -1) return;
      const newOrder = [...without.slice(0, targetIndex), draggedId, ...without.slice(targetIndex)];
      setDefaultActiveTypesOrder(newOrder);
      setDefaultTypesDragId(null);
    },
    [defaultActiveTypesList, setDefaultActiveTypesOrder]
  );

  const removeDefaultActiveType = useCallback(
    (id: string) => {
      updateConfig({ defaultActiveTypes: defaultActiveTypesList.filter((x) => x !== id) });
    },
    [defaultActiveTypesList]
  );

  const addDefaultActiveTypes = useCallback(() => {
    const ids = addTypeInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    const combined = [...defaultActiveTypesList];
    for (const id of ids) {
      if (!combined.includes(id)) combined.push(id);
    }
    updateConfig({ defaultActiveTypes: combined });
    setAddTypeInput('');
  }, [addTypeInput, defaultActiveTypesList]);

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
        allowTenantOverride: bodyConfig.allowTenantOverride ?? true,
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

  /** §1.2.1 Apply current global config to all existing tenant configs (with confirmation). */
  const handleApplyToAllTenants = async () => {
    if (!apiBaseUrl) return;
    if (
      !window.confirm(
        'Apply current global feedback config (default limit, active types, pattern detection, collection settings) to all existing tenant configs? This overwrites per-tenant overrides.',
      )
    )
      return;
    setApplyingToAll(true);
    setError(null);
    setApplyToAllResult(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-config/apply-to-all-tenants`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      setApplyToAllResult(data as ApplyToAllResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingToAll(false);
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

      {applyToAllResult && (
        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20 mb-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
            Apply to all tenants (§1.2.1): {applyToAllResult.applied.length} applied.
          </p>
          {applyToAllResult.failed.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              {applyToAllResult.failed.length} failed: {applyToAllResult.failed.map((f) => `${f.tenantId}: ${f.error}`).join('; ')}
            </p>
          )}
          <Button type="button" variant="link" size="sm" className="text-sm p-0 h-auto" onClick={() => setApplyToAllResult(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {!loading && apiBaseUrl && (
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold">Global feedback config</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setLoading(true); fetchConfig().finally(() => setLoading(false)); }}
              disabled={loading}
              aria-label="Refresh global feedback config"
            >
              Refresh
            </Button>
          </div>
          {config === null && (
            <p className="text-sm text-gray-500 mb-4">No config set. Save below to create.</p>
          )}
          {validationErrors.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3" role="alert">
              {validationErrors.join(' ')}
            </p>
          )}
          <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 mb-4" role="region" aria-labelledby="default-tenant-preview-heading">
            <h3 id="default-tenant-preview-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview of default tenant config (§1.2.1)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              New tenants will get: active limit <strong>{formConfig.defaultLimit ?? 5}</strong> (range {formConfig.minLimit ?? 3}–{formConfig.maxLimit ?? 10})
              {formConfig.allowTenantOverride !== false ? '; tenant override allowed' : '; tenant override not allowed'}.
              Default active types: {defaultActiveTypesList.length > 0 ? defaultActiveTypesList.join(', ') : 'none'}.
              Pattern detection: {pd.enabled ? 'on' : 'off'}.
              Collection: feedback {fc.requireFeedback ? `required after ${fc.requireFeedbackAfterDays} days` : 'not required'}, comments {fc.allowComments ? `allowed (max ${fc.maxCommentLength} chars)` : 'off'}, multi-select {fc.allowMultipleSelection ? `yes (max ${fc.maxSelectionsPerFeedback})` : 'no'}.
            </p>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="space-y-2">
                <Label>Default limit</Label>
                <Input
                  type="number"
                  min={0}
                  value={formConfig.defaultLimit ?? 5}
                  onChange={(e) => updateConfig({ defaultLimit: parseInt(e.target.value, 10) || 0 })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Min limit</Label>
                <Input
                  type="number"
                  min={0}
                  value={formConfig.minLimit ?? 3}
                  onChange={(e) => updateConfig({ minLimit: parseInt(e.target.value, 10) || 0 })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Max limit</Label>
                <Input
                  type="number"
                  min={0}
                  value={formConfig.maxLimit ?? 10}
                  onChange={(e) => updateConfig({ maxLimit: parseInt(e.target.value, 10) || 0 })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allowTenantOverride"
                checked={formConfig.allowTenantOverride !== false}
                onCheckedChange={(c) => updateConfig({ allowTenantOverride: !!c })}
                aria-describedby="allow-tenant-override-desc"
              />
              <Label htmlFor="allowTenantOverride" className="text-sm font-medium cursor-pointer">
                Allow tenant override (§1.2.1)
              </Label>
            </div>
            <p id="allow-tenant-override-desc" className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              When enabled, Super Admin can override feedback limit per tenant.
            </p>
            <div className="max-w-md" id="default-limit-slider-desc">
              <Label className="mb-1">Default limit (slider §1.2.1)</Label>
              <input
                type="range"
                min={formConfig.minLimit ?? 3}
                max={Math.max(formConfig.minLimit ?? 3, formConfig.maxLimit ?? 10)}
                value={Math.max(
                  formConfig.minLimit ?? 3,
                  Math.min(formConfig.maxLimit ?? 10, formConfig.defaultLimit ?? 5),
                )}
                onChange={(e) => updateConfig({ defaultLimit: parseInt(e.target.value, 10) })}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600"
                aria-label="Default limit slider"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formConfig.minLimit ?? 3} – {formConfig.maxLimit ?? 10}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Available types (comma-separated IDs)</Label>
              <Input
                value={(formConfig.availableTypes ?? []).join(', ')}
                onChange={(e) => updateConfig({ availableTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="e.g. type1, type2"
                className="max-w-md"
              />
            </div>
            <div>
              <Label className="mb-1">Default active types (§1.2.1): drag to reorder</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Order defines default for new tenants. Drag items to reorder; use Add to append IDs.
              </p>
              <ul className="space-y-1 max-w-md mb-2">
                {defaultActiveTypesList.length === 0 ? (
                  <li className="text-sm text-gray-500 dark:text-gray-400 py-2">No default types. Add IDs below.</li>
                ) : (
                  defaultActiveTypesList.map((id) => (
                    <li
                      key={id}
                      draggable
                      onDragStart={(e) => handleDefaultTypesDragStart(e, id)}
                      onDragEnd={handleDefaultTypesDragEnd}
                      onDragOver={(e) => handleDefaultTypesDragOver(e, id)}
                      onDragLeave={() => setDefaultTypesDropTargetId(null)}
                      onDrop={(e) => handleDefaultTypesDrop(e, id)}
                      className={`flex items-center gap-2 rounded border px-3 py-2 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
                        defaultTypesDragId === id ? 'opacity-50' : ''
                      } ${defaultTypesDropTargetId === id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                      aria-label={`Type ${id}. Drag to reorder.`}
                    >
                      <span className="flex-1 font-mono text-gray-800 dark:text-gray-200">{id}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs h-auto py-0"
                        onClick={() => removeDefaultActiveType(id)}
                        aria-label={`Remove ${id}`}
                      >
                        Remove
                      </Button>
                    </li>
                  ))
                )}
              </ul>
              <div className="flex gap-2 items-center max-w-md">
                <Input
                  value={addTypeInput}
                  onChange={(e) => setAddTypeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDefaultActiveTypes())}
                  placeholder="Add type ID(s), comma-separated"
                  className="flex-1 text-sm"
                  aria-label="Add type IDs"
                />
                <Button type="button" variant="outline" size="sm" onClick={addDefaultActiveTypes}>
                  Add
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium mb-2">Pattern detection (§1.2.2)</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="patternEnabled"
                    checked={pd.enabled}
                    onCheckedChange={(c) => updatePattern({ enabled: !!c })}
                  />
                  <Label htmlFor="patternEnabled" className="text-sm cursor-pointer">Enabled</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min sample size</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pd.minSampleSize}
                    onChange={(e) => updatePattern({ minSampleSize: parseInt(e.target.value, 10) || 1 })}
                    className="max-w-xs text-sm"
                  />
                  <Label className="text-xs text-muted-foreground mt-1 block">Min sample size (slider §1.2.2)</Label>
                  <input
                    type="range"
                    min={1}
                    max={200}
                    value={Math.max(1, Math.min(200, pd.minSampleSize))}
                    onChange={(e) => updatePattern({ minSampleSize: parseInt(e.target.value, 10) || 1 })}
                    className="w-full max-w-xs h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600"
                    aria-label="Min sample size slider"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">1 – 200</span>
                </div>
                <div className="grid grid-cols-3 gap-2 max-w-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ignore rate (0–1)</Label>
                    <Input
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
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Action rate (0–1)</Label>
                    <Input
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
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Sentiment threshold (0–1)</Label>
                    <Input
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
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Preview of pattern detection logic (§1.2.2)</span>
                  <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-400 list-disc list-inside">
                    <li>Require at least {pd.minSampleSize} feedback events before applying pattern rules.</li>
                    <li>If ignore rate &gt; {(pd.thresholds.ignoreRate * 100).toFixed(0)}%, suppress recommendation.</li>
                    <li>If action rate &lt; {(pd.thresholds.actionRate * 100).toFixed(0)}%, flag for review.</li>
                    <li>If average sentiment &lt; {(pd.thresholds.sentimentThreshold * 100).toFixed(0)}%, flag recommendation.</li>
                    {pd.autoSuppressEnabled && <li>Auto-suppress recommendations when patterns match.</li>}
                    {pd.autoBoostEnabled && <li>Auto-boost recommendations when patterns match.</li>}
                    {pd.notifyOnPattern && <li>Notify admins of detected patterns ({pd.patternReportFrequency}).</li>}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="autoSuppress"
                      checked={pd.autoSuppressEnabled}
                      onCheckedChange={(c) => updatePattern({ autoSuppressEnabled: !!c })}
                    />
                    <Label htmlFor="autoSuppress" className="text-sm cursor-pointer">Auto-suppress based on patterns</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="autoBoost"
                      checked={pd.autoBoostEnabled}
                      onCheckedChange={(c) => updatePattern({ autoBoostEnabled: !!c })}
                    />
                    <Label htmlFor="autoBoost" className="text-sm cursor-pointer">Auto-boost based on patterns</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notifyOnPattern"
                      checked={pd.notifyOnPattern}
                      onCheckedChange={(c) => updatePattern({ notifyOnPattern: !!c })}
                    />
                    <Label htmlFor="notifyOnPattern" className="text-sm cursor-pointer">Notify admins of detected patterns</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Pattern report frequency</Label>
                  <Select
                    value={pd.patternReportFrequency}
                    onValueChange={(v) => updatePattern({ patternReportFrequency: v as PatternReportFrequency })}
                  >
                    <SelectTrigger className="max-w-xs text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPatternTestModalOpen(true)}
                    title="Run pattern detection against historical feedback data (§1.2.2)"
                  >
                    Test with historical data (§1.2.2)
                  </Button>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium mb-2">Feedback collection (§1.2.3)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Defaults for requirement, comments, multi-select, editing, and privacy. Hover labels for help (§1.2.3).
              </p>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requireFeedback"
                      checked={fc.requireFeedback}
                      onCheckedChange={(c) => updateFeedbackCollection({ requireFeedback: !!c })}
                    />
                    <Label htmlFor="requireFeedback" className="text-sm cursor-help" title="When enabled, users must submit feedback on recommendations (e.g. after viewing).">Require feedback</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground cursor-help" title="Require feedback after this many days since recommendation was shown (0 = immediately).">Require after (days)</span>
                    <Input
                      type="number"
                      min={0}
                      value={fc.requireFeedbackAfterDays}
                      onChange={(e) => updateFeedbackCollection({ requireFeedbackAfterDays: parseInt(e.target.value, 10) || 0 })}
                      className="w-20 text-sm h-8"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allowComments"
                      checked={fc.allowComments}
                      onCheckedChange={(c) => updateFeedbackCollection({ allowComments: !!c })}
                    />
                    <Label htmlFor="allowComments" className="text-sm cursor-help" title="Users can add a free-text comment with their feedback.">Allow comments</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground cursor-help" title="Maximum character length for feedback comments.">Max comment length</span>
                    <Input
                      type="number"
                      min={1}
                      value={fc.maxCommentLength}
                      onChange={(e) => updateFeedbackCollection({ maxCommentLength: parseInt(e.target.value, 10) || 500 })}
                      className="w-24 text-sm h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="moderateComments"
                      checked={fc.moderateComments}
                      onCheckedChange={(c) => updateFeedbackCollection({ moderateComments: !!c })}
                    />
                    <Label htmlFor="moderateComments" className="text-sm cursor-help" title="Comments are held for review before being stored or visible.">Moderate comments</Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allowMultipleSelection"
                      checked={fc.allowMultipleSelection}
                      onCheckedChange={(c) => updateFeedbackCollection({ allowMultipleSelection: !!c })}
                    />
                    <Label htmlFor="allowMultipleSelection" className="text-sm cursor-help" title="Users can select more than one feedback type per recommendation (e.g. helpful + will act).">Allow multiple selection</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground cursor-help" title="When multiple selection is allowed, maximum number of types per feedback.">Max selections per feedback</span>
                    <Input
                      type="number"
                      min={1}
                      value={fc.maxSelectionsPerFeedback}
                      onChange={(e) => updateFeedbackCollection({ maxSelectionsPerFeedback: parseInt(e.target.value, 10) || 1 })}
                      className="w-20 text-sm h-8"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allowFeedbackEdit"
                      checked={fc.allowFeedbackEdit}
                      onCheckedChange={(c) => updateFeedbackCollection({ allowFeedbackEdit: !!c })}
                    />
                    <Label htmlFor="allowFeedbackEdit" className="text-sm cursor-help" title="Users can change their feedback within the edit window.">Allow feedback edit</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground cursor-help" title="Number of days after submission during which feedback can be edited.">Edit window (days)</span>
                    <Input
                      type="number"
                      min={0}
                      value={fc.editWindowDays}
                      onChange={(e) => updateFeedbackCollection({ editWindowDays: parseInt(e.target.value, 10) || 0 })}
                      className="w-20 text-sm h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trackFeedbackHistory"
                      checked={fc.trackFeedbackHistory}
                      onCheckedChange={(c) => updateFeedbackCollection({ trackFeedbackHistory: !!c })}
                    />
                    <Label htmlFor="trackFeedbackHistory" className="text-sm cursor-help" title="Store a history of changes when feedback is edited (for audit and analytics).">Track feedback history</Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allowAnonymousFeedback"
                      checked={fc.allowAnonymousFeedback}
                      onCheckedChange={(c) => updateFeedbackCollection({ allowAnonymousFeedback: !!c })}
                    />
                    <Label htmlFor="allowAnonymousFeedback" className="text-sm cursor-help" title="Users can submit feedback without their identity being stored.">Allow anonymous feedback</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="anonymousForNegative"
                      checked={fc.anonymousForNegative}
                      onCheckedChange={(c) => updateFeedbackCollection({ anonymousForNegative: !!c })}
                    />
                    <Label htmlFor="anonymousForNegative" className="text-sm cursor-help" title="Only negative feedback can be submitted anonymously; other feedback requires identity.">Anonymous for negative only</Label>
                  </div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm mt-3 space-y-3">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Preview of feedback UI with current settings (§1.2.3)</span>
                  {/* Visual mock: how the feedback widget looks to end users */}
                  <div className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 max-w-md" aria-label="Preview of feedback widget as seen by users">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sample recommendation</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">Review account health for Acme Corp</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your feedback {fc.requireFeedback ? `(required after ${fc.requireFeedbackAfterDays} day${fc.requireFeedbackAfterDays === 1 ? '' : 's'})` : '(optional)'}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Array.from({ length: Math.min(formConfig.defaultLimit ?? 5, 5) }, (_, i) => (
                        <Button
                          key={i}
                          type="button"
                          disabled
                          variant="outline"
                          size="sm"
                          className="text-xs pointer-events-none"
                          aria-hidden
                        >
                          {['Helpful', 'Will act', 'Not relevant', 'Dismiss', 'Other'][i]}
                        </Button>
                      ))}
                      {(formConfig.defaultLimit ?? 5) > 5 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">+{(formConfig.defaultLimit ?? 5) - 5} more</span>
                      )}
                    </div>
                    {fc.allowMultipleSelection && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pick up to {fc.maxSelectionsPerFeedback} option{fc.maxSelectionsPerFeedback === 1 ? '' : 's'}</p>
                    )}
                    {fc.allowComments && (
                      <div className="mt-2">
                        <Label className="text-xs text-muted-foreground mb-0.5 block">Comment (max {fc.maxCommentLength} chars)</Label>
                        <Textarea
                          readOnly
                          rows={2}
                          placeholder="Optional comment…"
                          className="text-xs resize-none bg-muted"
                          aria-hidden
                        />
                        {fc.moderateComments && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Moderated before storage</p>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {fc.allowFeedbackEdit && <span>Editable for {fc.editWindowDays} day{fc.editWindowDays === 1 ? '' : 's'}</span>}
                      {fc.allowAnonymousFeedback && <span>{fc.anonymousForNegative ? 'Anonymous for negative' : 'Can submit anonymously'}</span>}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Summary: Feedback is {fc.requireFeedback ? `required after ${fc.requireFeedbackAfterDays} days` : 'not required'}. Comments {fc.allowComments ? `allowed, max ${fc.maxCommentLength} chars` : 'not allowed'}
                    {fc.allowComments && fc.moderateComments ? ' (moderated)' : ''}. {fc.allowMultipleSelection ? `Multi-select, max ${fc.maxSelectionsPerFeedback}` : 'Single selection only'}. Edit {fc.allowFeedbackEdit ? `${fc.editWindowDays} days` : 'no'}
                    {fc.allowFeedbackEdit && fc.trackFeedbackHistory ? ', history tracked' : ''}. Anonymous {fc.allowAnonymousFeedback ? (fc.anonymousForNegative ? 'negative only' : 'yes') : 'no'}.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                type="submit"
                disabled={saving || validationErrors.length > 0}
              >
                {saving ? 'Saving…' : 'Save global config'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                onClick={handleApplyToAllTenants}
                disabled={applyingToAll}
                title="Apply current global config to all existing tenant configs (§1.2.1)"
              >
                {applyingToAll ? 'Applying…' : 'Apply to all existing tenants (§1.2.1)'}
              </Button>
            </div>
          </form>
        </section>
      )}

      {patternTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="pattern-test-modal-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 id="pattern-test-modal-title" className="text-lg font-semibold mb-4">Test with historical data (§1.2.2)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Runs pattern detection against stored feedback using current thresholds (min sample size {pd.minSampleSize}, ignore rate {(pd.thresholds.ignoreRate * 100).toFixed(0)}%, action rate {(pd.thresholds.actionRate * 100).toFixed(0)}%, sentiment threshold {(pd.thresholds.sentimentThreshold * 100).toFixed(0)}%).
            </p>
            {patternTestError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{patternTestError}</p>
            )}
            {patternTestResult && (
              <div className="mb-4 space-y-3 text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>{patternTestResult.totalFeedbackRows}</strong> feedback rows; <strong>{patternTestResult.recommendationCount}</strong> recommendations with ≥{patternTestResult.appliedThresholds.minSampleSize} samples.
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Would <strong>suppress</strong>: {patternTestResult.suppressedCount} (ignore rate &gt; {(patternTestResult.appliedThresholds.ignoreRate * 100).toFixed(0)}%). Would <strong>flag for review</strong>: {patternTestResult.flaggedCount} (low action rate or low sentiment).
                </p>
                {patternTestResult.sampleSuppressed.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Sample suppressed (up to 10)</p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                      {patternTestResult.sampleSuppressed.map((s, i) => (
                        <li key={i}>{s.recommendationId} (tenant: {s.tenantId}) — {s.feedbackCount} feedback, ignore rate {(s.ignoreRate * 100).toFixed(0)}%</li>
                      ))}
                    </ul>
                  </div>
                )}
                {patternTestResult.sampleFlagged.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Sample flagged (up to 10)</p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                      {patternTestResult.sampleFlagged.map((s, i) => (
                        <li key={i}>{s.recommendationId} (tenant: {s.tenantId}) — {s.feedbackCount} feedback, action rate {(s.actionRate * 100).toFixed(0)}%, avg sentiment {s.avgSentiment.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              {!patternTestResult && (
                <Button
                  type="button"
                  onClick={async () => {
                    if (!apiBaseUrl) return;
                    setPatternTestLoading(true);
                    setPatternTestError(null);
                    setPatternTestResult(null);
                    try {
                      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-config/test-pattern-detection`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ windowDays: 90 }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
                      setPatternTestResult(data);
                    } catch (e) {
                      setPatternTestError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setPatternTestLoading(false);
                    }
                  }}
                  disabled={patternTestLoading}
                >
                  {patternTestLoading ? 'Running…' : 'Run test'}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setPatternTestModalOpen(false); setPatternTestResult(null); setPatternTestError(null); }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
