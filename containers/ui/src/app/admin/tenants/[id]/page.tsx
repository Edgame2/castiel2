/**
 * Super Admin: Tenant detail (§7.1.2)
 * Tabbed interface: Overview, Feedback Configuration, Catalog, Methodology, Limits & Quotas, Custom Config, Analytics.
 * GET/PUT /api/v1/admin/tenants/:tenantId/feedback-config via gateway (recommendations).
 */

'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type TenantDetailTab = 'overview' | 'feedback' | 'catalog' | 'methodology' | 'limits' | 'custom' | 'analytics';

const TENANT_DETAIL_TABS: { id: TenantDetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'feedback', label: 'Feedback Configuration' },
  { id: 'catalog', label: 'Catalog Configuration' },
  { id: 'methodology', label: 'Methodology Configuration' },
  { id: 'limits', label: 'Limits & Quotas' },
  { id: 'custom', label: 'Custom Configuration' },
  { id: 'analytics', label: 'Analytics' },
];

interface ActiveTypeRow {
  feedbackTypeId: string;
  customLabel?: string;
  order: number;
}

interface FeedbackTypeOption {
  id: string;
  name?: string;
  displayName?: string;
}

interface TenantFeedbackConfig {
  id?: string;
  tenantId?: string;
  activeLimit?: number;
  activeTypes?: ActiveTypeRow[];
  perTypeConfig?: Record<string, { recommendationType: string; activeTypes: string[] }>;
  requireFeedback?: boolean;
  allowComments?: boolean;
  commentRequired?: boolean;
  allowMultipleSelection?: boolean;
  patternDetection?: { enabled?: boolean; autoSuppressEnabled?: boolean; autoBoostEnabled?: boolean };
  updatedAt?: string;
  updatedBy?: string;
}

interface GlobalLimits {
  defaultLimit: number;
  minLimit: number;
  maxLimit: number;
}

interface TenantOverview {
  id: string;
  name?: string | null;
  industry?: string | null;
  status?: string | null;
  createdAt?: string | null;
  activeUsers?: number | null;
  activeOpportunities?: number | null;
}

