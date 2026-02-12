/**
 * Super Admin: Tenant templates (W11 §7.2)
 * GET list, GET/PUT/DELETE by id, POST create, POST apply via /api/v1/admin/tenant-templates (recommendations).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GENERIC_ERROR_MESSAGE, apiFetch, getApiBaseUrl } from '@/lib/api';

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
  /** §7.2.2 Apply Template: Select tenants from list */
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const [tenantListForPicker, setTenantListForPicker] = useState<{ id: string; name?: string | null }[]>([]);
  const [tenantPickerLoading, setTenantPickerLoading] = useState(false);
  const [tenantPickerError, setTenantPickerError] = useState<string | null>(null);
  const [selectedTenantIdsForPicker, setSelectedTenantIdsForPicker] = useState<string[]>([]);
  const selectFromListButtonRef = useRef<HTMLButtonElement>(null);
  const tenantPickerCancelButtonRef = useRef<HTMLButtonElement>(null);
  const tenantPickerWasOpenRef = useRef(false);

  const fetchTemplates = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/admin/tenant-templates');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getApiBaseUrl()) fetchTemplates();
    else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [getApiBaseUrl(), fetchTemplates]);

  /** Escape key closes Tenant Picker, then Create, Edit, or Apply panel (do not close while submitting). */
  useEffect(() => {
    const open = showTenantPicker || showCreate || editId !== null || applyTemplateId !== null;
    if (!open || creating || editSaving || applyLoading) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showTenantPicker) {
        setShowTenantPicker(false);
      } else if (applyTemplateId) {
        setApplyTemplateId(null);
        setApplyTenantIdsInput('');
        setApplyResult(null);
        setApplyError(null);
      } else if (editId) {
        setEditId(null);
        setEditError(null);
      } else if (showCreate) {
        setShowCreate(false);
        setCreateError(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showTenantPicker, showCreate, editId, applyTemplateId, creating, editSaving, applyLoading]);

  useEffect(() => {
    document.title = 'Tenant Templates | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  /** Tenant picker modal: focus Cancel when open (a11y). */
  useEffect(() => {
    if (!showTenantPicker) return;
    tenantPickerWasOpenRef.current = true;
    const id = requestAnimationFrame(() => {
      tenantPickerCancelButtonRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [showTenantPicker]);

  /** Tenant picker modal: restore focus to Select from list when closed (a11y). */
  useEffect(() => {
    if (showTenantPicker) return;
    if (!tenantPickerWasOpenRef.current) return;
    tenantPickerWasOpenRef.current = false;
    selectFromListButtonRef.current?.focus();
  }, [showTenantPicker]);

  const loadFeedbackTypes = useCallback(async () => {
    if (!getApiBaseUrl() || feedbackTypesLoaded) return;
    try {
      const res = await apiFetch('/api/v1/admin/feedback-types');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAllFeedbackTypes(Array.isArray(json) ? json : []);
      setFeedbackTypesLoaded(true);
    } catch {
      setAllFeedbackTypes([]);
    }
  }, [getApiBaseUrl(), feedbackTypesLoaded]);

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
    if (!getApiBaseUrl() || !createName.trim()) {
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
      const res = await apiFetch('/api/v1/admin/tenant-templates', {
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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setCreateError(GENERIC_ERROR_MESSAGE);
    } finally {
      setCreating(false);
    }
  }, [
    getApiBaseUrl(),
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
      if (!getApiBaseUrl()) return;
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
          `${getApiBaseUrl()}/api/v1/admin/tenant-templates/${encodeURIComponent(templateId)}/apply`,
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
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setApplyError(GENERIC_ERROR_MESSAGE);
      } finally {
        setApplyLoading(false);
      }
    },
    [getApiBaseUrl(), applyTenantIdsInput]
  );

  const openApply = useCallback((templateId: string) => {
    setApplyTemplateId(templateId);
    setApplyTenantIdsInput('');
    setApplyResult(null);
    setApplyError(null);
  }, []);

  /** §7.2.2 Open tenant picker and fetch tenant list */
  const openTenantPicker = useCallback(async () => {
    setShowTenantPicker(true);
    setTenantListForPicker([]);
    setTenantPickerError(null);
    setSelectedTenantIdsForPicker([]);
    if (!getApiBaseUrl()) {
      setTenantPickerError('API URL not set');
      return;
    }
    setTenantPickerLoading(true);
    try {
      const res = await apiFetch('/api/v1/admin/tenants');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      setTenantListForPicker(
        items.map((t: { id?: string; name?: string | null }) => ({
          id: typeof t.id === 'string' ? t.id : '',
          name: t.name ?? null,
        })).filter((t: { id: string }) => t.id)
      );
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setTenantPickerError(GENERIC_ERROR_MESSAGE);
    } finally {
      setTenantPickerLoading(false);
    }
  }, []);

  const fetchOne = useCallback(async (templateId: string): Promise<TenantTemplateRow | null> => {
    if (!getApiBaseUrl()) return null;
    const res = await apiFetch('/api/v1/admin/tenant-templates/${encodeURIComponent(templateId)}');
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
    if (!getApiBaseUrl() || !editId) return;
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
      const res = await apiFetch(`/api/v1/admin/tenant-templates/${encodeURIComponent(editId)}`, {
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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setEditError(GENERIC_ERROR_MESSAGE);
    } finally {
      setEditSaving(false);
    }
  }, [
    getApiBaseUrl(),
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
      if (!getApiBaseUrl()) return;
      if (!window.confirm('Delete this tenant template? This cannot be undone.')) return;
      try {
        const res = await apiFetch(`/api/v1/admin/tenant-templates/${encodeURIComponent(templateId)}`, {
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
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      }
    },
    [getApiBaseUrl(), fetchTemplates, applyTemplateId]
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

      {!getApiBaseUrl() && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
          <Link href="/admin/tenants/list" className="text-sm font-medium text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Tenant Management
          </Link>
        </div>
      )}

      {getApiBaseUrl() && (
        <>
          <div className="mb-4 flex gap-4">
            <Button type="button" size="sm" onClick={fetchTemplates} aria-label="Refresh template list">
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleOpenCreate} aria-label="Create new tenant template">
              Create template
            </Button>
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
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</Label>
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Technology Startup"
                    className="text-sm"
                    disabled={creating}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                  <Input
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Optional"
                    className="text-sm"
                    disabled={creating}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Methodology</Label>
                  <Input
                    value={createMethodology}
                    onChange={(e) => setCreateMethodology(e.target.value)}
                    placeholder="e.g. MEDDIC, Challenger"
                    className="text-sm"
                    disabled={creating}
                  />
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default limits (optional)</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Leave empty for no limit.</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max users</Label>
                      <Input
                        type="number"
                        min={0}
                        value={createMaxUsers}
                        onChange={(e) => setCreateMaxUsers(e.target.value)}
                        placeholder="—"
                        className="text-sm"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max opportunities</Label>
                      <Input
                        type="number"
                        min={0}
                        value={createMaxOpportunities}
                        onChange={(e) => setCreateMaxOpportunities(e.target.value)}
                        placeholder="—"
                        className="text-sm"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max predictions/day</Label>
                      <Input
                        type="number"
                        min={0}
                        value={createMaxPredictionsPerDay}
                        onChange={(e) => setCreateMaxPredictionsPerDay(e.target.value)}
                        placeholder="—"
                        className="text-sm"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max feedback/day</Label>
                      <Input
                        type="number"
                        min={0}
                        value={createMaxFeedbackPerDay}
                        onChange={(e) => setCreateMaxFeedbackPerDay(e.target.value)}
                        placeholder="—"
                        className="text-sm"
                        disabled={creating}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Active limit</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={createActiveLimit}
                    onChange={(e) => setCreateActiveLimit(parseInt(e.target.value, 10) || 1)}
                    className="text-sm"
                    disabled={creating}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="createRequireFeedback" checked={createRequireFeedback} onCheckedChange={(c) => setCreateRequireFeedback(!!c)} disabled={creating} />
                  <Label htmlFor="createRequireFeedback" className="text-sm font-normal cursor-pointer">Require feedback</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="createAllowComments" checked={createAllowComments} onCheckedChange={(c) => setCreateAllowComments(!!c)} disabled={creating} />
                  <Label htmlFor="createAllowComments" className="text-sm font-normal cursor-pointer">Allow comments</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="createCommentRequired" checked={createCommentRequired} onCheckedChange={(c) => setCreateCommentRequired(!!c)} disabled={creating} />
                  <Label htmlFor="createCommentRequired" className="text-sm font-normal cursor-pointer">Comment required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="createAllowMultipleSelection" checked={createAllowMultipleSelection} onCheckedChange={(c) => setCreateAllowMultipleSelection(!!c)} disabled={creating} />
                  <Label htmlFor="createAllowMultipleSelection" className="text-sm font-normal cursor-pointer">Allow multiple selection</Label>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pattern detection</span>
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox id="createPatternEnabled" checked={createPatternEnabled} onCheckedChange={(c) => setCreatePatternEnabled(!!c)} disabled={creating} />
                    <Label htmlFor="createPatternEnabled" className="text-sm font-normal cursor-pointer">Enabled</Label>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox id="createAutoSuppressEnabled" checked={createAutoSuppressEnabled} onCheckedChange={(c) => setCreateAutoSuppressEnabled(!!c)} disabled={creating} />
                    <Label htmlFor="createAutoSuppressEnabled" className="text-sm font-normal cursor-pointer">Auto suppress enabled</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="createAutoBoostEnabled" checked={createAutoBoostEnabled} onCheckedChange={(c) => setCreateAutoBoostEnabled(!!c)} disabled={creating} />
                    <Label htmlFor="createAutoBoostEnabled" className="text-sm font-normal cursor-pointer">Auto boost enabled</Label>
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
                          <Button type="button" variant="link" size="sm" className="text-destructive text-xs" onClick={() => setCreateActiveTypes((prev) => prev.filter((_, i) => i !== idx))} disabled={creating}>
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                    {createActiveTypes.length === 0 && <p className="text-gray-500">No active types.</p>}
                  </div>
                  {allFeedbackTypes.filter((ft) => !createActiveTypes.some((a) => a.feedbackTypeId === ft.id)).length > 0 && (
                    <div className="flex gap-2 items-center">
                      <Select
                        value="_add"
                        onValueChange={(fid) => {
                          if (fid === '_add' || !fid) return;
                          const maxOrder =
                            createActiveTypes.length > 0 ? Math.max(...createActiveTypes.map((a) => a.order), 0) : 0;
                          setCreateActiveTypes((prev) => [...prev, { feedbackTypeId: fid, order: maxOrder + 1 }]);
                        }}
                        disabled={creating}
                      >
                        <SelectTrigger className="w-auto text-sm" key={`create-add-${createActiveTypes.length}`}><SelectValue placeholder="Add type…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_add">Add type…</SelectItem>
                          {allFeedbackTypes
                            .filter((ft) => !createActiveTypes.some((a) => a.feedbackTypeId === ft.id))
                            .map((ft) => (
                              <SelectItem key={ft.id} value={ft.id}>
                                {ft.displayName ?? ft.name ?? ft.id}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleCreateSubmit} disabled={creating}>
                    {creating ? 'Creating…' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)} disabled={creating}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {editId && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Edit template</h2>
              <div className="space-y-3 max-w-md">
                <div>
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Technology Startup" className="text-sm" disabled={editSaving} />
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                  <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional" className="text-sm" disabled={editSaving} />
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Methodology</Label>
                  <Input value={editMethodology} onChange={(e) => setEditMethodology(e.target.value)} placeholder="e.g. MEDDIC, Challenger" className="text-sm" disabled={editSaving} />
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default limits (optional)</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Leave empty for no limit.</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max users</Label>
                      <Input type="number" min={0} value={editMaxUsers} onChange={(e) => setEditMaxUsers(e.target.value)} placeholder="—" className="text-sm" disabled={editSaving} />
                    </div>
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max opportunities</Label>
                      <Input type="number" min={0} value={editMaxOpportunities} onChange={(e) => setEditMaxOpportunities(e.target.value)} placeholder="—" className="text-sm" disabled={editSaving} />
                    </div>
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max predictions/day</Label>
                      <Input type="number" min={0} value={editMaxPredictionsPerDay} onChange={(e) => setEditMaxPredictionsPerDay(e.target.value)} placeholder="—" className="text-sm" disabled={editSaving} />
                    </div>
                    <div>
                      <Label className="mb-0.5 block text-xs text-gray-600 dark:text-gray-400">Max feedback/day</Label>
                      <Input type="number" min={0} value={editMaxFeedbackPerDay} onChange={(e) => setEditMaxFeedbackPerDay(e.target.value)} placeholder="—" className="text-sm" disabled={editSaving} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Active limit</Label>
                  <Input type="number" min={1} max={50} value={editActiveLimit} onChange={(e) => setEditActiveLimit(parseInt(e.target.value, 10) || 1)} className="text-sm" disabled={editSaving} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="editRequireFeedback" checked={editRequireFeedback} onCheckedChange={(c) => setEditRequireFeedback(!!c)} disabled={editSaving} />
                  <Label htmlFor="editRequireFeedback" className="text-sm">Require feedback</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="editAllowComments" checked={editAllowComments} onCheckedChange={(c) => setEditAllowComments(!!c)} disabled={editSaving} />
                  <Label htmlFor="editAllowComments" className="text-sm font-normal cursor-pointer">Allow comments</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="editCommentRequired" checked={editCommentRequired} onCheckedChange={(c) => setEditCommentRequired(!!c)} disabled={editSaving} />
                  <Label htmlFor="editCommentRequired" className="text-sm font-normal cursor-pointer">Comment required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="editAllowMultipleSelection" checked={editAllowMultipleSelection} onCheckedChange={(c) => setEditAllowMultipleSelection(!!c)} disabled={editSaving} />
                  <Label htmlFor="editAllowMultipleSelection" className="text-sm font-normal cursor-pointer">Allow multiple selection</Label>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pattern detection</span>
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox id="editPatternEnabled" checked={editPatternEnabled} onCheckedChange={(c) => setEditPatternEnabled(!!c)} disabled={editSaving} />
                    <Label htmlFor="editPatternEnabled" className="text-sm font-normal cursor-pointer">Enabled</Label>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox id="editAutoSuppressEnabled" checked={editAutoSuppressEnabled} onCheckedChange={(c) => setEditAutoSuppressEnabled(!!c)} disabled={editSaving} />
                    <Label htmlFor="editAutoSuppressEnabled" className="text-sm font-normal cursor-pointer">Auto suppress enabled</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="editAutoBoostEnabled" checked={editAutoBoostEnabled} onCheckedChange={(c) => setEditAutoBoostEnabled(!!c)} disabled={editSaving} />
                    <Label htmlFor="editAutoBoostEnabled" className="text-sm font-normal cursor-pointer">Auto boost enabled</Label>
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
                          <Button type="button" variant="link" size="sm" className="text-destructive text-xs" onClick={() => setEditActiveTypes((prev) => prev.filter((_, i) => i !== idx))} disabled={editSaving}>
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                    {editActiveTypes.length === 0 && <p className="text-gray-500">No active types.</p>}
                  </div>
                  {allFeedbackTypes.filter((ft) => !editActiveTypes.some((a) => a.feedbackTypeId === ft.id)).length > 0 && (
                    <div className="flex gap-2 items-center">
                      <Select
                        value="_add"
                        onValueChange={(fid) => {
                          if (fid === '_add' || !fid) return;
                          const maxOrder = editActiveTypes.length > 0 ? Math.max(...editActiveTypes.map((a) => a.order), 0) : 0;
                          setEditActiveTypes((prev) => [...prev, { feedbackTypeId: fid, order: maxOrder + 1 }]);
                        }}
                        disabled={editSaving}
                      >
                        <SelectTrigger className="w-auto text-sm" key={`edit-add-${editActiveTypes.length}`}><SelectValue placeholder="Add type…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_add">Add type…</SelectItem>
                          {allFeedbackTypes
                            .filter((ft) => !editActiveTypes.some((a) => a.feedbackTypeId === ft.id))
                            .map((ft) => (
                              <SelectItem key={ft.id} value={ft.id}>
                                {ft.displayName ?? ft.name ?? ft.id}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleUpdateSubmit} disabled={editSaving}>
                    {editSaving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditId(null); setEditError(null); }} disabled={editSaving}>
                    Cancel
                  </Button>
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
              <Button type="button" variant="link" size="sm" className="mt-2" onClick={fetchTemplates} aria-label="Retry loading templates">
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && (
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">
                Templates (§7.2.1 card grid)
                {items.length > 0 ? ` — ${items.length} template${items.length === 1 ? '' : 's'}` : ''}
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No templates yet. Create one to get started.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
                  {items.map((row) => (
                    <article
                      key={row.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 flex flex-col"
                      role="listitem"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate" title={row.name}>
                        {row.name}
                      </h3>
                      {row.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{row.description}</p>
                      )}
                      {row.methodology && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Methodology: <span className="font-medium">{row.methodology}</span>
                        </p>
                      )}
                      {row.createdAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Created: {new Date(row.createdAt).toLocaleString()}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <Button type="button" variant="link" size="sm" className="text-blue-600 dark:text-blue-400" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                        <Button type="button" variant="link" size="sm" className="text-blue-600 dark:text-blue-400" onClick={() => openApply(row.id)}>
                          Apply
                        </Button>
                        <Button type="button" variant="link" size="sm" className="text-destructive" onClick={() => handleDelete(row.id)}>
                          Delete
                        </Button>
                      </div>
                    </article>
                  ))}
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
              <div className="flex gap-2 mb-2">
                <Button ref={selectFromListButtonRef} type="button" variant="outline" size="sm" onClick={openTenantPicker} disabled={applyLoading}>
                  Select from list
                </Button>
              </div>
              <Textarea
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
                <Button type="button" size="sm" onClick={() => handleApply(applyTemplateId)} disabled={applyLoading}>
                  {applyLoading ? 'Applying…' : 'Apply'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setApplyTemplateId(null);
                    setApplyTenantIdsInput('');
                    setApplyResult(null);
                    setApplyError(null);
                  }}
                  disabled={applyLoading}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {showTenantPicker && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tenant-picker-title"
              onClick={() => setShowTenantPicker(false)}
            >
              <div
                className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg border bg-white dark:bg-gray-900 shadow-xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="tenant-picker-title" className="text-lg font-semibold p-4 border-b dark:border-gray-700">
                  Select tenants (§7.2.2)
                </h2>
                <div className="p-4 overflow-y-auto flex-1">
                  {tenantPickerLoading && <p className="text-sm text-gray-500">Loading tenants…</p>}
                  {tenantPickerError && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-2">{tenantPickerError}</p>
                  )}
                  {!tenantPickerLoading && !tenantPickerError && tenantListForPicker.length === 0 && (
                    <p className="text-sm text-gray-500">No tenants found.</p>
                  )}
                  {!tenantPickerLoading && tenantListForPicker.length > 0 && (
                    <>
                      <div className="flex gap-2 mb-3">
                        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setSelectedTenantIdsForPicker(tenantListForPicker.map((t) => t.id))}>
                          Select all
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setSelectedTenantIdsForPicker([])}>
                          Clear
                        </Button>
                      </div>
                      <ul className="space-y-1 text-sm max-h-60 overflow-y-auto">
                        {tenantListForPicker.map((t) => (
                          <li key={t.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`picker-${t.id}`}
                              checked={selectedTenantIdsForPicker.includes(t.id)}
                              onCheckedChange={() => {
                                setSelectedTenantIdsForPicker((prev) =>
                                  prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                                );
                              }}
                            />
                            <Label htmlFor={`picker-${t.id}`} className="cursor-pointer truncate">
                              {t.name || t.id}
                            </Label>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div className="flex gap-2 p-4 border-t dark:border-gray-700">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setApplyTenantIdsInput(selectedTenantIdsForPicker.join('\n'));
                      setShowTenantPicker(false);
                    }}
                    disabled={selectedTenantIdsForPicker.length === 0}
                  >
                    Use selected ({selectedTenantIdsForPicker.length})
                  </Button>
                  <Button ref={tenantPickerCancelButtonRef} type="button" variant="outline" size="sm" onClick={() => setShowTenantPicker(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
