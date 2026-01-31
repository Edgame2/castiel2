/**
 * Super Admin: Feedback Types Management (§1.1)
 * GET/POST/PUT/DELETE /api/v1/admin/feedback-types via gateway (recommendations).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type FeedbackTypeCategory = 'action' | 'relevance' | 'quality' | 'timing' | 'other';
type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

interface FeedbackTypeBehavior {
  createsTask: boolean;
  hidesRecommendation: boolean;
  hideDurationDays?: number;
  suppressSimilar: boolean;
  requiresComment: boolean;
}

/** §1.1.2 Common emojis for icon picker */
const ICON_EMOJIS = ['✓', '✗', '👍', '👎', '💡', '⏱️', '📌', '🔔', '➕', '⭐', '📋', '🔗'];

interface FeedbackTypeRow {
  id: string;
  name: string;
  displayName: string;
  category: FeedbackTypeCategory;
  sentiment: FeedbackSentiment;
  sentimentScore: number;
  icon?: string;
  color?: string;
  order: number;
  behavior?: FeedbackTypeBehavior;
  applicableToRecTypes?: string[];
  isActive: boolean;
  isDefault: boolean;
  updatedAt?: string;
  usageCount?: number;
  lastUsed?: string;
}

const DEFAULT_BEHAVIOR: FeedbackTypeBehavior = {
  createsTask: false,
  hidesRecommendation: false,
  suppressSimilar: false,
  requiresComment: false,
};

const CATEGORY_LABELS: Record<FeedbackTypeCategory, string> = {
  action: 'Action',
  relevance: 'Relevance',
  quality: 'Quality',
  timing: 'Timing',
  other: 'Other',
};

const SENTIMENT_LABELS: Record<FeedbackSentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

