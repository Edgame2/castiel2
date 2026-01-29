/**
 * Super Admin: Action Catalog — Entries (§2.1)
 * GET/POST/PUT/DELETE /api/v1/action-catalog/entries via gateway (risk-catalog).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type DecisionRulesPriority = 'critical' | 'high' | 'medium' | 'low';
type DecisionRulesUrgency = 'immediate' | 'this_week' | 'this_month' | 'flexible';

type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
type RiskImpactType = 'commercial' | 'technical' | 'legal' | 'competitive' | 'timeline' | 'resource';

interface RiskDetails {
  severity: RiskSeverity;
  impactType: RiskImpactType;
  indicators: string[];
  mitigatingRecommendations: string[];
}

const DEFAULT_RISK_DETAILS: RiskDetails = {
  severity: 'medium',
  impactType: 'commercial',
  indicators: [],
  mitigatingRecommendations: [],
};

type RecommendationTypeCatalog = 'next_action' | 'risk_mitigation' | 'reactivation' | 'content' | 'methodology';

interface ActionTemplate {
  title: string;
  description: string;
  actionItemsTemplate: string[];
  reasoningTemplate: string;
  expectedOutcomeTemplate: string;
}

interface RecommendationDetails {
  recommendationType: RecommendationTypeCatalog;
  actionTemplate: ActionTemplate;
  mitigatesRisks: string[];
  requiredData: string[];
}

const DEFAULT_ACTION_TEMPLATE: ActionTemplate = {
  title: '',
  description: '',
  actionItemsTemplate: [],
  reasoningTemplate: '',
  expectedOutcomeTemplate: '',
};

const DEFAULT_RECOMMENDATION_DETAILS: RecommendationDetails = {
  recommendationType: 'next_action',
  actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
  mitigatesRisks: [],
  requiredData: [],
};

interface DecisionRules {
  autoGenerate: boolean;
  priority: DecisionRulesPriority;
  urgency: DecisionRulesUrgency;
  suppressIfSimilarExists: boolean;
}

const DEFAULT_DECISION_RULES: DecisionRules = {
  autoGenerate: false,
  priority: 'medium',
  urgency: 'flexible',
  suppressIfSimilarExists: false,
};

interface ActionCatalogEntry {
  id: string;
  type: 'risk' | 'recommendation';
  category: string;
  subcategory?: string;
  name: string;
  displayName: string;
  description?: string;
  applicableIndustries?: string[];
  applicableStages?: string[];
  applicableMethodologies?: string[];
  riskDetails?: RiskDetails;
  recommendationDetails?: RecommendationDetails;
  decisionRules?: DecisionRules;
  status?: 'active' | 'deprecated' | 'draft';
  version?: number;
}

export default function ActionCatalogEntriesPage() {
  const [entries, setEntries] = useState<ActionCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'risk' | 'recommendation' | ''>('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editEntryType, setEditEntryType] = useState<'risk' | 'recommendation' | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    type: 'risk' as 'risk' | 'recommendation',
    category: '',
    subcategory: '',
    name: '',
    displayName: '',
    description: '',
    applicableIndustries: [] as string[],
    applicableStages: [] as string[],
    applicableMethodologies: [] as string[],
    riskDetails: { ...DEFAULT_RISK_DETAILS },
    recommendationDetails: {
      ...DEFAULT_RECOMMENDATION_DETAILS,
      actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
    },
    decisionRules: { ...DEFAULT_DECISION_RULES },
    status: 'active' as 'active' | 'deprecated' | 'draft',
  });
  const [editForm, setEditForm] = useState({
    displayName: '',
    description: '',
    subcategory: '',
    applicableIndustries: [] as string[],
    applicableStages: [] as string[],
    applicableMethodologies: [] as string[],
    riskDetails: { ...DEFAULT_RISK_DETAILS },
    recommendationDetails: {
      ...DEFAULT_RECOMMENDATION_DETAILS,
      actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
    },
    decisionRules: { ...DEFAULT_DECISION_RULES },
    status: 'active' as 'active' | 'deprecated' | 'draft',
  });

  const fetchEntries = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = typeFilter ? `?type=${typeFilter}` : '';
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries${params}`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setEntries(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const fetchOne = useCallback(async (entryId: string): Promise<ActionCatalogEntry | null> => {
    if (!apiBaseUrl) return null;
    const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries/${encodeURIComponent(entryId)}`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    document.title = 'Entries | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const openCreate = () => {
    setCreateForm({
      type: 'risk',
      category: '',
      subcategory: '',
      name: '',
      displayName: '',
      description: '',
      applicableIndustries: [],
      applicableStages: [],
      applicableMethodologies: [],
      riskDetails: { ...DEFAULT_RISK_DETAILS },
      recommendationDetails: {
        ...DEFAULT_RECOMMENDATION_DETAILS,
        actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
      },
      decisionRules: { ...DEFAULT_DECISION_RULES },
      status: 'active',
    });
    setEditId(null);
    setEditEntryType(null);
    setModalMode('create');
    setFormError(null);
  };

  const openEdit = async (entry: ActionCatalogEntry) => {
    const one = await fetchOne(entry.id);
    if (!one) {
      setError('Failed to load entry');
      return;
    }
    setEditForm({
      displayName: one.displayName ?? one.name ?? '',
      description: one.description ?? '',
      subcategory: one.subcategory ?? '',
      applicableIndustries: one.applicableIndustries ?? [],
      applicableStages: one.applicableStages ?? [],
      applicableMethodologies: one.applicableMethodologies ?? [],
      riskDetails: one.type === 'risk' && one.riskDetails
        ? {
            severity: (one.riskDetails.severity ?? DEFAULT_RISK_DETAILS.severity) as RiskSeverity,
            impactType: (one.riskDetails.impactType ?? DEFAULT_RISK_DETAILS.impactType) as RiskImpactType,
            indicators: one.riskDetails.indicators ?? [],
            mitigatingRecommendations: one.riskDetails.mitigatingRecommendations ?? [],
          }
        : { ...DEFAULT_RISK_DETAILS },
      recommendationDetails:
        one.type === 'recommendation' && one.recommendationDetails
          ? {
              recommendationType: (one.recommendationDetails.recommendationType ?? DEFAULT_RECOMMENDATION_DETAILS.recommendationType) as RecommendationTypeCatalog,
              actionTemplate: one.recommendationDetails.actionTemplate
                ? {
                    title: one.recommendationDetails.actionTemplate.title ?? '',
                    description: one.recommendationDetails.actionTemplate.description ?? '',
                    actionItemsTemplate: one.recommendationDetails.actionTemplate.actionItemsTemplate ?? [],
                    reasoningTemplate: one.recommendationDetails.actionTemplate.reasoningTemplate ?? '',
                    expectedOutcomeTemplate: one.recommendationDetails.actionTemplate.expectedOutcomeTemplate ?? '',
                  }
                : { ...DEFAULT_ACTION_TEMPLATE },
              mitigatesRisks: one.recommendationDetails.mitigatesRisks ?? [],
              requiredData: one.recommendationDetails.requiredData ?? [],
            }
          : {
              ...DEFAULT_RECOMMENDATION_DETAILS,
              actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
            },
      decisionRules: one.decisionRules
        ? {
            autoGenerate: one.decisionRules.autoGenerate ?? DEFAULT_DECISION_RULES.autoGenerate,
            priority: (one.decisionRules.priority ?? DEFAULT_DECISION_RULES.priority) as DecisionRulesPriority,
            urgency: (one.decisionRules.urgency ?? DEFAULT_DECISION_RULES.urgency) as DecisionRulesUrgency,
            suppressIfSimilarExists: one.decisionRules.suppressIfSimilarExists ?? DEFAULT_DECISION_RULES.suppressIfSimilarExists,
          }
        : { ...DEFAULT_DECISION_RULES },
      status: (one.status as 'active' | 'deprecated' | 'draft') ?? 'active',
    });
    setEditId(one.id);
    setEditEntryType(one.type);
    setModalMode('edit');
    setFormError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditId(null);
    setEditEntryType(null);
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        type: createForm.type,
        category: createForm.category.trim(),
        subcategory: createForm.subcategory.trim() || undefined,
        name: createForm.name.trim(),
        displayName: createForm.displayName.trim(),
        description: createForm.description.trim(),
        applicableIndustries: createForm.applicableIndustries.length > 0 ? createForm.applicableIndustries : undefined,
        applicableStages: createForm.applicableStages.length > 0 ? createForm.applicableStages : undefined,
        applicableMethodologies: createForm.applicableMethodologies.length > 0 ? createForm.applicableMethodologies : undefined,
        ...(createForm.type === 'risk' ? { riskDetails: createForm.riskDetails } : {}),
        ...(createForm.type === 'recommendation' ? { recommendationDetails: createForm.recommendationDetails } : {}),
        decisionRules: createForm.decisionRules,
        status: createForm.status,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchEntries();
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
        displayName: editForm.displayName.trim(),
        description: editForm.description.trim(),
        subcategory: editForm.subcategory.trim() || undefined,
        applicableIndustries: editForm.applicableIndustries,
        applicableStages: editForm.applicableStages,
        applicableMethodologies: editForm.applicableMethodologies,
        ...(editEntryType === 'risk' ? { riskDetails: editForm.riskDetails } : {}),
        ...(editEntryType === 'recommendation' ? { recommendationDetails: editForm.recommendationDetails } : {}),
        decisionRules: editForm.decisionRules,
        status: editForm.status,
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      closeModal();
      await fetchEntries();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!apiBaseUrl) return;
    if (!window.confirm('Delete this action catalog entry?')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries/${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const modalTitle = modalMode === 'create' ? 'Create action catalog entry' : 'Edit action catalog entry';

  const subNav = (
    <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
      <Link
        href="/admin/action-catalog"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Overview
      </Link>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
        Entries
      </span>
      <Link
        href="/admin/action-catalog/categories"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Categories
      </Link>
      <Link
        href="/admin/action-catalog/relationships"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Relationships
      </Link>
    </nav>
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
        <Link href="/admin/action-catalog" className="text-sm font-medium hover:underline">
          Action Catalog
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Entries</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Entries</h1>
      <p className="text-muted-foreground mb-2">
        Manage action catalog entries (risks and recommendations) for the current tenant.
      </p>
      <p className="mb-4 text-sm text-gray-500">
        For tenant catalog view (categories, templates, industry risks), see{' '}
        <Link href="/admin/risk-catalog" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Risk Catalog
        </Link>
        .
      </p>
      {subNav}

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Create entry
          </button>
          <div>
            <label className="block text-sm font-medium mb-1">Type filter</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'risk' | 'recommendation' | '')}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              <option value="risk">Risk</option>
              <option value="recommendation">Recommendation</option>
            </select>
          </div>
          <button
            type="button"
            onClick={fetchEntries}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
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

      {!loading && !error && (
        <div className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Entries</h2>
          </div>
          {entries.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-gray-500">No entries for this tenant.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Category</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Version</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-2 px-4">{e.type}</td>
                      <td className="py-2 px-4">
                        <span className="font-medium">{e.displayName || e.name}</span>
                        {e.description ? (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{e.description}</p>
                        ) : null}
                      </td>
                      <td className="py-2 px-4">{e.category}{e.subcategory ? ` / ${e.subcategory}` : ''}</td>
                      <td className="py-2 px-4">{e.status ?? '—'}</td>
                      <td className="py-2 px-4">{e.version ?? '—'}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(e)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
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

      {modalMode === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 id="modal-title" className="text-lg font-semibold mb-4">{modalTitle}</h2>
              {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as 'risk' | 'recommendation' }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="risk">Risk</option>
                    <option value="recommendation">Recommendation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={createForm.category}
                    onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subcategory (optional)</label>
                  <input
                    type="text"
                    value={createForm.subcategory}
                    onChange={(e) => setCreateForm((f) => ({ ...f, subcategory: e.target.value }))}
                    placeholder="e.g. technical, commercial"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name (slug)</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. high_risk_stalled"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Display name</label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                {createForm.type === 'risk' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk details</span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Severity</label>
                        <select
                          value={createForm.riskDetails.severity}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              riskDetails: { ...f.riskDetails, severity: e.target.value as RiskSeverity },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Impact type</label>
                        <select
                          value={createForm.riskDetails.impactType}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              riskDetails: { ...f.riskDetails, impactType: e.target.value as RiskImpactType },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="commercial">Commercial</option>
                          <option value="technical">Technical</option>
                          <option value="legal">Legal</option>
                          <option value="competitive">Competitive</option>
                          <option value="timeline">Timeline</option>
                          <option value="resource">Resource</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Indicators (comma-separated)</label>
                        <input
                          type="text"
                          value={createForm.riskDetails.indicators.join(', ')}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              riskDetails: {
                                ...f.riskDetails,
                                indicators: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. stalled stage, low activity"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Mitigating recommendations (IDs, comma-separated)</label>
                        <input
                          type="text"
                          value={createForm.riskDetails.mitigatingRecommendations.join(', ')}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              riskDetails: {
                                ...f.riskDetails,
                                mitigatingRecommendations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. rec-id-1, rec-id-2"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {createForm.type === 'recommendation' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommendation details</span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Recommendation type</label>
                        <select
                          value={createForm.recommendationDetails.recommendationType}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                recommendationType: e.target.value as RecommendationTypeCatalog,
                              },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="next_action">Next action</option>
                          <option value="risk_mitigation">Risk mitigation</option>
                          <option value="reactivation">Reactivation</option>
                          <option value="content">Content</option>
                          <option value="methodology">Methodology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action template: title</label>
                        <input
                          type="text"
                          value={createForm.recommendationDetails.actionTemplate.title}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, title: e.target.value },
                              },
                            }))
                          }
                          placeholder="e.g. Schedule discovery call"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action template: description</label>
                        <input
                          type="text"
                          value={createForm.recommendationDetails.actionTemplate.description}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, description: e.target.value },
                              },
                            }))
                          }
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action items (comma-separated)</label>
                        <input
                          type="text"
                          value={createForm.recommendationDetails.actionTemplate.actionItemsTemplate.join(', ')}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: {
                                  ...f.recommendationDetails.actionTemplate,
                                  actionItemsTemplate: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                },
                              },
                            }))
                          }
                          placeholder="e.g. Call champion, Send deck"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Reasoning template</label>
                        <input
                          type="text"
                          value={createForm.recommendationDetails.actionTemplate.reasoningTemplate}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, reasoningTemplate: e.target.value },
                              },
                            }))
                          }
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Expected outcome template</label>
                        <input
                          type="text"
                          value={createForm.recommendationDetails.actionTemplate.expectedOutcomeTemplate}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, expectedOutcomeTemplate: e.target.value },
                              },
                            }))
                          }
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Mitigates risks (IDs, comma-separated)</label>
                        <input
                          type="text"
                          value={createForm.recommendationDetails.mitigatesRisks.join(', ')}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                mitigatesRisks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. risk-id-1, risk-id-2"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Required data (comma-separated)</label>
                        <input
                          type="text"
                          value={createForm.recommendationDetails.requiredData.join(', ')}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                requiredData: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. stage, amount"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Applicable industries (comma-separated)</label>
                  <input
                    type="text"
                    value={createForm.applicableIndustries.join(', ')}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        applicableIndustries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="e.g. technology, healthcare"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Applicable stages (comma-separated)</label>
                  <input
                    type="text"
                    value={createForm.applicableStages.join(', ')}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        applicableStages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="e.g. discovery, negotiation"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Applicable methodologies (comma-separated)</label>
                  <input
                    type="text"
                    value={createForm.applicableMethodologies.join(', ')}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        applicableMethodologies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="e.g. MEDDIC, Challenger"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decision rules</span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="createAutoGenerate"
                        checked={createForm.decisionRules.autoGenerate}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, autoGenerate: e.target.checked },
                          }))
                        }
                        className="rounded"
                      />
                      <label htmlFor="createAutoGenerate" className="text-sm">Auto-generate</label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Priority</label>
                      <select
                        value={createForm.decisionRules.priority}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, priority: e.target.value as DecisionRulesPriority },
                          }))
                        }
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Urgency</label>
                      <select
                        value={createForm.decisionRules.urgency}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, urgency: e.target.value as DecisionRulesUrgency },
                          }))
                        }
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      >
                        <option value="immediate">Immediate</option>
                        <option value="this_week">This week</option>
                        <option value="this_month">This month</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="createSuppressIfSimilar"
                        checked={createForm.decisionRules.suppressIfSimilarExists}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, suppressIfSimilarExists: e.target.checked },
                          }))
                        }
                        className="rounded"
                      />
                      <label htmlFor="createSuppressIfSimilar" className="text-sm">Suppress if similar exists</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as 'active' | 'deprecated' | 'draft' }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={formSaving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {formSaving ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'edit' && editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 id="modal-title" className="text-lg font-semibold mb-4">{modalTitle}</h2>
              {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}
              <form onSubmit={handleUpdate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Display name</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subcategory (optional)</label>
                  <input
                    type="text"
                    value={editForm.subcategory}
                    onChange={(e) => setEditForm((f) => ({ ...f, subcategory: e.target.value }))}
                    placeholder="e.g. technical, commercial"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                {editEntryType === 'risk' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk details</span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Severity</label>
                        <select
                          value={editForm.riskDetails.severity}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              riskDetails: { ...f.riskDetails, severity: e.target.value as RiskSeverity },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Impact type</label>
                        <select
                          value={editForm.riskDetails.impactType}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              riskDetails: { ...f.riskDetails, impactType: e.target.value as RiskImpactType },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="commercial">Commercial</option>
                          <option value="technical">Technical</option>
                          <option value="legal">Legal</option>
                          <option value="competitive">Competitive</option>
                          <option value="timeline">Timeline</option>
                          <option value="resource">Resource</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Indicators (comma-separated)</label>
                        <input
                          type="text"
                          value={editForm.riskDetails.indicators.join(', ')}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              riskDetails: {
                                ...f.riskDetails,
                                indicators: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. stalled stage, low activity"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Mitigating recommendations (IDs, comma-separated)</label>
                        <input
                          type="text"
                          value={editForm.riskDetails.mitigatingRecommendations.join(', ')}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              riskDetails: {
                                ...f.riskDetails,
                                mitigatingRecommendations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. rec-id-1, rec-id-2"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {editEntryType === 'recommendation' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommendation details</span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Recommendation type</label>
                        <select
                          value={editForm.recommendationDetails.recommendationType}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                recommendationType: e.target.value as RecommendationTypeCatalog,
                              },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="next_action">Next action</option>
                          <option value="risk_mitigation">Risk mitigation</option>
                          <option value="reactivation">Reactivation</option>
                          <option value="content">Content</option>
                          <option value="methodology">Methodology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action template: title</label>
                        <input
                          type="text"
                          value={editForm.recommendationDetails.actionTemplate.title}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, title: e.target.value },
                              },
                            }))
                          }
                          placeholder="e.g. Schedule discovery call"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action template: description</label>
                        <input
                          type="text"
                          value={editForm.recommendationDetails.actionTemplate.description}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, description: e.target.value },
                              },
                            }))
                          }
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action items (comma-separated)</label>
                        <input
                          type="text"
                          value={editForm.recommendationDetails.actionTemplate.actionItemsTemplate.join(', ')}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: {
                                  ...f.recommendationDetails.actionTemplate,
                                  actionItemsTemplate: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                },
                              },
                            }))
                          }
                          placeholder="e.g. Call champion, Send deck"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Reasoning template</label>
                        <input
                          type="text"
                          value={editForm.recommendationDetails.actionTemplate.reasoningTemplate}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, reasoningTemplate: e.target.value },
                              },
                            }))
                          }
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Expected outcome template</label>
                        <input
                          type="text"
                          value={editForm.recommendationDetails.actionTemplate.expectedOutcomeTemplate}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionTemplate: { ...f.recommendationDetails.actionTemplate, expectedOutcomeTemplate: e.target.value },
                              },
                            }))
                          }
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Mitigates risks (IDs, comma-separated)</label>
                        <input
                          type="text"
                          value={editForm.recommendationDetails.mitigatesRisks.join(', ')}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                mitigatesRisks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. risk-id-1, risk-id-2"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Required data (comma-separated)</label>
                        <input
                          type="text"
                          value={editForm.recommendationDetails.requiredData.join(', ')}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                requiredData: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              },
                            }))
                          }
                          placeholder="e.g. stage, amount"
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Applicable industries (comma-separated)</label>
                  <input
                    type="text"
                    value={editForm.applicableIndustries.join(', ')}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        applicableIndustries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="e.g. technology, healthcare"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Applicable stages (comma-separated)</label>
                  <input
                    type="text"
                    value={editForm.applicableStages.join(', ')}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        applicableStages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="e.g. discovery, negotiation"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Applicable methodologies (comma-separated)</label>
                  <input
                    type="text"
                    value={editForm.applicableMethodologies.join(', ')}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        applicableMethodologies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="e.g. MEDDIC, Challenger"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decision rules</span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editAutoGenerate"
                        checked={editForm.decisionRules.autoGenerate}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, autoGenerate: e.target.checked },
                          }))
                        }
                        className="rounded"
                      />
                      <label htmlFor="editAutoGenerate" className="text-sm">Auto-generate</label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Priority</label>
                      <select
                        value={editForm.decisionRules.priority}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, priority: e.target.value as DecisionRulesPriority },
                          }))
                        }
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Urgency</label>
                      <select
                        value={editForm.decisionRules.urgency}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, urgency: e.target.value as DecisionRulesUrgency },
                          }))
                        }
                        className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      >
                        <option value="immediate">Immediate</option>
                        <option value="this_week">This week</option>
                        <option value="this_month">This month</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editSuppressIfSimilar"
                        checked={editForm.decisionRules.suppressIfSimilarExists}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            decisionRules: { ...f.decisionRules, suppressIfSimilarExists: e.target.checked },
                          }))
                        }
                        className="rounded"
                      />
                      <label htmlFor="editSuppressIfSimilar" className="text-sm">Suppress if similar exists</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as 'active' | 'deprecated' | 'draft' }))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={formSaving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {formSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
