/**
 * Super Admin: Tenant detail (W11)
 * GET/PUT /api/v1/admin/tenants/:tenantId/feedback-config via gateway (recommendations).
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

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

interface TenantFeedbackConfig {
  id?: string;
  tenantId?: string;
  activeLimit?: number;
  activeTypes?: ActiveTypeRow[];
  requireFeedback?: boolean;
  allowComments?: boolean;
  commentRequired?: boolean;
  allowMultipleSelection?: boolean;
  patternDetection?: { enabled?: boolean; autoSuppressEnabled?: boolean; autoBoostEnabled?: boolean };
  updatedAt?: string;
  updatedBy?: string;
}

export default function TenantDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [config, setConfig] = useState<TenantFeedbackConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id.trim()) fetchConfig();
  }, [id, fetchConfig]);

  const saveConfig = useCallback(async () => {
    if (!apiBaseUrl || !id.trim()) return;
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
            activeLimit: editActiveLimit,
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
      setEditActiveLimit(json.activeLimit ?? 5);
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
  }, [id, editActiveLimit, editRequireFeedback, editAllowComments, editCommentRequired, editAllowMultipleSelection, editPatternEnabled, editAutoSuppressEnabled, editAutoBoostEnabled, editActiveTypes]);

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
            <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 mb-4">
              <h2 className="text-lg font-semibold mb-3">Feedback config</h2>
              {editing ? (
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Active limit</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editActiveLimit}
                      onChange={(e) => setEditActiveLimit(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      disabled={saving}
                    />
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
                        setEditActiveLimit(config.activeLimit ?? 5);
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
                  <dl className="text-sm space-y-2">
                    <div><dt className="font-medium text-gray-500">Active limit</dt><dd>{config.activeLimit ?? '—'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Require feedback</dt><dd>{config.requireFeedback ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Allow comments</dt><dd>{config.allowComments ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Comment required</dt><dd>{config.commentRequired ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Allow multiple selection</dt><dd>{config.allowMultipleSelection ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Pattern detection</dt><dd>{config.patternDetection?.enabled ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Auto suppress</dt><dd>{config.patternDetection?.autoSuppressEnabled ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Auto boost</dt><dd>{config.patternDetection?.autoBoostEnabled ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-medium text-gray-500">Active types</dt><dd>{config.activeTypes?.length ?? 0} configured</dd></div>
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