function SentimentBadge({ sentiment, score }: { sentiment: FeedbackSentiment; score: number }) {
  const bg =
    sentiment === 'positive'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      : sentiment === 'negative'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${bg}`}>
      {SENTIMENT_LABELS[sentiment]} ({score.toFixed(1)})
    </span>
  );
}

export default function FeedbackTypesPage() {
  const [types, setTypes] = useState<FeedbackTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FeedbackTypeCategory | ''>('');
  const [sentimentFilter, setSentimentFilter] = useState<FeedbackSentiment | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [usageFilter, setUsageFilter] = useState<'high' | 'medium' | 'low' | 'unused' | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'displayName' | 'order' | 'updatedAt' | 'lastUsed' | 'usageCount' | 'sentimentScore'>('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    category: 'action' as FeedbackTypeCategory,
    sentiment: 'neutral' as FeedbackSentiment,
    sentimentScore: 0,
    icon: '',
    color: '',
    order: 0,
    behavior: { ...DEFAULT_BEHAVIOR },
    applicableToRecTypes: [] as string[],
    isActive: true,
    isDefault: false,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkModal, setBulkModal] = useState<'setCategory' | 'setSentiment' | null>(null);
  const [bulkCategory, setBulkCategory] = useState<FeedbackTypeCategory>('action');
  const [bulkSentiment, setBulkSentiment] = useState<FeedbackSentiment>('neutral');
  const [bulkSentimentScore, setBulkSentimentScore] = useState(0);
  const [usageModalType, setUsageModalType] = useState<FeedbackTypeRow | null>(null);
  /** §1.1.3 View tenants using this type */
  const [tenantsModalType, setTenantsModalType] = useState<FeedbackTypeRow | null>(null);
  const [tenantsList, setTenantsList] = useState<string[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  /** §1.1.3 Bulk update behavior for all tenants */
  const [bulkUpdateSaving, setBulkUpdateSaving] = useState(false);
  const [bulkUpdateResult, setBulkUpdateResult] = useState<{ affectedTenantIds: string[] } | null>(null);
  const [bulkUpdateError, setBulkUpdateError] = useState<string | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);
  /** §1.1.3 Change Impact: usage/lastUsed from row when opening edit; initial behavior for diff */
  const [editUsageCount, setEditUsageCount] = useState<number | undefined>(undefined);
  const [editLastUsed, setEditLastUsed] = useState<string | undefined>(undefined);
  const [editInitialBehavior, setEditInitialBehavior] = useState<FeedbackTypeBehavior | null>(null);
  /** §1.1.4 Delete confirmation: row to delete, typed name, saving, error */
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<FeedbackTypeRow | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchTypes = useCallback(async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types?includeUsage=true`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTypes(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOne = useCallback(async (id: string): Promise<FeedbackTypeRow | null> => {
    if (!apiBaseUrl) return null;
    const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    if (apiBaseUrl) fetchTypes();
    else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [apiBaseUrl, fetchTypes]);

  useEffect(() => {
    document.title = 'Feedback Types | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  /** §1.1.3 Fetch tenants using this feedback type when tenants modal opens */
  useEffect(() => {
    if (!tenantsModalType || !apiBaseUrl) return;
    setTenantsLoading(true);
    setTenantsError(null);
    fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/${encodeURIComponent(tenantsModalType.id)}/tenants`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Feedback type not found' : `HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { tenantIds?: string[] }) => {
        setTenantsList(Array.isArray(data?.tenantIds) ? data.tenantIds : []);
      })
      .catch((e) => setTenantsError(e instanceof Error ? e.message : String(e)))
      .finally(() => setTenantsLoading(false));
  }, [tenantsModalType?.id]);

  const openCreate = () => {
    setForm({
      name: '',
      displayName: '',
      category: 'action',
      sentiment: 'neutral',
      sentimentScore: 0,
      icon: '',
      color: '',
      order: Math.max(0, ...types.map((t) => t.order ?? 0)) + 1,
      behavior: { ...DEFAULT_BEHAVIOR },
      applicableToRecTypes: [],
      isActive: true,
      isDefault: false,
    });
    setEditId(null);
    setModalMode('create');
    setFormError(null);
  };

  const openEdit = async (row: FeedbackTypeRow) => {
    const one = await fetchOne(row.id);
    if (!one) {
      setError('Failed to load feedback type');
      return;
    }
    const initialBehavior: FeedbackTypeBehavior = one.behavior ? { ...DEFAULT_BEHAVIOR, ...one.behavior } : { ...DEFAULT_BEHAVIOR };
    setForm({
      name: (one as FeedbackTypeRow & { name?: string }).name ?? '',
      displayName: one.displayName ?? '',
      category: one.category ?? 'action',
      sentiment: one.sentiment ?? 'neutral',
      sentimentScore: one.sentimentScore ?? 0,
      icon: one.icon ?? '',
      color: one.color ?? '',
      order: one.order ?? 0,
      behavior: initialBehavior,
      applicableToRecTypes: one.applicableToRecTypes ?? [],
      isActive: one.isActive ?? true,
      isDefault: one.isDefault ?? false,
    });
    setEditId(one.id);
    setEditUsageCount(typeof row.usageCount === 'number' ? row.usageCount : undefined);
    setEditLastUsed(typeof row.lastUsed === 'string' ? row.lastUsed : undefined);
    setEditInitialBehavior(initialBehavior);
    setModalMode('edit');
    setFormError(null);
    setBulkUpdateResult(null);
    setBulkUpdateError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditId(null);
    setEditUsageCount(undefined);
    setEditLastUsed(undefined);
    setEditInitialBehavior(null);
    setFormError(null);
    setBulkUpdateResult(null);
    setBulkUpdateError(null);
  };

  /** §1.1.3 True if behavior has changed from initial (affects existing feedback) */
  const behaviorChanged = (): boolean => {
    if (!editInitialBehavior) return false;
    const b = form.behavior;
    const i = editInitialBehavior;
    return (
      b.createsTask !== i.createsTask ||
      b.hidesRecommendation !== i.hidesRecommendation ||
      (b.hideDurationDays ?? 0) !== (i.hideDurationDays ?? 0) ||
      b.suppressSimilar !== i.suppressSimilar ||
      b.requiresComment !== i.requiresComment
    );
  };

  /** §1.1.2 Validation: display name 1-50, sentiment -1 to 1, color hex if present, hideDurationDays 0-365 */
  const formValidationErrors = (): string[] => {
    const errs: string[] = [];
    const dn = form.displayName?.trim() ?? '';
    if (dn.length < 1 || dn.length > 50) errs.push('Display name must be 1–50 characters.');
    const score = form.sentimentScore;
    if (score < -1 || score > 1) errs.push('Sentiment score must be between -1 and 1.');
    if (form.color.trim()) {
      const hex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
      if (!hex.test(form.color.trim())) errs.push('Color must be a valid hex (e.g. #22c55e).');
    }
    if (form.behavior.hidesRecommendation) {
      const days = form.behavior.hideDurationDays ?? 0;
      if (days < 0 || days > 365) errs.push('Hide duration must be 0–365 days.');
    }
    return errs;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    const errs = formValidationErrors();
    if (errs.length > 0) {
      setFormError(errs.join(' '));
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name.trim() || form.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'new_type',
        displayName: form.displayName.trim(),
        category: form.category,
        sentiment: form.sentiment,
        sentimentScore: form.sentimentScore,
        icon: form.icon.trim() || undefined,
        color: form.color.trim() || undefined,
        order: form.order,
        behavior: {
          ...form.behavior,
          hideDurationDays: form.behavior.hidesRecommendation ? (form.behavior.hideDurationDays ?? 0) : undefined,
        },
        applicableToRecTypes: form.applicableToRecTypes,
        isActive: form.isActive,
        isDefault: form.isDefault,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchTypes();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl || !editId) return;
    const errs = formValidationErrors();
    if (errs.length > 0) {
      setFormError(errs.join(' '));
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        displayName: form.displayName.trim(),
        category: form.category,
        sentiment: form.sentiment,
        sentimentScore: form.sentimentScore,
        icon: form.icon.trim() || undefined,
        color: form.color.trim() || undefined,
        order: form.order,
        behavior: {
          ...form.behavior,
          hideDurationDays: form.behavior.hidesRecommendation ? (form.behavior.hideDurationDays ?? 0) : undefined,
        },
        applicableToRecTypes: form.applicableToRecTypes,
        isActive: form.isActive,
        isDefault: form.isDefault,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchTypes();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  /** §1.1.3 Bulk update behavior for all tenants: apply current form behavior to the type and return affected tenant count */
  const handleBulkUpdateBehavior = async () => {
    if (!apiBaseUrl || !editId) return;
    const errs = formValidationErrors();
    if (errs.length > 0) {
      setBulkUpdateError(errs.join(' '));
      return;
    }
    setBulkUpdateSaving(true);
    setBulkUpdateError(null);
    setBulkUpdateResult(null);
    try {
      const behavior = {
        ...form.behavior,
        hideDurationDays: form.behavior.hidesRecommendation ? (form.behavior.hideDurationDays ?? 0) : undefined,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/${encodeURIComponent(editId)}/bulk-update-behavior`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ behavior }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      setBulkUpdateResult({ affectedTenantIds: Array.isArray(data?.affectedTenantIds) ? data.affectedTenantIds : [] });
      await fetchTypes();
    } catch (e) {
      setBulkUpdateError(e instanceof Error ? e.message : String(e));
    } finally {
      setBulkUpdateSaving(false);
    }
  };

  /** §1.1.4 Pre-deletion check: returns reasons deletion is blocked (backend enforces same rules) */
  const deleteBlockReasons = (row: FeedbackTypeRow): string[] => {
    const reasons: string[] = [];
    if (row.isDefault) reasons.push('Cannot delete default type.');
    if (row.isActive) reasons.push('Deactivate first; then wait 30 days before deletion.');
    const usage = typeof row.usageCount === 'number' ? row.usageCount : 0;
    if (usage > 0) reasons.push(`Type is in use (${usage} feedbacks). Cannot delete.`);
    if (!row.isActive && row.updatedAt) {
      const inactiveMs = Date.now() - new Date(row.updatedAt).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (inactiveMs < thirtyDaysMs) {
        const days = Math.ceil((thirtyDaysMs - inactiveMs) / (24 * 60 * 60 * 1000));
        reasons.push(`Must be inactive for 30 days (${days} days remaining).`);
      }
    }
    return reasons;
  };

  const handleConfirmDelete = async () => {
    if (!apiBaseUrl || !deleteConfirmRow) return;
    const displayName = (deleteConfirmRow.displayName || deleteConfirmRow.name || '').trim();
    if (deleteConfirmName.trim() !== displayName) return;
    const blockReasons = deleteBlockReasons(deleteConfirmRow);
    if (blockReasons.length > 0) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/${encodeURIComponent(deleteConfirmRow.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      setDeleteConfirmRow(null);
      setDeleteConfirmName('');
      await fetchTypes();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleteSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmRow(null);
    setDeleteConfirmName('');
    setDeleteError(null);
  };

  /** §1.1.1 Disable/Enable: toggle isActive via PUT */
  const handleToggleActive = async (id: string, nextActive: boolean) => {
    if (!apiBaseUrl) return;
    setTogglingActiveId(id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      await fetchTypes();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTogglingActiveId(null);
    }
  };

  const usageBand = (n: number): 'high' | 'medium' | 'low' | 'unused' => {
    if (n === 0) return 'unused';
    if (n <= 9) return 'low';
    if (n <= 100) return 'medium';
    return 'high';
  };
  const filtered = types.filter((t) => {
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (sentimentFilter && t.sentiment !== sentimentFilter) return false;
    if (statusFilter === 'active' && !t.isActive) return false;
    if (statusFilter === 'inactive' && t.isActive) return false;
    if (usageFilter) {
      const u = typeof t.usageCount === 'number' ? t.usageCount : 0;
      if (usageBand(u) !== usageFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (t.displayName || t.name || '').toLowerCase();
      const id = (t.id || '').toLowerCase();
      if (!name.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    let base: number;
    if (sortBy === 'displayName') {
      base = (a.displayName || a.name).localeCompare(b.displayName || b.name);
    } else if (sortBy === 'updatedAt') {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      base = da - db;
    } else if (sortBy === 'lastUsed') {
      const da = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const db = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      base = da - db;
    } else if (sortBy === 'usageCount') {
      const ua = typeof a.usageCount === 'number' ? a.usageCount : 0;
      const ub = typeof b.usageCount === 'number' ? b.usageCount : 0;
      base = ua - ub;
    } else if (sortBy === 'sentimentScore') {
      const sa = typeof a.sentimentScore === 'number' ? a.sentimentScore : 0;
      const sb = typeof b.sentimentScore === 'number' ? b.sentimentScore : 0;
      base = sa - sb;
    } else {
      base = (a.order ?? 0) - (b.order ?? 0);
    }
    return sortDir === 'desc' ? -base : base;
  });

  const selectedArray = Array.from(selectedIds);
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sorted.map((t) => t.id)));
  };
  const isAllSelected = sorted.length > 0 && selectedIds.size === sorted.length;

  const runBulk = async (operation: 'activate' | 'deactivate' | 'setCategory' | 'setSentiment', payload?: { category?: FeedbackTypeCategory; sentiment?: FeedbackSentiment; sentimentScore?: number }) => {
    if (!apiBaseUrl || selectedArray.length === 0) return;
    setBulkSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { operation, ids: selectedArray };
      if (operation === 'setCategory' && payload?.category != null) body.category = payload.category;
      if (operation === 'setSentiment' && payload?.sentiment != null) {
        body.sentiment = payload.sentiment;
        body.sentimentScore = payload.sentimentScore ?? (payload.sentiment === 'positive' ? 1 : payload.sentiment === 'negative' ? -1 : 0);
      }
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/bulk`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      setBulkModal(null);
      setSelectedIds(new Set());
      await fetchTypes();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBulkSaving(false);
    }
  };

  const handleExportSelected = () => {
    const selected = sorted.filter((t) => selectedIds.has(t.id));
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `feedback-types-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !apiBaseUrl) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = reader.result as string;
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/import`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
        setError(null);
        await fetchTypes();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const modalTitle = modalMode === 'create' ? 'Create feedback type' : 'Edit feedback type';

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
        <span className="text-sm font-medium">Feedback Types</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Feedback Types</h1>
      <p className="text-muted-foreground mb-4">
        Global feedback types used for recommendation feedback. Create, edit, or delete types.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/feedback"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Feedback Types
        </span>
        <Link
          href="/admin/feedback/global-settings"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Global Settings
        </Link>
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

      {!loading && apiBaseUrl && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              aria-label="Create feedback type"
            >
              Create type
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
              aria-label="Import feedback types from JSON"
            >
              Import from JSON
            </button>
            <button
              type="button"
              onClick={fetchTypes}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
              title="Refetch feedback types"
              aria-label="Refresh feedback types"
            >
              Refresh
            </button>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={() => runBulk('activate')}
                  disabled={bulkSaving}
                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  Activate
                </button>
                <button
                  type="button"
                  onClick={() => runBulk('deactivate')}
                  disabled={bulkSaving}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
                >
                  Deactivate
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal('setCategory')}
                  disabled={bulkSaving}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
                >
                  Set category
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal('setSentiment')}
                  disabled={bulkSaving}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
                >
                  Set sentiment
                </button>
                <button
                  type="button"
                  onClick={handleExportSelected}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  Export to JSON
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:underline text-sm"
                >
                  Clear selection
                </button>
              </div>
            )}
            <label className="text-sm font-medium ml-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter((e.target.value || '') as FeedbackTypeCategory | '')}
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
            >
              <option value="">All</option>
              {(Object.keys(CATEGORY_LABELS) as FeedbackTypeCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium ml-2">Sentiment</label>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter((e.target.value || '') as FeedbackSentiment | '')}
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
            >
              <option value="">All</option>
              {(Object.keys(SENTIMENT_LABELS) as FeedbackSentiment[]).map((s) => (
                <option key={s} value={s}>
                  {SENTIMENT_LABELS[s]}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium ml-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || '') as 'active' | 'inactive' | '')}
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <label className="text-sm font-medium ml-2">Usage</label>
            <select
              value={usageFilter}
              onChange={(e) => setUsageFilter((e.target.value || '') as 'high' | 'medium' | 'low' | 'unused' | '')}
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
            >
              <option value="">All</option>
              <option value="high">High (&gt;100)</option>
              <option value="medium">Medium (10–100)</option>
              <option value="low">Low (1–9)</option>
              <option value="unused">Unused (0)</option>
            </select>
            <label className="text-sm font-medium ml-2">Search</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="By name…"
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm w-40"
              aria-label="Search by name"
            />
            <label className="text-sm font-medium ml-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'displayName' | 'order' | 'updatedAt' | 'lastUsed' | 'usageCount' | 'sentimentScore')}
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
              aria-label="Sort by"
            >
              <option value="order">Order</option>
              <option value="displayName">Name</option>
              <option value="usageCount">Usage</option>
              <option value="lastUsed">Last used</option>
              <option value="updatedAt">Last updated</option>
              <option value="sentimentScore">Sentiment score</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm ml-1"
              aria-label="Sort direction"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 mt-4">
            <h2 className="text-lg font-semibold">Feedback types</h2>
            <button
              type="button"
              onClick={fetchTypes}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              aria-label="Refresh feedback types"
            >
              Refresh
            </button>
          </div>

          <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left p-3 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-3 font-medium">Display Name</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Sentiment</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Default</th>
                    <th className="text-left p-3 font-medium">Usage</th>
                    <th className="text-left p-3 font-medium">Last Used</th>
                    <th className="text-left p-3 font-medium">Order</th>
                    <th className="text-left p-3 font-medium">Updated</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-gray-500 text-center">
                        No feedback types found.
                      </td>
                    </tr>
                  ) : (
                    sorted.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(t.id)}
                            onChange={() => toggleSelect(t.id)}
                            aria-label={`Select ${t.displayName || t.name}`}
                            className="rounded"
                          />
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{t.displayName || t.name}</span>
                          {t.icon && <span className="ml-2" aria-hidden>{t.icon}</span>}
                        </td>
                        <td className="p-3">
                          <span
                            className="rounded px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700"
                            style={t.color ? { borderLeft: `3px solid ${t.color}` } : undefined}
                          >
                            {CATEGORY_LABELS[t.category] ?? t.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <SentimentBadge sentiment={t.sentiment} score={t.sentimentScore ?? 0} />
                        </td>
                        <td className="p-3">
                          {t.isActive ? (
                            <span className="text-green-600 dark:text-green-400">Active</span>
                          ) : (
                            <span className="text-gray-500">Inactive</span>
                          )}
                        </td>
                        <td className="p-3">
                          {t.isDefault ? (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs dark:bg-blue-900/30">Default</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {typeof t.usageCount === 'number' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span>{t.usageCount}</span>
                              <span
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                                  usageBand(t.usageCount) === 'high'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                    : usageBand(t.usageCount) === 'medium'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                      : usageBand(t.usageCount) === 'low'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                                title={`Usage: ${usageBand(t.usageCount)}`}
                                aria-label={`Usage ${usageBand(t.usageCount)}`}
                              >
                                {usageBand(t.usageCount) === 'high' ? '↑' : usageBand(t.usageCount) === 'medium' ? '→' : usageBand(t.usageCount) === 'low' ? '↓' : '·'}
                              </span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3 text-gray-500">
                          {t.lastUsed
                            ? new Date(t.lastUsed).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="p-3">{t.order ?? '—'}</td>
                        <td className="p-3 text-gray-500">
                          {t.updatedAt
                            ? new Date(t.updatedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            >
                              Edit
                            </button>
                            {t.isActive ? (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(t.id, false)}
                                disabled={togglingActiveId === t.id}
                                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-sm disabled:opacity-50"
                                title="Disable this feedback type"
                              >
                                {togglingActiveId === t.id ? '…' : 'Disable'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(t.id, true)}
                                disabled={togglingActiveId === t.id}
                                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm disabled:opacity-50"
                                title="Enable this feedback type"
                              >
                                {togglingActiveId === t.id ? '…' : 'Enable'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setDeleteConfirmRow(t); setDeleteConfirmName(''); setDeleteError(null); }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              title="Delete feedback type (§1.1.4)"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setUsageModalType(t)}
                              className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
                              title="View usage for this type"
                            >
                              View Usage
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTenantsModalType(t);
                                setTenantsList([]);
                                setTenantsError(null);
                              }}
                              className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
                              title="View tenants using this type (§1.1.3)"
                            >
                              View tenants
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {usageModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="usage-modal-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h2 id="usage-modal-title" className="text-lg font-semibold mb-4">View Usage (§1.1.1)</h2>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{usageModalType.displayName || usageModalType.name}</p>
            <dl className="text-sm space-y-2 mt-3">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Usage count</dt>
                <dd className="font-medium">{typeof usageModalType.usageCount === 'number' ? usageModalType.usageCount : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Last used</dt>
                <dd className="font-medium">
                  {usageModalType.lastUsed
                    ? new Date(usageModalType.lastUsed).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setUsageModalType(null)}
                className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {tenantsModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="tenants-modal-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[80vh] flex flex-col">
            <h2 id="tenants-modal-title" className="text-lg font-semibold mb-2">Tenants using this type (§1.1.3)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{tenantsModalType.displayName || tenantsModalType.name}</p>
            {tenantsLoading && <p className="text-sm text-gray-500">Loading…</p>}
            {tenantsError && !tenantsLoading && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{tenantsError}</p>
            )}
            {!tenantsLoading && !tenantsError && (
              <div className="overflow-y-auto flex-1 min-h-0">
                {tenantsList.length === 0 ? (
                  <p className="text-sm text-gray-500">No tenants have this feedback type in their active config.</p>
                ) : (
                  <ul className="text-sm space-y-1 list-none">
                    {tenantsList.map((tenantId) => (
                      <li key={tenantId}>
                        <Link
                          href={`/admin/tenants/${encodeURIComponent(tenantId)}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {tenantId}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => { setTenantsModalType(null); setTenantsList([]); setTenantsError(null); }}
                className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="delete-dialog-title" className="text-lg font-semibold mb-4">Delete feedback type? (§1.1.4)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Impact summary</p>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside mb-4">
              <li>Display name: {deleteConfirmRow.displayName || deleteConfirmRow.name || deleteConfirmRow.id}</li>
              <li>Usage count: {typeof deleteConfirmRow.usageCount === 'number' ? deleteConfirmRow.usageCount : '—'}</li>
              <li>Last used: {deleteConfirmRow.lastUsed ? new Date(deleteConfirmRow.lastUsed).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</li>
              <li>Default type: {deleteConfirmRow.isDefault ? 'Yes' : 'No'}</li>
              <li>Active: {deleteConfirmRow.isActive ? 'Yes' : 'No'}</li>
            </ul>
            {deleteBlockReasons(deleteConfirmRow).length > 0 && (
              <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 mb-4" role="alert">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Pre-deletion checks</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                  {deleteBlockReasons(deleteConfirmRow).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="delete-confirm-name" className="block text-sm font-medium mb-1">
                Type the feedback type name to confirm: <strong>{(deleteConfirmRow.displayName || deleteConfirmRow.name || '').trim()}</strong>
              </label>
              <input
                id="delete-confirm-name"
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Type name to confirm"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                aria-label="Type feedback type name to confirm"
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleteSaving}
                className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  deleteSaving ||
                  deleteConfirmName.trim() !== (deleteConfirmRow.displayName || deleteConfirmRow.name || '').trim() ||
                  deleteBlockReasons(deleteConfirmRow).length > 0
                }
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {deleteSaving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 id="modal-title" className="text-lg font-semibold mb-4">{modalTitle}</h2>
              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>
              )}
              {modalMode === 'edit' && (
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 mb-4" role="region" aria-labelledby="change-impact-heading">
                  <h3 id="change-impact-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Change impact (§1.1.3)</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>Historical usage count: {typeof editUsageCount === 'number' ? editUsageCount : '—'}</li>
                    <li>Last used: {editLastUsed ? new Date(editLastUsed).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</li>
                  </ul>
                  {behaviorChanged() && (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300 font-medium" role="alert">
                      Changing behavior affects existing feedback; consider notifying affected tenants.
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleBulkUpdateBehavior}
                      disabled={bulkUpdateSaving}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Apply current behavior to this type; all tenants using it will see the new behavior on next load (§1.1.3)"
                    >
                      {bulkUpdateSaving ? 'Updating…' : 'Bulk update behavior for all tenants'}
                    </button>
                    {bulkUpdateError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{bulkUpdateError}</p>
                    )}
                    {bulkUpdateResult && !bulkUpdateSaving && (
                      <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                        Behavior updated for {bulkUpdateResult.affectedTenantIds.length} tenant{bulkUpdateResult.affectedTenantIds.length !== 1 ? 's' : ''}.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <form onSubmit={modalMode === 'create' ? handleCreate : handleUpdate} className="space-y-3">
                {modalMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Name (slug, e.g. my_type)</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. custom_feedback"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Display name (1–50 chars)</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                    maxLength={50}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                    aria-describedby="display-name-hint"
                  />
                  <p id="display-name-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{form.displayName.trim().length}/50</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as FeedbackTypeCategory }))}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    >
                      {(Object.keys(CATEGORY_LABELS) as FeedbackTypeCategory[]).map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sentiment</label>
                    <select
                      value={form.sentiment}
                      onChange={(e) => setForm((f) => ({ ...f, sentiment: e.target.value as FeedbackSentiment }))}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    >
                      {(Object.keys(SENTIMENT_LABELS) as FeedbackSentiment[]).map((s) => (
                        <option key={s} value={s}>{SENTIMENT_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sentiment score (-1 to 1) §1.1.2</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Presets:</span>
                    {([-1, 0, 1] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, sentimentScore: v }))}
                        className={`px-2 py-1 rounded text-sm border ${form.sentimentScore === v ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                      >
                        {v === -1 ? 'Negative (-1)' : v === 0 ? 'Neutral (0)' : 'Positive (1)'}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.1}
                    value={form.sentimentScore}
                    onChange={(e) => setForm((f) => ({ ...f, sentimentScore: parseFloat(e.target.value) || 0 }))}
                    className="w-full mt-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600"
                    aria-label="Sentiment score slider"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{form.sentimentScore.toFixed(1)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Order</label>
                    <input
                      type="number"
                      min={0}
                      value={form.order}
                      onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Icon (§1.1.2 picker)</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {ICON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                        className={`w-9 h-9 rounded border text-lg flex items-center justify-center ${form.icon === emoji ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        title={`Set icon to ${emoji}`}
                        aria-label={`Icon ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="Or type emoji / character"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                    aria-label="Icon text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color (§1.1.2 picker)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        form.color.trim() && /^#[0-9A-Fa-f]{3,6}$/.test(form.color.trim())
                          ? form.color.trim().length === 7
                            ? form.color.trim()
                            : form.color.trim().replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')
                          : '#22c55e'
                      }
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      aria-label="Color picker"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      placeholder="#22c55e"
                      className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
                      aria-label="Color hex"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Default (in tenant config)</span>
                  </label>
                </div>
                {!form.isActive && (
                  <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200" role="region" aria-labelledby="deprecation-workflow-heading">
                    <p id="deprecation-workflow-heading" className="font-medium mb-1">Deprecation workflow (§1.1.3)</p>
                    <p className="mb-1">This type is inactive. It must remain inactive for 30 days before it can be deleted.</p>
                    <p>Use <strong>View tenants</strong> above to see affected tenants and consider notifying them.</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium mb-2">Behavior</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.behavior.createsTask}
                        onChange={(e) => setForm((f) => ({ ...f, behavior: { ...f.behavior, createsTask: e.target.checked } }))}
                        className="rounded"
                      />
                      <span className="text-sm">Creates task</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.behavior.hidesRecommendation}
                        onChange={(e) => setForm((f) => ({ ...f, behavior: { ...f.behavior, hidesRecommendation: e.target.checked } }))}
                        className="rounded"
                      />
                      <span className="text-sm">Hides recommendation</span>
                    </label>
                    {form.behavior.hidesRecommendation && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Hide duration (days, 0–365)</label>
                        <input
                          type="number"
                          min={0}
                          max={365}
                          value={form.behavior.hideDurationDays ?? 0}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              behavior: { ...f.behavior, hideDurationDays: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                          aria-label="Hide duration days"
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.behavior.suppressSimilar}
                        onChange={(e) => setForm((f) => ({ ...f, behavior: { ...f.behavior, suppressSimilar: e.target.checked } }))}
                        className="rounded"
                      />
                      <span className="text-sm">Suppress similar</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.behavior.requiresComment}
                        onChange={(e) => setForm((f) => ({ ...f, behavior: { ...f.behavior, requiresComment: e.target.checked } }))}
                        className="rounded"
                      />
                      <span className="text-sm">Requires comment</span>
                    </label>
                  </div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview (§1.1.2)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">How the feedback button will look:</p>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium"
                    style={{ backgroundColor: form.color?.trim() ? (form.color.trim().match(/^#[0-9A-Fa-f]{3,6}$/) ? form.color.trim() : undefined) : undefined, color: form.color?.trim() ? (form.color.trim().match(/^#[0-9A-Fa-f]{3,6}$/) ? '#fff' : undefined) : undefined }}
                    aria-hidden
                  >
                    {form.icon || '?'} {form.displayName.trim() || 'Display name'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Applicable to rec types (comma-separated)</label>
                  <input
                    type="text"
                    value={form.applicableToRecTypes.join(', ')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        applicableToRecTypes: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="e.g. mitigation, insight"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formSaving ? 'Saving…' : modalMode === 'create' ? 'Create' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {bulkModal === 'setCategory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="bulk-category-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h2 id="bulk-category-title" className="text-lg font-semibold mb-3">Set category for {selectedIds.size} types</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value as FeedbackTypeCategory)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                {(Object.keys(CATEGORY_LABELS) as FeedbackTypeCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBulkModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runBulk('setCategory', { category: bulkCategory })}
                disabled={bulkSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkSaving ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkModal === 'setSentiment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="bulk-sentiment-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h2 id="bulk-sentiment-title" className="text-lg font-semibold mb-3">Set sentiment for {selectedIds.size} types</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sentiment</label>
                <select
                  value={bulkSentiment}
                  onChange={(e) => {
                    const s = e.target.value as FeedbackSentiment;
                    setBulkSentiment(s);
                    setBulkSentimentScore(s === 'positive' ? 1 : s === 'negative' ? -1 : 0);
                  }}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  {(Object.keys(SENTIMENT_LABELS) as FeedbackSentiment[]).map((s) => (
                    <option key={s} value={s}>{SENTIMENT_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sentiment score (-1 to 1)</label>
                <input
                  type="number"
                  step="0.1"
                  min={-1}
                  max={1}
                  value={bulkSentimentScore}
                  onChange={(e) => setBulkSentimentScore(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBulkModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runBulk('setSentiment', { sentiment: bulkSentiment, sentimentScore: bulkSentimentScore })}
                disabled={bulkSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkSaving ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