export default function TenantDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [config, setConfig] = useState<TenantFeedbackConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overviewTenant, setOverviewTenant] = useState<TenantOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editActiveLimit, setEditActiveLimit] = useState(5);
  const [editRequireFeedback, setEditRequireFeedback] = useState(false);
  const [editAllowComments, setEditAllowComments] = useState(true);
  const [editCommentRequired, setEditCommentRequired] = useState(false);
  const [editAllowMultipleSelection, setEditAllowMultipleSelection] = useState(false);
  const [editPatternEnabled, setEditPatternEnabled] = useState(true);
  const [editAutoSuppressEnabled, setEditAutoSuppressEnabled] = useState(true);
  const [editAutoBoostEnabled, setEditAutoBoostEnabled] = useState(true);
  const [editActiveTypes, setEditActiveTypes] = useState<ActiveTypeRow[]>([]);
  const [allFeedbackTypes, setAllFeedbackTypes] = useState<FeedbackTypeOption[]>([]);
  const [feedbackTypesLoading, setFeedbackTypesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [globalLimits, setGlobalLimits] = useState<GlobalLimits | null>(null);
  const [useGlobalDefaultLimit, setUseGlobalDefaultLimit] = useState(true);
  const [activeTab, setActiveTab] = useState<TenantDetailTab>('overview');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'feedback') setActiveTab('feedback');
  }, [searchParams]);

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl || !id.trim()) return;
    setLoading(true);
    setError(null);
    setConfig(null);
    const encoded = encodeURIComponent(id.trim());
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/admin/tenants/${encoded}/feedback-config`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        if (res.status === 404) throw new Error('Not found');
        throw new Error(`HTTP ${res.status}`);
      }
      const json: TenantFeedbackConfig = await res.json();
      setConfig(json);
      setEditActiveLimit(json.activeLimit ?? 5);
      setEditRequireFeedback(json.requireFeedback ?? false);
      setEditAllowComments(json.allowComments ?? true);
      setEditCommentRequired(json.commentRequired ?? false);
      setEditAllowMultipleSelection(json.allowMultipleSelection ?? false);
      setEditPatternEnabled(json.patternDetection?.enabled ?? true);
      setEditAutoSuppressEnabled(json.patternDetection?.autoSuppressEnabled ?? true);
      setEditAutoBoostEnabled(json.patternDetection?.autoBoostEnabled ?? true);
      try {
        const [ftRes, globalRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/admin/feedback-types`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/admin/feedback-config`, { credentials: 'include' }),
        ]);
        if (ftRes.ok) {
          const ftJson = await ftRes.json();
          setAllFeedbackTypes(Array.isArray(ftJson) ? ftJson : []);
        }
        if (globalRes.ok) {
          const globalJson = await globalRes.json();
          const def = globalJson.defaultLimit ?? 5;
          const min = globalJson.minLimit ?? 3;
          const max = globalJson.maxLimit ?? 10;
          setGlobalLimits({ defaultLimit: def, minLimit: min, maxLimit: max });
          setUseGlobalDefaultLimit((json.activeLimit ?? def) === def);
        } else {
          setGlobalLimits({ defaultLimit: 5, minLimit: 3, maxLimit: 10 });
        }
      } catch {
        setGlobalLimits({ defaultLimit: 5, minLimit: 3, maxLimit: 10 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchOverview = useCallback(async () => {
    if (!apiBaseUrl || !id.trim()) return;
    setOverviewLoading(true);
    setOverviewError(null);
    setOverviewTenant(null);
    const encoded = encodeURIComponent(id.trim());
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenants/${encoded}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TenantOverview = await res.json();
      setOverviewTenant(json);
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : String(e));
      setOverviewTenant(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id.trim()) fetchConfig();
  }, [id, fetchConfig]);

  useEffect(() => {
    if (id.trim() && apiBaseUrl) fetchOverview();
  }, [id, apiBaseUrl, fetchOverview]);

  const saveConfig = useCallback(async () => {
    if (!apiBaseUrl || !id.trim()) return;
    const limits = globalLimits ?? { defaultLimit: 5, minLimit: 3, maxLimit: 10 };
    const effectiveLimit = useGlobalDefaultLimit ? limits.defaultLimit : Math.min(limits.maxLimit, Math.max(limits.minLimit, editActiveLimit));
    setSaving(true);
    setSaveError(null);
    const encoded = encodeURIComponent(id.trim());
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/admin/tenants/${encoded}/feedback-config`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activeLimit: effectiveLimit,
            requireFeedback: editRequireFeedback,
            allowComments: editAllowComments,
            commentRequired: editCommentRequired,
            allowMultipleSelection: editAllowMultipleSelection,
            patternDetection: {
              enabled: editPatternEnabled,
              autoSuppressEnabled: editAutoSuppressEnabled,
              autoBoostEnabled: editAutoBoostEnabled,
            },
            activeTypes: editActiveTypes,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body?.error === 'string' ? body.error : typeof body?.message === 'string' ? body.message : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const json: TenantFeedbackConfig = await res.json();
      setConfig(json);
      const savedLimit = json.activeLimit ?? limits.defaultLimit;
      setEditActiveLimit(savedLimit);
      setUseGlobalDefaultLimit(savedLimit === limits.defaultLimit);
      setEditRequireFeedback(json.requireFeedback ?? false);
      setEditAllowComments(json.allowComments ?? true);
      setEditCommentRequired(json.commentRequired ?? false);
      setEditAllowMultipleSelection(json.allowMultipleSelection ?? false);
      setEditPatternEnabled(json.patternDetection?.enabled ?? true);
      setEditAutoSuppressEnabled(json.patternDetection?.autoSuppressEnabled ?? true);
      setEditAutoBoostEnabled(json.patternDetection?.autoBoostEnabled ?? true);
      setEditActiveTypes(Array.isArray(json.activeTypes) ? json.activeTypes.map((a) => ({ ...a })) : []);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [id, globalLimits, useGlobalDefaultLimit, editActiveLimit, editRequireFeedback, editAllowComments, editCommentRequired, editAllowMultipleSelection, editPatternEnabled, editAutoSuppressEnabled, editAutoBoostEnabled, editActiveTypes]);

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
        <Link href="/admin/tenants" className="text-sm font-medium hover:underline">
          Tenant Management
        </Link>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/tenants"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/tenants/list"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Tenants
        </Link>
        <Link
          href="/admin/tenants/templates"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Templates
        </Link>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Tenant: {id || '—'}</h1>
      <p className="text-muted-foreground mb-2">
        Feedback config for this tenant (recommendations service). Part of Feedback System (Super Admin §1.3).
      </p>
      <p className="mb-6">
        <Link href="/admin/feedback" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          ← Feedback System
        </Link>
        {' · '}
        <Link href="/admin/sales-methodology" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          ← Sales Methodology
        </Link>
      </p>

      {!id.trim() && (
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-6 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Missing tenant ID. Open from Tenants list (View).</p>
          <Link href="/admin/tenants" className="text-sm font-medium text-blue-600 hover:underline mt-2 inline-block">
            Back to Tenant Management
          </Link>
        </div>
      )}

      {apiBaseUrl && id.trim() && (
        <>
          {loading && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          )}
          {error && !loading && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
              <div className="mt-2 flex gap-4">
                <button
                  type="button"
                  onClick={fetchConfig}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Retry
                </button>
                <Link href="/admin/tenants" className="text-sm font-medium text-blue-600 hover:underline">
                  Back to Tenant Management
                </Link>
              </div>
            </div>
          )}
          {!loading && !error && config && (
            <>
              <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4" role="tablist" aria-label="Tenant detail sections">
                {TENANT_DETAIL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-t border border-b-0 -mb-px ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              {activeTab === 'overview' && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4" role="tabpanel">
                  <h2 className="text-lg font-semibold mb-3">Overview (§7.1.2)</h2>
                  {overviewLoading && (
                    <p className="text-sm text-gray-500">Loading…</p>
                  )}
                  {overviewError && !overviewLoading && (
                    <div>
                      <p className="text-sm text-red-600 dark:text-red-400">Error: {overviewError}</p>
                      <button
                        type="button"
                        onClick={fetchOverview}
                        className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {overviewTenant && !overviewLoading && (
                    <dl className="text-sm space-y-2">
                      <div><dt className="font-medium text-gray-500">Tenant ID</dt><dd>{overviewTenant.id}</dd></div>
                      <div><dt className="font-medium text-gray-500">Name</dt><dd>{overviewTenant.name ?? '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Industry</dt><dd>{overviewTenant.industry ?? '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Status</dt><dd>{overviewTenant.status ?? '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Created</dt><dd>{overviewTenant.createdAt ? new Date(overviewTenant.createdAt).toLocaleString() : '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Quick stats</dt><dd>Users: {overviewTenant.activeUsers ?? '—'} · Opportunities: {overviewTenant.activeOpportunities ?? '—'}</dd></div>
                      <div><dt className="font-medium text-gray-500">Recent activity</dt><dd>—</dd></div>
                    </dl>
                  )}
                </div>
              )}
              {activeTab === 'feedback' && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4" role="tabpanel" aria-labelledby="tab-feedback">
                  <h2 className="text-lg font-semibold mb-3">Feedback config</h2>
                  {editing ? (
                <div className="space-y-3 max-w-md">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feedback limit (§1.3.1)</span>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        id="limitGlobal"
                        name="limitSource"
                        checked={useGlobalDefaultLimit}
                        onChange={() => {
                          setUseGlobalDefaultLimit(true);
                          if (globalLimits) setEditActiveLimit(globalLimits.defaultLimit);
                        }}
                        disabled={saving}
                        className="rounded"
                      />
                      <label htmlFor="limitGlobal" className="text-sm">
                        Use global default ({globalLimits?.defaultLimit ?? 5})
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="limitCustom"
                        name="limitSource"
                        checked={!useGlobalDefaultLimit}
                        onChange={() => {
                          setUseGlobalDefaultLimit(false);
                          if (globalLimits) {
                            const clamped = Math.min(globalLimits.maxLimit, Math.max(globalLimits.minLimit, editActiveLimit));
                            setEditActiveLimit(clamped);
                          }
                        }}
                        disabled={saving}
                        className="rounded"
                      />
                      <label htmlFor="limitCustom" className="text-sm">Custom limit</label>
                    </div>
                    {!useGlobalDefaultLimit && globalLimits && (
                      <div className="mt-2">
                        <input
                          type="number"
                          min={globalLimits.minLimit}
                          max={globalLimits.maxLimit}
                          value={editActiveLimit}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isNaN(v)) setEditActiveLimit(Math.min(globalLimits.maxLimit, Math.max(globalLimits.minLimit, v)));
                          }}
                          className="w-24 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                          disabled={saving}
                        />
                        <span className="ml-2 text-xs text-gray-500">({globalLimits.minLimit}–{globalLimits.maxLimit})</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editRequireFeedback"
                      checked={editRequireFeedback}
                      onChange={(e) => setEditRequireFeedback(e.target.checked)}
                      disabled={saving}
                      className="rounded"
                    />
                    <label htmlFor="editRequireFeedback" className="text-sm">Require feedback</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editAllowComments"
                      checked={editAllowComments}
                      onChange={(e) => setEditAllowComments(e.target.checked)}
                      disabled={saving}
                      className="rounded"
                    />
                    <label htmlFor="editAllowComments" className="text-sm">Allow comments</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editCommentRequired"
                      checked={editCommentRequired}
                      onChange={(e) => setEditCommentRequired(e.target.checked)}
                      disabled={saving}
                      className="rounded"
                    />
                    <label htmlFor="editCommentRequired" className="text-sm">Comment required</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editAllowMultipleSelection"
                      checked={editAllowMultipleSelection}
                      onChange={(e) => setEditAllowMultipleSelection(e.target.checked)}
                      disabled={saving}
                      className="rounded"
                    />
                    <label htmlFor="editAllowMultipleSelection" className="text-sm">Allow multiple selection</label>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pattern detection</span>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        id="editPatternEnabled"
                        checked={editPatternEnabled}
                        onChange={(e) => setEditPatternEnabled(e.target.checked)}
                        disabled={saving}
                        className="rounded"
                      />
                      <label htmlFor="editPatternEnabled" className="text-sm">Enabled</label>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        id="editAutoSuppressEnabled"
                        checked={editAutoSuppressEnabled}
                        onChange={(e) => setEditAutoSuppressEnabled(e.target.checked)}
                        disabled={saving}
                        className="rounded"
                      />
                      <label htmlFor="editAutoSuppressEnabled" className="text-sm">Auto suppress enabled</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editAutoBoostEnabled"
                        checked={editAutoBoostEnabled}
                        onChange={(e) => setEditAutoBoostEnabled(e.target.checked)}
                        disabled={saving}
                        className="rounded"
                      />
                      <label htmlFor="editAutoBoostEnabled" className="text-sm">Auto boost enabled</label>
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active types</span>
                    <div className="max-h-40 overflow-y-auto border rounded p-2 dark:bg-gray-800 dark:border-gray-700 space-y-1.5 text-sm mb-2">
                      {editActiveTypes.map((a, idx) => {
                        const ft = allFeedbackTypes.find((f) => f.id === a.feedbackTypeId);
                        const label = ft?.displayName ?? ft?.name ?? a.feedbackTypeId;
                        return (
                          <div key={`${a.feedbackTypeId}-${idx}`} className="flex items-center justify-between gap-2">
                            <span>{label}</span>
                            <span className="text-gray-500">(order: {a.order})</span>
                            <button
                              type="button"
                              onClick={() => setEditActiveTypes((prev) => prev.filter((_, i) => i !== idx))}
                              disabled={saving}
                              className="text-red-600 hover:underline text-xs disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                      {editActiveTypes.length === 0 && <p className="text-gray-500">No active types.</p>}
                    </div>
                    {allFeedbackTypes.filter((ft) => !editActiveTypes.some((a) => a.feedbackTypeId === ft.id)).length > 0 && (
                      <div className="flex gap-2 items-center">
                        <select
                          value=""
                          onChange={(e) => {
                            const fid = e.target.value;
                            if (!fid) return;
                            const maxOrder = editActiveTypes.length > 0 ? Math.max(...editActiveTypes.map((a) => a.order), 0) : 0;
                            setEditActiveTypes((prev) => [...prev, { feedbackTypeId: fid, order: maxOrder + 1 }]);
                            e.target.value = '';
                          }}
                          disabled={saving}
                          className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="">Add type…</option>
                          {allFeedbackTypes
                            .filter((ft) => !editActiveTypes.some((a) => a.feedbackTypeId === ft.id))
                            .map((ft) => (
                              <option key={ft.id} value={ft.id}>
                                {ft.displayName ?? ft.name ?? ft.id}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                  {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveConfig}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setSaveError(null);
                        const limit = config.activeLimit ?? globalLimits?.defaultLimit ?? 5;
                        setEditActiveLimit(limit);
                        setUseGlobalDefaultLimit(limit === (globalLimits?.defaultLimit ?? 5));
                        setEditRequireFeedback(config.requireFeedback ?? false);
                        setEditAllowComments(config.allowComments ?? true);
                        setEditCommentRequired(config.commentRequired ?? false);
                        setEditAllowMultipleSelection(config.allowMultipleSelection ?? false);
                        setEditPatternEnabled(config.patternDetection?.enabled ?? true);
                        setEditAutoSuppressEnabled(config.patternDetection?.autoSuppressEnabled ?? true);
                        setEditAutoBoostEnabled(config.patternDetection?.autoBoostEnabled ?? true);
                        setEditActiveTypes(config.activeTypes ? config.activeTypes.map((a) => ({ ...a })) : []);
                      }}
                      className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview (§1.3.2)</h3>
                  <dl className="text-sm space-y-2">
                    <div><dt className="font-medium text-gray-500">Active limit</dt><dd>{config.activeLimit ?? '—'}</dd></div>
                    <div>
                      <dt className="font-medium text-gray-500 mb-1">Active feedback types</dt>
                      <dd>
                        {config.activeTypes && config.activeTypes.length > 0 ? (
                          <span className="flex flex-wrap gap-1.5">
                            {config.activeTypes
                              .sort((a, b) => a.order - b.order)
                              .map((a) => {
                                const ft = allFeedbackTypes.find((f) => f.id === a.feedbackTypeId);
                                const label = ft?.displayName ?? ft?.name ?? a.feedbackTypeId;
                                return (
                                  <span
                                    key={a.feedbackTypeId}
                                    className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                          </span>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500 mb-1">Per-recommendation-type overrides</dt>
                      <dd>
                        {config.perTypeConfig && Object.keys(config.perTypeConfig).length > 0 ? (
                          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-0.5">
                            {Object.entries(config.perTypeConfig).map(([recType, val]) => (
                              <li key={recType}>
                                <span className="font-medium">{recType}</span>: {val.activeTypes?.length ?? 0} active types
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </dd>
                    </div>
                    <div><dt className="font-medium text-gray-500">Require feedback</dt><dd>{config.requireFeedback ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Allow comments</dt><dd>{config.allowComments ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Comment required</dt><dd>{config.commentRequired ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Allow multiple selection</dt><dd>{config.allowMultipleSelection ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Pattern detection</dt><dd>{config.patternDetection?.enabled ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Auto suppress</dt><dd>{config.patternDetection?.autoSuppressEnabled ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Auto boost</dt><dd>{config.patternDetection?.autoBoostEnabled ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Updated</dt><dd>{config.updatedAt ? new Date(config.updatedAt).toLocaleString() : '—'}</dd></div>
                  </dl>
                  <button
                    type="button"
                    onClick={async () => {
                      setSaveError(null);
                      setFeedbackTypesLoading(true);
                      try {
                        const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types`, { credentials: 'include' });
                        if (!res.ok) throw new Error(`Feedback types: HTTP ${res.status}`);
                        const json = await res.json();
                        setAllFeedbackTypes(Array.isArray(json) ? json : []);
                        setEditActiveTypes(config.activeTypes ? config.activeTypes.map((a) => ({ ...a })) : []);
                        setEditing(true);
                      } catch (e) {
                        setSaveError(e instanceof Error ? e.message : String(e));
                      } finally {
                        setFeedbackTypesLoading(false);
                      }
                    }}
                    disabled={feedbackTypesLoading}
                    className="mt-4 text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {feedbackTypesLoading ? 'Loading…' : 'Edit'}
                  </button>
                </>
              )}
                </div>
              )}
              {activeTab === 'catalog' && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4" role="tabpanel">
                  <h2 className="text-lg font-semibold mb-3">Catalog Configuration (§7.1.2)</h2>
                  <p className="text-sm text-gray-500">Assign catalog entries, enable/disable entries, set overrides. Not yet implemented.</p>
                </div>
              )}
              {activeTab === 'methodology' && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4" role="tabpanel">
                  <h2 className="text-lg font-semibold mb-3">Methodology Configuration (§7.1.2)</h2>
                  <p className="text-sm text-gray-500">Detailed in Section 3.2. Not yet implemented.</p>
                </div>
              )}
              {activeTab === 'limits' && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4" role="tabpanel">
                  <h2 className="text-lg font-semibold mb-3">Limits & Quotas (§7.1.2)</h2>
                  <p className="text-sm text-gray-500">Limits (maxUsers, maxOpportunities, maxPredictionsPerDay, maxFeedbackPerDay), quotas, alerts. Not yet implemented.</p>
                </div>
              )}
              {activeTab === 'custom' && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4" role="tabpanel">
                  <h2 className="text-lg font-semibold mb-3">Custom Configuration (§7.1.2)</h2>
                  <p className="text-sm text-gray-500">Risk tolerance, decision preferences, model preferences, custom features. Not yet implemented.</p>
                </div>
              )}
              {activeTab === 'analytics' && (
                <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4" role="tabpanel">
                  <h2 className="text-lg font-semibold mb-3">Analytics (§7.1.2)</h2>
                  <p className="text-sm text-gray-500">Tenant-specific analytics, usage trends, performance metrics, feedback analysis. Not yet implemented.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!apiBaseUrl && id.trim() && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}
    </div>
  );
}
