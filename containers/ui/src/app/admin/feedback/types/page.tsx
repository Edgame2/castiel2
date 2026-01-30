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
  const [sortBy, setSortBy] = useState<'displayName' | 'order' | 'updatedAt' | 'usageCount' | 'sentimentScore'>('order');
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
    setForm({
      name: (one as FeedbackTypeRow & { name?: string }).name ?? '',
      displayName: one.displayName ?? '',
      category: one.category ?? 'action',
      sentiment: one.sentiment ?? 'neutral',
      sentimentScore: one.sentimentScore ?? 0,
      icon: one.icon ?? '',
      color: one.color ?? '',
      order: one.order ?? 0,
      behavior: one.behavior ? { ...DEFAULT_BEHAVIOR, ...one.behavior } : { ...DEFAULT_BEHAVIOR },
      applicableToRecTypes: one.applicableToRecTypes ?? [],
      isActive: one.isActive ?? true,
      isDefault: one.isDefault ?? false,
    });
    setEditId(one.id);
    setModalMode('edit');
    setFormError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditId(null);
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
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
        behavior: form.behavior,
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
        behavior: form.behavior,
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

  const handleDelete = async (id: string) => {
    if (!apiBaseUrl) return;
    if (!window.confirm('Delete this feedback type? It cannot be default or in use, and must be inactive for 30 days.')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/feedback-types/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchTypes();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
            >
              Import from JSON
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
              onChange={(e) => setSortBy(e.target.value as 'displayName' | 'order' | 'updatedAt' | 'usageCount' | 'sentimentScore')}
              className="px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
              aria-label="Sort by"
            >
              <option value="order">Order</option>
              <option value="displayName">Name</option>
              <option value="usageCount">Usage</option>
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
                        <td className="p-3">{typeof t.usageCount === 'number' ? t.usageCount : '—'}</td>
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
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t.id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              Delete
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 id="modal-title" className="text-lg font-semibold mb-4">{modalTitle}</h2>
              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>
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
                  <label className="block text-sm font-medium mb-1">Display name</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sentiment score (-1 to 1)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={-1}
                      max={1}
                      value={form.sentimentScore}
                      onChange={(e) => setForm((f) => ({ ...f, sentimentScore: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Icon</label>
                    <input
                      type="text"
                      value={form.icon}
                      onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                      placeholder="e.g. ✓"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      placeholder="e.g. #22c55e"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
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
