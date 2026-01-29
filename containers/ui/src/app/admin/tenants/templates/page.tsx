/**
 * Super Admin: Tenant templates (W11 §7.2)
 * GET list, GET/PUT/DELETE by id, POST create, POST apply via /api/v1/admin/tenant-templates (recommendations).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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

interface DefaultLimits {
  maxUsers?: number;
  maxOpportunities?: number;
  maxPredictionsPerDay?: number;
  maxFeedbackPerDay?: number;
}

interface TenantTemplateRow {
  id: string;
  name: string;
  description?: string;
  feedbackConfig: {
    activeLimit: number;
    activeTypes: ActiveTypeRow[];
    requireFeedback: boolean;
    allowComments: boolean;
    commentRequired: boolean;
    allowMultipleSelection: boolean;
    patternDetection: { enabled: boolean; autoSuppressEnabled: boolean; autoBoostEnabled: boolean };
  };
  methodology?: string;
  defaultLimits?: DefaultLimits;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

function parseTenantIdsInput(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function TenantTemplatesPage() {
  const [items, setItems] = useState<TenantTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createMethodology, setCreateMethodology] = useState('');
  const [createActiveLimit, setCreateActiveLimit] = useState(5);
  const [createRequireFeedback, setCreateRequireFeedback] = useState(false);
  const [createAllowComments, setCreateAllowComments] = useState(true);
  const [createCommentRequired, setCreateCommentRequired] = useState(false);
  const [createAllowMultipleSelection, setCreateAllowMultipleSelection] = useState(false);
  const [createPatternEnabled, setCreatePatternEnabled] = useState(true);
  const [createAutoSuppressEnabled, setCreateAutoSuppressEnabled] = useState(true);
  const [createAutoBoostEnabled, setCreateAutoBoostEnabled] = useState(true);
  const [createActiveTypes, setCreateActiveTypes] = useState<ActiveTypeRow[]>([]);
  const [allFeedbackTypes, setAllFeedbackTypes] = useState<FeedbackTypeOption[]>([]);
  const [feedbackTypesLoaded, setFeedbackTypesLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const [applyTenantIdsInput, setApplyTenantIdsInput] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<{ applied: string[]; failed: { tenantId: string; error: string }[] } | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMethodology, setEditMethodology] = useState('');
  const [editActiveLimit, setEditActiveLimit] = useState(5);
  const [editRequireFeedback, setEditRequireFeedback] = useState(false);
  const [editAllowComments, setEditAllowComments] = useState(true);
  const [editCommentRequired, setEditCommentRequired] = useState(false);
  const [editAllowMultipleSelection, setEditAllowMultipleSelection] = useState(false);
  const [editPatternEnabled, setEditPatternEnabled] = useState(true);
  const [editAutoSuppressEnabled, setEditAutoSuppressEnabled] = useState(true);
  const [editAutoBoostEnabled, setEditAutoBoostEnabled] = useState(true);
  const [editActiveTypes, setEditActiveTypes] = useState<ActiveTypeRow[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [createMaxUsers, setCreateMaxUsers] = useState('');
  const [createMaxOpportunities, setCreateMaxOpportunities] = useState('');
  const [createMaxPredictionsPerDay, setCreateMaxPredictionsPerDay] = useState('');
  const [createMaxFeedbackPerDay, setCreateMaxFeedbackPerDay] = useState('');
  const [editMaxUsers, setEditMaxUsers] = useState('');
  const [editMaxOpportunities, setEditMaxOpportunities] = useState('');
  const [editMaxPredictionsPerDay, setEditMaxPredictionsPerDay] = useState('');
  const [editMaxFeedbackPerDay, setEditMaxFeedbackPerDay] = useState('');

  const fetchTemplates = useCallback(async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenant-templates`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiBaseUrl) fetchTemplates();
    else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [apiBaseUrl, fetchTemplates]);

  const loadFeedbackTypes = useCallback(async () => {
    if (!apiBaseUrl || feedbackTypesLoaded) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAllFeedbackTypes(Array.isArray(json) ? json : []);
      setFeedbackTypesLoaded(true);
    } catch {
      setAllFeedbackTypes([]);
    }
  }, [apiBaseUrl, feedbackTypesLoaded]);

  const handleOpenCreate = useCallback(() => {
    setShowCreate(true);
    setCreateError(null);
    setCreateName('');
    setCreateDescription('');
    setCreateMethodology('');
    setCreateActiveLimit(5);
    setCreateRequireFeedback(false);
    setCreateAllowComments(true);
    setCreateCommentRequired(false);
    setCreateAllowMultipleSelection(false);
    setCreatePatternEnabled(true);
    setCreateAutoSuppressEnabled(true);
    setCreateAutoBoostEnabled(true);
    setCreateActiveTypes([]);
    setCreateMaxUsers('');
    setCreateMaxOpportunities('');
    setCreateMaxPredictionsPerDay('');
    setCreateMaxFeedbackPerDay('');
    loadFeedbackTypes();
  }, [loadFeedbackTypes]);

  const handleCreateSubmit = useCallback(async () => {
    if (!apiBaseUrl || !createName.trim()) {
      setCreateError('Name is required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    const defaultLimits: DefaultLimits = {};
    const cu = parseInt(createMaxUsers, 10);
    const co = parseInt(createMaxOpportunities, 10);
    const cp = parseInt(createMaxPredictionsPerDay, 10);
    const cf = parseInt(createMaxFeedbackPerDay, 10);
    if (Number.isFinite(cu) && cu > 0) defaultLimits.maxUsers = cu;
    if (Number.isFinite(co) && co > 0) defaultLimits.maxOpportunities = co;
    if (Number.isFinite(cp) && cp > 0) defaultLimits.maxPredictionsPerDay = cp;
    if (Number.isFinite(cf) && cf > 0) defaultLimits.maxFeedbackPerDay = cf;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenant-templates`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || undefined,
          methodology: createMethodology.trim() || undefined,
          feedbackConfig: {
            activeLimit: createActiveLimit,
            activeTypes: createActiveTypes,
            requireFeedback: createRequireFeedback,
            allowComments: createAllowComments,
            commentRequired: createCommentRequired,
            allowMultipleSelection: createAllowMultipleSelection,
            patternDetection: {
              enabled: createPatternEnabled,
              autoSuppressEnabled: createAutoSuppressEnabled,
              autoBoostEnabled: createAutoBoostEnabled,
            },
          },
          ...(Object.keys(defaultLimits).length > 0 ? { defaultLimits } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error?.message ?? body?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      await fetchTemplates();
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }, [
    apiBaseUrl,
    createName,
    createDescription,
    createMethodology,
    createActiveLimit,
    createRequireFeedback,
    createAllowComments,
    createCommentRequired,
    createAllowMultipleSelection,
    createPatternEnabled,
    createAutoSuppressEnabled,
    createAutoBoostEnabled,
    createActiveTypes,
    createMaxUsers,
    createMaxOpportunities,
    createMaxPredictionsPerDay,
    createMaxFeedbackPerDay,
    fetchTemplates,
  ]);

  const handleApply = useCallback(
    async (templateId: string) => {
      if (!apiBaseUrl) return;
      const tenantIds = parseTenantIdsInput(applyTenantIdsInput);
      if (tenantIds.length === 0) {
        setApplyError('Enter at least one tenant ID (one per line or comma-separated).');
        return;
      }
      setApplyLoading(true);
      setApplyError(null);
      setApplyResult(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/admin/tenant-templates/${encodeURIComponent(templateId)}/apply`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantIds }),
          }
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error('Template not found');
          const body = await res.json().catch(() => ({}));
          const msg = body?.error?.message ?? body?.message ?? `HTTP ${res.status}`;
          throw new Error(msg);
        }
        const result = await res.json();
        setApplyResult(result);
        setApplyTenantIdsInput('');
      } catch (e) {
        setApplyError(e instanceof Error ? e.message : String(e));
      } finally {
        setApplyLoading(false);
      }
    },
    [apiBaseUrl, applyTenantIdsInput]
  );

  const openApply = useCallback((templateId: string) => {
    setApplyTemplateId(templateId);
    setApplyTenantIdsInput('');
    setApplyResult(null);
    setApplyError(null);
  }, []);

  const fetchOne = useCallback(async (templateId: string): Promise<TenantTemplateRow | null> => {
    if (!apiBaseUrl) return null;
    const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenant-templates/${encodeURIComponent(templateId)}`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }, []);

  const openEdit = useCallback(
    async (row: TenantTemplateRow) => {
      loadFeedbackTypes();
      const one = await fetchOne(row.id);
      if (!one) {
        setError('Failed to load template');
        return;
      }
      const fc = one.feedbackConfig;
      setEditName(one.name ?? '');
      setEditDescription(one.description ?? '');
      setEditMethodology(one.methodology ?? '');
      setEditActiveLimit(fc?.activeLimit ?? 5);
      setEditRequireFeedback(fc?.requireFeedback ?? false);
      setEditAllowComments(fc?.allowComments ?? true);
      setEditCommentRequired(fc?.commentRequired ?? false);
      setEditAllowMultipleSelection(fc?.allowMultipleSelection ?? false);
      setEditPatternEnabled(fc?.patternDetection?.enabled ?? true);
      setEditAutoSuppressEnabled(fc?.patternDetection?.autoSuppressEnabled ?? true);
      setEditAutoBoostEnabled(fc?.patternDetection?.autoBoostEnabled ?? true);
      setEditActiveTypes(fc?.activeTypes ?? []);
      const dl = one.defaultLimits;
      setEditMaxUsers(dl?.maxUsers != null ? String(dl.maxUsers) : '');
      setEditMaxOpportunities(dl?.maxOpportunities != null ? String(dl.maxOpportunities) : '');
      setEditMaxPredictionsPerDay(dl?.maxPredictionsPerDay != null ? String(dl.maxPredictionsPerDay) : '');
      setEditMaxFeedbackPerDay(dl?.maxFeedbackPerDay != null ? String(dl.maxFeedbackPerDay) : '');
      setEditId(one.id);
      setEditError(null);
    },
    [fetchOne, loadFeedbackTypes]
  );

  const handleUpdateSubmit = useCallback(async () => {
    if (!apiBaseUrl || !editId) return;
    setEditSaving(true);
    setEditError(null);
    const defaultLimits: DefaultLimits = {};
    const eu = parseInt(editMaxUsers, 10);
    const eo = parseInt(editMaxOpportunities, 10);
    const ep = parseInt(editMaxPredictionsPerDay, 10);
    const ef = parseInt(editMaxFeedbackPerDay, 10);
    if (Number.isFinite(eu) && eu > 0) defaultLimits.maxUsers = eu;
    if (Number.isFinite(eo) && eo > 0) defaultLimits.maxOpportunities = eo;
    if (Number.isFinite(ep) && ep > 0) defaultLimits.maxPredictionsPerDay = ep;
    if (Number.isFinite(ef) && ef > 0) defaultLimits.maxFeedbackPerDay = ef;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenant-templates/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          methodology: editMethodology.trim() || undefined,
          feedbackConfig: {
            activeLimit: editActiveLimit,
            activeTypes: editActiveTypes,
            requireFeedback: editRequireFeedback,
            allowComments: editAllowComments,
            commentRequired: editCommentRequired,
            allowMultipleSelection: editAllowMultipleSelection,
            patternDetection: {
              enabled: editPatternEnabled,
              autoSuppressEnabled: editAutoSuppressEnabled,
              autoBoostEnabled: editAutoBoostEnabled,
            },
          },
          defaultLimits: Object.keys(defaultLimits).length > 0 ? defaultLimits : {},
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error?.message ?? body?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      await fetchTemplates();
      setEditId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setEditSaving(false);
    }
  }, [
    apiBaseUrl,
    editId,
    editName,
    editDescription,
    editMethodology,
    editActiveLimit,
    editRequireFeedback,
    editAllowComments,
    editCommentRequired,
    editAllowMultipleSelection,
    editPatternEnabled,
    editAutoSuppressEnabled,
    editAutoBoostEnabled,
    editActiveTypes,
    editMaxUsers,
    editMaxOpportunities,
    editMaxPredictionsPerDay,
    editMaxFeedbackPerDay,
    fetchTemplates,
  ]);

  const handleDelete = useCallback(
    async (templateId: string) => {
      if (!apiBaseUrl) return;
      if (!window.confirm('Delete this tenant template? This cannot be undone.')) return;
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenant-templates/${encodeURIComponent(templateId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error?.message ?? body?.message ?? `HTTP ${res.status}`;
          throw new Error(msg);
        }
        await fetchTemplates();
        if (applyTemplateId === templateId) {
          setApplyTemplateId(null);
          setApplyTenantIdsInput('');
          setApplyResult(null);
          setApplyError(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [apiBaseUrl, fetchTemplates, applyTemplateId]
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
        <Link href="/admin/tenants" className="text-sm font-medium hover:underline">
          Tenants
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Tenant Templates</h1>
      <p className="text-muted-foreground mb-6">
        Create and apply tenant templates (methodology, feedback config, limits). Applying overwrites the tenant’s feedback config with the template’s.
      </p>

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
          <Link href="/admin/tenants/list" className="text-sm font-medium text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Tenant Management
          </Link>
        </div>
      )}

      {apiBaseUrl && (
        <>
          <div className="mb-4 flex gap-4">
            <button
              type="button"
              onClick={fetchTemplates}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Create template
            </button>
            <Link
              href="/admin/tenants"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline self-center"
            >
              ← Back to Tenant Management
            </Link>
          </div>

          {showCreate && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Create template</h2>
              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Technology Startup"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Methodology</label>
                  <input
                    type="text"
                    value={createMethodology}
                    onChange={(e) => setCreateMethodology(e.target.value)}
                    placeholder="e.g. MEDDIC, Challenger"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={creating}
                  />
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default limits (optional)</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Leave empty for no limit.</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max users</label>
                      <input
                        type="number"
                        min={0}
                        value={createMaxUsers}
                        onChange={(e) => setCreateMaxUsers(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max opportunities</label>
                      <input
                        type="number"
                        min={0}
                        value={createMaxOpportunities}
                        onChange={(e) => setCreateMaxOpportunities(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max predictions/day</label>
                      <input
                        type="number"
                        min={0}
                        value={createMaxPredictionsPerDay}
                        onChange={(e) => setCreateMaxPredictionsPerDay(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max feedback/day</label>
                      <input
                        type="number"
                        min={0}
                        value={createMaxFeedbackPerDay}
                        onChange={(e) => setCreateMaxFeedbackPerDay(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={creating}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Active limit</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={createActiveLimit}
                    onChange={(e) => setCreateActiveLimit(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={creating}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createRequireFeedback"
                    checked={createRequireFeedback}
                    onChange={(e) => setCreateRequireFeedback(e.target.checked)}
                    disabled={creating}
                    className="rounded"
                  />
                  <label htmlFor="createRequireFeedback" className="text-sm">Require feedback</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createAllowComments"
                    checked={createAllowComments}
                    onChange={(e) => setCreateAllowComments(e.target.checked)}
                    disabled={creating}
                    className="rounded"
                  />
                  <label htmlFor="createAllowComments" className="text-sm">Allow comments</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createCommentRequired"
                    checked={createCommentRequired}
                    onChange={(e) => setCreateCommentRequired(e.target.checked)}
                    disabled={creating}
                    className="rounded"
                  />
                  <label htmlFor="createCommentRequired" className="text-sm">Comment required</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createAllowMultipleSelection"
                    checked={createAllowMultipleSelection}
                    onChange={(e) => setCreateAllowMultipleSelection(e.target.checked)}
                    disabled={creating}
                    className="rounded"
                  />
                  <label htmlFor="createAllowMultipleSelection" className="text-sm">Allow multiple selection</label>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pattern detection</span>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      id="createPatternEnabled"
                      checked={createPatternEnabled}
                      onChange={(e) => setCreatePatternEnabled(e.target.checked)}
                      disabled={creating}
                      className="rounded"
                    />
                    <label htmlFor="createPatternEnabled" className="text-sm">Enabled</label>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      id="createAutoSuppressEnabled"
                      checked={createAutoSuppressEnabled}
                      onChange={(e) => setCreateAutoSuppressEnabled(e.target.checked)}
                      disabled={creating}
                      className="rounded"
                    />
                    <label htmlFor="createAutoSuppressEnabled" className="text-sm">Auto suppress enabled</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="createAutoBoostEnabled"
                      checked={createAutoBoostEnabled}
                      onChange={(e) => setCreateAutoBoostEnabled(e.target.checked)}
                      disabled={creating}
                      className="rounded"
                    />
                    <label htmlFor="createAutoBoostEnabled" className="text-sm">Auto boost enabled</label>
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active types</span>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 dark:bg-gray-800 dark:border-gray-700 space-y-1.5 text-sm mb-2">
                    {createActiveTypes.map((a, idx) => {
                      const ft = allFeedbackTypes.find((f) => f.id === a.feedbackTypeId);
                      const label = ft?.displayName ?? ft?.name ?? a.feedbackTypeId;
                      return (
                        <div key={`${a.feedbackTypeId}-${idx}`} className="flex items-center justify-between gap-2">
                          <span>{label}</span>
                          <span className="text-gray-500">(order: {a.order})</span>
                          <button
                            type="button"
                            onClick={() => setCreateActiveTypes((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={creating}
                            className="text-red-600 hover:underline text-xs disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    {createActiveTypes.length === 0 && <p className="text-gray-500">No active types.</p>}
                  </div>
                  {allFeedbackTypes.filter((ft) => !createActiveTypes.some((a) => a.feedbackTypeId === ft.id)).length > 0 && (
                    <div className="flex gap-2 items-center">
                      <select
                        value=""
                        onChange={(e) => {
                          const fid = e.target.value;
                          if (!fid) return;
                          const maxOrder =
                            createActiveTypes.length > 0 ? Math.max(...createActiveTypes.map((a) => a.order), 0) : 0;
                          setCreateActiveTypes((prev) => [...prev, { feedbackTypeId: fid, order: maxOrder + 1 }]);
                          e.target.value = '';
                        }}
                        disabled={creating}
                        className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      >
                        <option value="">Add type…</option>
                        {allFeedbackTypes
                          .filter((ft) => !createActiveTypes.some((a) => a.feedbackTypeId === ft.id))
                          .map((ft) => (
                            <option key={ft.id} value={ft.id}>
                              {ft.displayName ?? ft.name ?? ft.id}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateSubmit}
                    disabled={creating}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {editId && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Edit template</h2>
              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Technology Startup"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Methodology</label>
                  <input
                    type="text"
                    value={editMethodology}
                    onChange={(e) => setEditMethodology(e.target.value)}
                    placeholder="e.g. MEDDIC, Challenger"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={editSaving}
                  />
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default limits (optional)</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Leave empty for no limit.</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max users</label>
                      <input
                        type="number"
                        min={0}
                        value={editMaxUsers}
                        onChange={(e) => setEditMaxUsers(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={editSaving}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max opportunities</label>
                      <input
                        type="number"
                        min={0}
                        value={editMaxOpportunities}
                        onChange={(e) => setEditMaxOpportunities(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={editSaving}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max predictions/day</label>
                      <input
                        type="number"
                        min={0}
                        value={editMaxPredictionsPerDay}
                        onChange={(e) => setEditMaxPredictionsPerDay(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={editSaving}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Max feedback/day</label>
                      <input
                        type="number"
                        min={0}
                        value={editMaxFeedbackPerDay}
                        onChange={(e) => setEditMaxFeedbackPerDay(e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        disabled={editSaving}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Active limit</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editActiveLimit}
                    onChange={(e) => setEditActiveLimit(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    disabled={editSaving}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editRequireFeedback"
                    checked={editRequireFeedback}
                    onChange={(e) => setEditRequireFeedback(e.target.checked)}
                    disabled={editSaving}
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
                    disabled={editSaving}
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
                    disabled={editSaving}
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
                    disabled={editSaving}
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
                      disabled={editSaving}
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
                      disabled={editSaving}
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
                      disabled={editSaving}
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
                            disabled={editSaving}
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
                        disabled={editSaving}
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
                {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpdateSubmit}
                    disabled={editSaving}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditId(null); setEditError(null); }}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    disabled={editSaving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
              <button
                type="button"
                onClick={fetchTemplates}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Templates</h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No templates yet. Create one to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-800">
                        <th className="text-left py-2 px-4">Name</th>
                        <th className="text-left py-2 px-4">Description</th>
                        <th className="text-left py-2 px-4">Methodology</th>
                        <th className="text-left py-2 px-4">Created</th>
                        <th className="text-left py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="py-2 px-4">{row.name}</td>
                          <td className="py-2 px-4">{row.description ?? '—'}</td>
                          <td className="py-2 px-4">{row.methodology ?? '—'}</td>
                          <td className="py-2 px-4">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                          <td className="py-2 px-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openApply(row.id)}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row.id)}
                                className="text-red-600 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {applyTemplateId && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
              <h2 className="text-lg font-semibold mb-3">Apply template to tenants</h2>
              <p className="text-sm text-gray-500 mb-2">
                Template ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{applyTemplateId}</code>
              </p>
              <p className="text-sm text-gray-500 mb-3">
                Enter tenant IDs (one per line or comma-separated). Applying overwrites each tenant’s feedback config with this template’s.
              </p>
              <textarea
                value={applyTenantIdsInput}
                onChange={(e) => setApplyTenantIdsInput(e.target.value)}
                placeholder="e.g. tenant-1, tenant-2 (comma or newline)"
                rows={4}
                className="w-full max-w-md px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm font-mono"
                disabled={applyLoading}
              />
              {applyError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{applyError}</p>}
              {applyResult && (
                <div className="mt-3 text-sm">
                  <p className="font-medium text-green-600 dark:text-green-400">
                    Applied to: {applyResult.applied.length} tenant(s)
                    {applyResult.applied.length > 0 && ` — ${applyResult.applied.join(', ')}`}
                  </p>
                  {applyResult.failed.length > 0 && (
                    <p className="font-medium text-amber-600 dark:text-amber-400 mt-1">
                      Failed: {applyResult.failed.map((f) => `${f.tenantId}: ${f.error}`).join('; ')}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleApply(applyTemplateId)}
                  disabled={applyLoading}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {applyLoading ? 'Applying…' : 'Apply'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApplyTemplateId(null);
                    setApplyTenantIdsInput('');
                    setApplyResult(null);
                    setApplyError(null);
                  }}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  disabled={applyLoading}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
