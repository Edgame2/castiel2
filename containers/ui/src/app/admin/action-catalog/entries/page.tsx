/**
 * Super Admin: Action Catalog — Entries (§2.1)
 * GET/POST/PUT/DELETE /api/v1/action-catalog/entries via gateway (risk-catalog).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/** §2.1.2/§2.1.3 Step 3 Applicability: opportunity types */
const OPPORTUNITY_TYPES = ['new_business', 'renewal', 'expansion'] as const;

type DecisionRulesPriority = 'critical' | 'high' | 'medium' | 'low';
type DecisionRulesUrgency = 'immediate' | 'this_week' | 'this_month' | 'flexible';

type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
type RiskImpactType = 'commercial' | 'technical' | 'legal' | 'competitive' | 'timeline' | 'resource';

/** Impact assessment per §2.1.2 Create Risk Entry */
interface RiskImpactAssessment {
  probabilityDecrease?: number;
  revenueAtRisk?: number;
  timelineDelay?: number;
  description?: string;
}

/** §2.1.2 Step 4: notification rules when risk is detected */
interface RiskNotificationRules {
  notifyOwner?: boolean;
  notifyManager?: boolean;
  escalateIfCritical?: boolean;
  escalationDelayHours?: number;
}

interface RiskDetails {
  severity: RiskSeverity;
  impactType: RiskImpactType;
  indicators: string[];
  mitigatingRecommendations: string[];
  impact?: RiskImpactAssessment;
  mlFeatures?: string[];
  mlThreshold?: number;
  autoDetect?: boolean;
  notificationRules?: RiskNotificationRules;
}

const DEFAULT_RISK_IMPACT: RiskImpactAssessment = {
  description: '',
};

const DEFAULT_RISK_NOTIFICATION_RULES: RiskNotificationRules = {
  notifyOwner: true,
  notifyManager: false,
  escalateIfCritical: false,
  escalationDelayHours: 24,
};

const DEFAULT_RISK_DETAILS: RiskDetails = {
  severity: 'medium',
  impactType: 'commercial',
  indicators: [],
  mitigatingRecommendations: [],
  impact: { ...DEFAULT_RISK_IMPACT },
  mlFeatures: [],
  autoDetect: false,
  notificationRules: { ...DEFAULT_RISK_NOTIFICATION_RULES },
};

type RecommendationTypeCatalog = 'next_action' | 'risk_mitigation' | 'reactivation' | 'content' | 'methodology';

/** §2.1.3 Create Recommendation Entry */
type RecommendationActionType = 'meeting' | 'email' | 'task' | 'document' | 'question' | 'analysis';

interface RecommendationExpectedOutcome {
  description: string;
  quantifiedImpact?: string;
  impactType?: 'probability' | 'revenue' | 'timeline' | 'risk_reduction' | 'efficiency';
  confidence?: 'low' | 'medium' | 'high';
  evidence?: string;
}

interface RecommendationImplementation {
  effort?: 'low' | 'medium' | 'high';
  complexity?: 'simple' | 'moderate' | 'complex';
  estimatedTime?: string;
  prerequisites?: string[];
  skillsRequired?: string[];
}

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
  actionType?: RecommendationActionType;
  expectedOutcome?: RecommendationExpectedOutcome;
  implementation?: RecommendationImplementation;
}

const DEFAULT_ACTION_TEMPLATE: ActionTemplate = {
  title: '',
  description: '',
  actionItemsTemplate: [],
  reasoningTemplate: '',
  expectedOutcomeTemplate: '',
};

const DEFAULT_EXPECTED_OUTCOME: RecommendationExpectedOutcome = { description: '' };
const DEFAULT_IMPLEMENTATION: RecommendationImplementation = {};

const DEFAULT_RECOMMENDATION_DETAILS: RecommendationDetails = {
  recommendationType: 'next_action',
  actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
  mitigatesRisks: [],
  requiredData: [],
  expectedOutcome: { ...DEFAULT_EXPECTED_OUTCOME },
  implementation: { ...DEFAULT_IMPLEMENTATION },
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

interface CatalogUsage {
  timesGenerated?: number;
  avgFeedbackSentiment?: number;
  avgActionRate?: number;
  avgImpact?: number;
}

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
  applicableOpportunityTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  riskDetails?: RiskDetails;
  recommendationDetails?: RecommendationDetails;
  decisionRules?: DecisionRules;
  status?: 'active' | 'deprecated' | 'draft';
  version?: number;
  usage?: CatalogUsage;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  tenantId?: string;
  partitionKey?: string;
}

export default function ActionCatalogEntriesPage() {
  const [entries, setEntries] = useState<ActionCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'risk' | 'recommendation' | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'' | 'global' | 'tenant'>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'draft' | 'deprecated' | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [methodologyFilter, setMethodologyFilter] = useState('');
  const [effectivenessFilter, setEffectivenessFilter] = useState<'' | 'high' | 'medium' | 'low'>('');
  const [createdByQuery, setCreatedByQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'' | 'name' | 'category' | 'status' | 'type' | 'effectiveness' | 'createdAt'>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalMode, setModalMode] = useState<'create' | 'create-unified' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editEntryType, setEditEntryType] = useState<'risk' | 'recommendation' | null>(null);
  /** §2.1.5 Edit Catalog Entry: current version for version history display */
  const [editVersion, setEditVersion] = useState<number | null>(null);
  const [editVersionHistoryOpen, setEditVersionHistoryOpen] = useState(false);
  /** §2.1.5 Change impact: collapsible section open state */
  const [editChangeImpactOpen, setEditChangeImpactOpen] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [bulkDuplicating, setBulkDuplicating] = useState(false);
  const [bulkDeprecating, setBulkDeprecating] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json');
  const [exportIncludeRelationships, setExportIncludeRelationships] = useState(true);
  const [exportIncludeStatistics, setExportIncludeStatistics] = useState(true);
  const [exportIncludeVersionHistory, setExportIncludeVersionHistory] = useState(true);
  /** §2.1.1 Views: Table (default) | Timeline (by creation date) | Card (with previews) | Graph (visual links) */
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'card' | 'graph'>('table');
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  /** §2.1.6 Test Catalog Entry: entry under test (opens placeholder modal) */
  const [testEntry, setTestEntry] = useState<ActionCatalogEntry | null>(null);
  const [testSampleJson, setTestSampleJson] = useState('');
  const testSampleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bulkInProgress = bulkDuplicating || bulkDeprecating || importing;
  /** §2.1.2 / §2.1.3 Create entry: multi-step wizard (1–5) */
  const [createWizardStep, setCreateWizardStep] = useState(1);
  /** §2.1.4 Create Unified Entry: combined risk + recommendation wizard (1–6) */
  const [unifiedWizardStep, setUnifiedWizardStep] = useState(1);
  const [unifiedForm, setUnifiedForm] = useState({
    category: '',
    subcategory: '',
    riskName: '',
    riskDisplayName: '',
    riskDescription: '',
    recName: '',
    recDisplayName: '',
    recDescription: '',
    riskDetails: { ...DEFAULT_RISK_DETAILS },
    recommendationDetails: {
      ...DEFAULT_RECOMMENDATION_DETAILS,
      actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
      expectedOutcome: { ...DEFAULT_EXPECTED_OUTCOME },
      implementation: { ...DEFAULT_IMPLEMENTATION },
    },
    applicableIndustries: [] as string[],
    applicableStages: [] as string[],
    applicableMethodologies: [] as string[],
    applicableOpportunityTypes: [] as string[],
    minAmount: undefined as number | undefined,
    maxAmount: undefined as number | undefined,
    decisionRules: { ...DEFAULT_DECISION_RULES },
    status: 'active' as 'active' | 'deprecated' | 'draft',
  });
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
    applicableOpportunityTypes: [] as string[],
    minAmount: undefined as number | undefined,
    maxAmount: undefined as number | undefined,
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
    applicableOpportunityTypes: [] as string[],
    minAmount: undefined as number | undefined,
    maxAmount: undefined as number | undefined,
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

  /** §2.1.6 Test Catalog Entry: focus first focusable (textarea) when modal opens for keyboard users */
  useEffect(() => {
    if (testEntry && testSampleTextareaRef.current) {
      const t = testSampleTextareaRef.current;
      const id = requestAnimationFrame(() => t.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [testEntry]);

  /** §2.1.6 Test Catalog Entry: Escape key closes modal */
  useEffect(() => {
    if (!testEntry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTestEntry(null);
        setTestSampleJson('');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [testEntry]);

  /** Export dialog: Escape key closes */
  useEffect(() => {
    if (!exportDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportDialogOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [exportDialogOpen]);

  /** Create / Edit / Create-unified modals: Escape key closes */
  useEffect(() => {
    const open = modalMode === 'create' || modalMode === 'edit' || modalMode === 'create-unified';
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalMode]);

  useEffect(() => {
    document.title = 'Entries | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const categories = Array.from(new Set(entries.map((e) => e.category).filter(Boolean))).sort();
  const industries = Array.from(new Set(entries.flatMap((e) => e.applicableIndustries ?? []).filter(Boolean))).sort();
  const stages = Array.from(new Set(entries.flatMap((e) => e.applicableStages ?? []).filter(Boolean))).sort();
  const methodologies = Array.from(new Set(entries.flatMap((e) => e.applicableMethodologies ?? []).filter(Boolean))).sort();

  const effectivenessValue = (e: ActionCatalogEntry): number | null => {
    const u = e.usage;
    const v = u?.avgImpact ?? u?.avgActionRate;
    return typeof v === 'number' ? v : null;
  };

  const q = searchQuery.trim().toLowerCase();
  const createdByQ = createdByQuery.trim().toLowerCase();
  const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTs = dateTo ? new Date(dateTo).getTime() + 86399999 : null;

  const filtered = entries.filter((e) => {
    if (categoryFilter && e.category !== categoryFilter) return false;
    if (scopeFilter) {
      const tid = e.tenantId ?? e.partitionKey ?? '';
      if (scopeFilter === 'global' && tid !== 'system') return false;
      if (scopeFilter === 'tenant' && (!tid || tid === 'system')) return false;
    }
    if (statusFilter && (e.status ?? '') !== statusFilter) return false;
    if (industryFilter) {
      const list = e.applicableIndustries ?? [];
      if (!list.includes(industryFilter)) return false;
    }
    if (stageFilter) {
      const list = e.applicableStages ?? [];
      if (!list.includes(stageFilter)) return false;
    }
    if (methodologyFilter) {
      const list = e.applicableMethodologies ?? [];
      if (!list.includes(methodologyFilter)) return false;
    }
    if (effectivenessFilter) {
      const v = effectivenessValue(e);
      if (v === null) return false;
      if (effectivenessFilter === 'high' && v < 0.7) return false;
      if (effectivenessFilter === 'medium' && (v < 0.4 || v >= 0.7)) return false;
      if (effectivenessFilter === 'low' && v >= 0.4) return false;
    }
    if (createdByQ && !(e.createdBy ?? '').toLowerCase().includes(createdByQ)) return false;
    if (fromTs != null) {
      const created = e.createdAt ? new Date(e.createdAt).getTime() : 0;
      if (created < fromTs) return false;
    }
    if (toTs != null) {
      const created = e.createdAt ? new Date(e.createdAt).getTime() : 0;
      if (created > toTs) return false;
    }
    if (q) {
      const name = (e.name ?? '').toLowerCase();
      const displayName = (e.displayName ?? '').toLowerCase();
      const description = (e.description ?? '').toLowerCase();
      if (!name.includes(q) && !displayName.includes(q) && !description.includes(q)) return false;
    }
    return true;
  });

  const sorted = (() => {
    if (!sortBy) return filtered;
    const arr = [...filtered];
    const mult = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      switch (sortBy) {
        case 'name':
          va = (a.displayName ?? a.name ?? '').toLowerCase();
          vb = (b.displayName ?? b.name ?? '').toLowerCase();
          return mult * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'category':
          va = (a.category ?? '').toLowerCase();
          vb = (b.category ?? '').toLowerCase();
          return mult * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'status':
          va = a.status ?? '';
          vb = b.status ?? '';
          return mult * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'type':
          va = a.type ?? '';
          vb = b.type ?? '';
          return mult * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'effectiveness': {
          const effA = effectivenessValue(a);
          const effB = effectivenessValue(b);
          const na = effA ?? -1;
          const nb = effB ?? -1;
          return mult * (na - nb);
        }
        case 'createdAt': {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return mult * (ta - tb);
        }
        default:
          return 0;
      }
    });
    return arr;
  })();

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    const n = sorted.length;
    const sel = selectedEntryIds.size;
    el.indeterminate = n > 0 && sel > 0 && sel < n;
  }, [selectedEntryIds.size, sorted.length]);

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
      applicableOpportunityTypes: [],
      minAmount: undefined,
      maxAmount: undefined,
      riskDetails: { ...DEFAULT_RISK_DETAILS },
      recommendationDetails: {
        ...DEFAULT_RECOMMENDATION_DETAILS,
        actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
        expectedOutcome: { ...DEFAULT_EXPECTED_OUTCOME },
        implementation: { ...DEFAULT_IMPLEMENTATION },
      },
      decisionRules: { ...DEFAULT_DECISION_RULES },
      status: 'active',
    });
    setEditId(null);
    setEditEntryType(null);
    setModalMode('create');
    setCreateWizardStep(1);
    setFormError(null);
  };

  /** §2.1.4 Create Unified Entry: open combined risk + recommendation wizard */
  const openCreateUnified = () => {
    setUnifiedForm({
      category: '',
      subcategory: '',
      riskName: '',
      riskDisplayName: '',
      riskDescription: '',
      recName: '',
      recDisplayName: '',
      recDescription: '',
      riskDetails: { ...DEFAULT_RISK_DETAILS },
      recommendationDetails: {
        ...DEFAULT_RECOMMENDATION_DETAILS,
        actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
        expectedOutcome: { ...DEFAULT_EXPECTED_OUTCOME },
        implementation: { ...DEFAULT_IMPLEMENTATION },
      },
      applicableIndustries: [],
      applicableStages: [],
      applicableMethodologies: [],
      applicableOpportunityTypes: [],
      minAmount: undefined,
      maxAmount: undefined,
      decisionRules: { ...DEFAULT_DECISION_RULES },
      status: 'active',
    });
    setEditId(null);
    setEditEntryType(null);
    setModalMode('create-unified');
    setUnifiedWizardStep(1);
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
      applicableOpportunityTypes: one.applicableOpportunityTypes ?? [],
      minAmount: one.minAmount ?? undefined,
      maxAmount: one.maxAmount ?? undefined,
      riskDetails: one.type === 'risk' && one.riskDetails
        ? {
            severity: (one.riskDetails.severity ?? DEFAULT_RISK_DETAILS.severity) as RiskSeverity,
            impactType: (one.riskDetails.impactType ?? DEFAULT_RISK_DETAILS.impactType) as RiskImpactType,
            indicators: one.riskDetails.indicators ?? [],
            mitigatingRecommendations: one.riskDetails.mitigatingRecommendations ?? [],
            impact: one.riskDetails.impact ?? undefined,
            mlFeatures: one.riskDetails.mlFeatures ?? [],
            mlThreshold: one.riskDetails.mlThreshold ?? undefined,
            autoDetect: one.riskDetails.autoDetect ?? false,
            notificationRules: one.riskDetails.notificationRules ? { ...DEFAULT_RISK_NOTIFICATION_RULES, ...one.riskDetails.notificationRules } : undefined,
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
              actionType: one.recommendationDetails.actionType ?? undefined,
              expectedOutcome: one.recommendationDetails.expectedOutcome ? { ...DEFAULT_EXPECTED_OUTCOME, ...one.recommendationDetails.expectedOutcome } : undefined,
              implementation: one.recommendationDetails.implementation ? { ...DEFAULT_IMPLEMENTATION, ...one.recommendationDetails.implementation } : undefined,
            }
          : {
              ...DEFAULT_RECOMMENDATION_DETAILS,
              actionTemplate: { ...DEFAULT_ACTION_TEMPLATE },
              expectedOutcome: { ...DEFAULT_EXPECTED_OUTCOME },
              implementation: { ...DEFAULT_IMPLEMENTATION },
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
    setEditVersion(one.version ?? 1);
    setModalMode('edit');
    setFormError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditId(null);
    setEditEntryType(null);
    setEditVersion(null);
    setEditVersionHistoryOpen(false);
    setEditChangeImpactOpen(false);
    setFormError(null);
    setCreateWizardStep(1);
    setUnifiedWizardStep(1);
  };

  const handleCreateSubmit = async (status: 'draft' | 'active') => {
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
        applicableOpportunityTypes: createForm.applicableOpportunityTypes.length > 0 ? createForm.applicableOpportunityTypes : undefined,
        minAmount: createForm.minAmount,
        maxAmount: createForm.maxAmount,
        ...(createForm.type === 'risk' ? { riskDetails: createForm.riskDetails } : {}),
        ...(createForm.type === 'recommendation' ? { recommendationDetails: createForm.recommendationDetails } : {}),
        decisionRules: createForm.decisionRules,
        status,
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

  /** §2.1.4 Create Unified Entry: create risk, then recommendation, then link both ways */
  const handleCreateUnifiedSubmit = async (status: 'draft' | 'active') => {
    if (!apiBaseUrl) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const applicability = {
        applicableIndustries: unifiedForm.applicableIndustries.length > 0 ? unifiedForm.applicableIndustries : undefined,
        applicableStages: unifiedForm.applicableStages.length > 0 ? unifiedForm.applicableStages : undefined,
        applicableMethodologies: unifiedForm.applicableMethodologies.length > 0 ? unifiedForm.applicableMethodologies : undefined,
        applicableOpportunityTypes: unifiedForm.applicableOpportunityTypes.length > 0 ? unifiedForm.applicableOpportunityTypes : undefined,
        minAmount: unifiedForm.minAmount,
        maxAmount: unifiedForm.maxAmount,
      };
      const riskBody = {
        type: 'risk' as const,
        category: unifiedForm.category.trim(),
        subcategory: unifiedForm.subcategory.trim() || undefined,
        name: unifiedForm.riskName.trim(),
        displayName: unifiedForm.riskDisplayName.trim(),
        description: unifiedForm.riskDescription.trim(),
        ...applicability,
        riskDetails: { ...unifiedForm.riskDetails, mitigatingRecommendations: [] },
        decisionRules: unifiedForm.decisionRules,
        status,
      };
      const riskRes = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riskBody),
      });
      const riskData = await riskRes.json().catch(() => ({}));
      if (!riskRes.ok) throw new Error((riskData?.error?.message as string) || `HTTP ${riskRes.status}`);
      const risk = riskData as ActionCatalogEntry;
      const recBody = {
        type: 'recommendation' as const,
        category: unifiedForm.category.trim(),
        subcategory: unifiedForm.subcategory.trim() || undefined,
        name: unifiedForm.recName.trim(),
        displayName: unifiedForm.recDisplayName.trim(),
        description: unifiedForm.recDescription.trim(),
        ...applicability,
        recommendationDetails: { ...unifiedForm.recommendationDetails, mitigatesRisks: [risk.id] },
        decisionRules: unifiedForm.decisionRules,
        status,
      };
      const recRes = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recBody),
      });
      const recData = await recRes.json().catch(() => ({}));
      if (!recRes.ok) throw new Error((recData?.error?.message as string) || `HTTP ${recRes.status}`);
      const rec = recData as ActionCatalogEntry;
      const updateRes = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries/${encodeURIComponent(risk.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskDetails: { ...risk.riskDetails, mitigatingRecommendations: [rec.id] },
        }),
      });
      const updateData = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok) throw new Error((updateData?.error?.message as string) || `HTTP ${updateRes.status}`);
      closeModal();
      await fetchEntries();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setFormSaving(false);
    }
  };

  const createWizardStepLabels = [
    'Basic Information',
    createForm.type === 'risk' ? 'Risk Details' : 'Recommendation Details',
    'Applicability',
    'Decision Rules',
    'Review & Create',
  ];

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
        applicableOpportunityTypes: editForm.applicableOpportunityTypes.length > 0 ? editForm.applicableOpportunityTypes : undefined,
        minAmount: editForm.minAmount,
        maxAmount: editForm.maxAmount,
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

  const handleDuplicate = async (entry: ActionCatalogEntry) => {
    if (!apiBaseUrl) return;
    const baseName = entry.name ?? entry.id ?? 'entry';
    const uniqueName = `${baseName}_copy_${Date.now()}`;
    const displayName = `${entry.displayName ?? entry.name ?? 'Entry'} (copy)`;
    const body = {
      type: entry.type,
      category: entry.category ?? '',
      subcategory: entry.subcategory ?? undefined,
      name: uniqueName,
      displayName,
      description: entry.description ?? '',
      applicableIndustries: entry.applicableIndustries ?? undefined,
      applicableStages: entry.applicableStages ?? undefined,
      applicableMethodologies: entry.applicableMethodologies ?? undefined,
      ...(entry.type === 'risk' ? { riskDetails: entry.riskDetails } : {}),
      ...(entry.type === 'recommendation' ? { recommendationDetails: entry.recommendationDetails } : {}),
      decisionRules: entry.decisionRules ?? undefined,
      status: 'draft' as const,
    };
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data?.error?.message as string) || `HTTP ${res.status}`);
      await fetchEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedEntryIds(new Set(sorted.map((e) => e.id)));
  };

  const clearSelection = () => {
    setSelectedEntryIds(new Set());
  };

  const handleBulkDuplicate = async () => {
    if (!apiBaseUrl || selectedEntryIds.size === 0) return;
    const toDuplicate = sorted.filter((e) => selectedEntryIds.has(e.id));
    if (!window.confirm(`Duplicate ${toDuplicate.length} entr${toDuplicate.length === 1 ? 'y' : 'ies'}? New copies will be created as drafts.`)) return;
    setBulkDuplicating(true);
    setError(null);
    let failed = false;
    for (let i = 0; i < toDuplicate.length; i++) {
      const entry = toDuplicate[i];
      const baseName = entry.name ?? entry.id ?? 'entry';
      const uniqueName = `${baseName}_copy_${Date.now()}_${i}`;
      const displayName = `${entry.displayName ?? entry.name ?? 'Entry'} (copy)`;
      const body = {
        type: entry.type,
        category: entry.category ?? '',
        subcategory: entry.subcategory ?? undefined,
        name: uniqueName,
        displayName,
        description: entry.description ?? '',
        applicableIndustries: entry.applicableIndustries ?? undefined,
        applicableStages: entry.applicableStages ?? undefined,
        applicableMethodologies: entry.applicableMethodologies ?? undefined,
        applicableOpportunityTypes: entry.applicableOpportunityTypes?.length ? entry.applicableOpportunityTypes : undefined,
        minAmount: entry.minAmount,
        maxAmount: entry.maxAmount,
        ...(entry.type === 'risk' ? { riskDetails: entry.riskDetails } : {}),
        ...(entry.type === 'recommendation' ? { recommendationDetails: entry.recommendationDetails } : {}),
        decisionRules: entry.decisionRules ?? undefined,
        status: 'draft' as const,
      };
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((data?.error?.message as string) || `HTTP ${res.status}`);
          failed = true;
          break;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        failed = true;
        break;
      }
    }
    setBulkDuplicating(false);
    if (!failed) {
      clearSelection();
      await fetchEntries();
    }
  };

  const handleBulkDeprecate = async () => {
    if (!apiBaseUrl || selectedEntryIds.size === 0) return;
    const toDeprecate = sorted.filter((e) => selectedEntryIds.has(e.id));
    if (!window.confirm(`Deprecate ${toDeprecate.length} entr${toDeprecate.length === 1 ? 'y' : 'ies'}? They will no longer be used for new recommendations.`)) return;
    setBulkDeprecating(true);
    setError(null);
    let failed = false;
    for (const entry of toDeprecate) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries/${encodeURIComponent(entry.id)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'deprecated' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((data?.error?.message as string) || `HTTP ${res.status}`);
          failed = true;
          break;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        failed = true;
        break;
      }
    }
    setBulkDeprecating(false);
    if (!failed) {
      clearSelection();
      await fetchEntries();
    }
  };

  /** §2.4.2 Export options: include relationships, statistics, version history */
  interface ExportOptions {
    includeRelationships: boolean;
    includeStatistics: boolean;
    includeVersionHistory: boolean;
  }

  const defaultExportOptions: ExportOptions = {
    includeRelationships: true,
    includeStatistics: true,
    includeVersionHistory: true,
  };

  /** Build payload for export; strips optional sections when options are false */
  const buildExportEntries = (data: ActionCatalogEntry[], options: ExportOptions): ActionCatalogEntry[] => {
    return data.map((e) => {
      const out: ActionCatalogEntry = { ...e };
      if (!options.includeRelationships) {
        if (out.recommendationDetails) {
          out.recommendationDetails = { ...out.recommendationDetails, mitigatesRisks: [] };
        }
        if (out.riskDetails) {
          out.riskDetails = { ...out.riskDetails, mitigatingRecommendations: [] };
        }
      }
      if (!options.includeStatistics && out.usage) {
        out.usage = undefined;
      }
      if (!options.includeVersionHistory) {
        out.version = undefined;
      }
      return out;
    });
  };

  const downloadJson = (data: ActionCatalogEntry[], filename: string, options: ExportOptions = defaultExportOptions) => {
    const payload = buildExportEntries(data, options);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** §2.4.2 Export format CSV: escape and flatten entries to CSV rows; optional columns per ExportOptions */
  const escapeCsv = (v: string): string => {
    if (!/[\n",]/.test(v)) return v;
    return `"${v.replace(/"/g, '""')}"`;
  };

  const entriesToCsv = (data: ActionCatalogEntry[], options: ExportOptions = defaultExportOptions): string => {
    const headers = [
      'id', 'type', 'category', 'subcategory', 'name', 'displayName', 'description', 'status',
      'applicableIndustries', 'applicableStages', 'applicableMethodologies',
      'applicableOpportunityTypes', 'minAmount', 'maxAmount',
      'createdAt', 'updatedAt', 'createdBy', 'tenantId',
    ];
    if (options.includeVersionHistory) headers.push('version');
    if (options.includeStatistics) {
      headers.push('timesGenerated', 'avgFeedbackSentiment', 'avgActionRate', 'avgImpact');
    }
    if (options.includeRelationships) {
      headers.push('mitigatesRisks', 'mitigatingRecommendations');
    }
    const rows = data.map((e) => {
      const row: string[] = [
        e.id ?? '',
        e.type ?? '',
        e.category ?? '',
        e.subcategory ?? '',
        e.name ?? '',
        e.displayName ?? '',
        (e.description ?? '').replace(/\r?\n/g, ' '),
        e.status ?? '',
        (e.applicableIndustries ?? []).join(';'),
        (e.applicableStages ?? []).join(';'),
        (e.applicableMethodologies ?? []).join(';'),
        (e.applicableOpportunityTypes ?? []).join(';'),
        e.minAmount != null ? String(e.minAmount) : '',
        e.maxAmount != null ? String(e.maxAmount) : '',
        e.createdAt ?? '',
        e.updatedAt ?? '',
        e.createdBy ?? '',
        e.tenantId ?? e.partitionKey ?? '',
      ];
      if (options.includeVersionHistory) row.push(String(e.version ?? ''));
      if (options.includeStatistics) {
        const u = e.usage;
        row.push(String(u?.timesGenerated ?? ''), String(u?.avgFeedbackSentiment ?? ''), String(u?.avgActionRate ?? ''), String(u?.avgImpact ?? ''));
      }
      if (options.includeRelationships) {
        const mitigates = e.recommendationDetails?.mitigatesRisks ?? [];
        const mitigating = e.riskDetails?.mitigatingRecommendations ?? [];
        row.push(mitigates.join(';'), mitigating.join(';'));
      }
      return row.map(String).map(escapeCsv);
    });
    return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const downloadCsv = (data: ActionCatalogEntry[], filename: string, options: ExportOptions = defaultExportOptions) => {
    const csv = entriesToCsv(data, options);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** §2.4.2 Export format Excel: same columns as CSV, one sheet */
  const entriesToSheetRows = (data: ActionCatalogEntry[], options: ExportOptions = defaultExportOptions): string[][] => {
    const headers = [
      'id', 'type', 'category', 'subcategory', 'name', 'displayName', 'description', 'status',
      'applicableIndustries', 'applicableStages', 'applicableMethodologies',
      'applicableOpportunityTypes', 'minAmount', 'maxAmount',
      'createdAt', 'updatedAt', 'createdBy', 'tenantId',
    ];
    if (options.includeVersionHistory) headers.push('version');
    if (options.includeStatistics) {
      headers.push('timesGenerated', 'avgFeedbackSentiment', 'avgActionRate', 'avgImpact');
    }
    if (options.includeRelationships) {
      headers.push('mitigatesRisks', 'mitigatingRecommendations');
    }
    const rows = data.map((e) => {
      const cells: string[] = [
        e.id ?? '',
        e.type ?? '',
        e.category ?? '',
        e.subcategory ?? '',
        e.name ?? '',
        e.displayName ?? '',
        (e.description ?? '').replace(/\r?\n/g, ' '),
        e.status ?? '',
        (e.applicableIndustries ?? []).join(';'),
        (e.applicableStages ?? []).join(';'),
        (e.applicableMethodologies ?? []).join(';'),
        (e.applicableOpportunityTypes ?? []).join(';'),
        e.minAmount != null ? String(e.minAmount) : '',
        e.maxAmount != null ? String(e.maxAmount) : '',
        e.createdAt ?? '',
        e.updatedAt ?? '',
        e.createdBy ?? '',
        e.tenantId ?? e.partitionKey ?? '',
      ];
      if (options.includeVersionHistory) cells.push(String(e.version ?? ''));
      if (options.includeStatistics) {
        const u = e.usage;
        cells.push(String(u?.timesGenerated ?? ''), String(u?.avgFeedbackSentiment ?? ''), String(u?.avgActionRate ?? ''), String(u?.avgImpact ?? ''));
      }
      if (options.includeRelationships) {
        const mitigates = e.recommendationDetails?.mitigatesRisks ?? [];
        const mitigating = e.riskDetails?.mitigatingRecommendations ?? [];
        cells.push(mitigates.join(';'), mitigating.join(';'));
      }
      return cells;
    });
    return [headers, ...rows];
  };

  const downloadExcel = (data: ActionCatalogEntry[], filename: string, options: ExportOptions = defaultExportOptions) => {
    const aoa = entriesToSheetRows(data, options);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalog');
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  };

  const handleExportSelected = () => {
    const toExport = sorted.filter((e) => selectedEntryIds.has(e.id));
    if (toExport.length === 0) return;
    downloadJson(toExport, `action-catalog-selected-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleExportAll = () => {
    if (entries.length === 0) return;
    downloadJson(entries, `action-catalog-all-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleExportSelectedCsv = () => {
    const toExport = sorted.filter((e) => selectedEntryIds.has(e.id));
    if (toExport.length === 0) return;
    downloadCsv(toExport, `action-catalog-selected-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportAllCsv = () => {
    if (entries.length === 0) return;
    downloadCsv(entries, `action-catalog-all-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  /** §2.4.2 Export dialog: run export with chosen scope, format, and options */
  const handleExportFromDialog = () => {
    const toExport = exportScope === 'selected'
      ? sorted.filter((e) => selectedEntryIds.has(e.id))
      : [...entries];
    if (exportScope === 'selected' && toExport.length === 0) return;
    if (exportScope === 'all' && toExport.length === 0) return;
    const opts: ExportOptions = {
      includeRelationships: exportIncludeRelationships,
      includeStatistics: exportIncludeStatistics,
      includeVersionHistory: exportIncludeVersionHistory,
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    const scopeStr = exportScope === 'selected' ? 'selected' : 'all';
    if (exportFormat === 'json') {
      downloadJson(toExport, `action-catalog-${scopeStr}-${dateStr}.json`, opts);
    } else if (exportFormat === 'excel') {
      downloadExcel(toExport, `action-catalog-${scopeStr}-${dateStr}.xlsx`, opts);
    } else {
      downloadCsv(toExport, `action-catalog-${scopeStr}-${dateStr}.csv`, opts);
    }
    setExportDialogOpen(false);
  };

  /** §2.4.1 Parse CSV (simplified format): RFC 4180-style quoted fields */
  const parseCsv = (raw: string): { headers: string[]; rows: string[][] } => {
    const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let i = 0;
      while (i < line.length) {
        if (line[i] === '"') {
          let s = '';
          i += 1;
          while (i < line.length) {
            if (line[i] === '"' && line[i + 1] === '"') {
              s += '"';
              i += 2;
            } else if (line[i] === '"') {
              i += 1;
              break;
            } else {
              s += line[i];
              i += 1;
            }
          }
          out.push(s);
          if (line[i] === ',') i += 1;
        } else {
          let s = '';
          while (i < line.length && line[i] !== ',') {
            s += line[i];
            i += 1;
          }
          out.push(s.trim());
          if (line[i] === ',') i += 1;
        }
      }
      return out;
    };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
    return { headers, rows };
  };

  /** §2.4.1 Map CSV rows to entry-like objects; align with export columns */
  const csvRowsToEntries = (headers: string[], rows: string[][]): Record<string, unknown>[] => {
    const idx = (name: string) => headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    const get = (row: string[], key: string): string => {
      const i = idx(key);
      return i >= 0 && row[i] !== undefined ? String(row[i]).trim() : '';
    };
    const getArr = (row: string[], key: string): string[] => {
      const v = get(row, key);
      return v ? v.split(';').map((s) => s.trim()).filter(Boolean) : [];
    };
    const toCreate: Record<string, unknown>[] = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const type = (get(row, 'type') === 'risk' || get(row, 'type') === 'recommendation') ? get(row, 'type') : null;
      const name = get(row, 'name') || get(row, 'id') || `entry_${Date.now()}_${r}`;
      const displayName = get(row, 'displayName') || name;
      const category = get(row, 'category') || '';
      if (!type || !name || !displayName || !category) {
        throw new Error(`Row ${r + 2}: type, name, displayName, and category are required`);
      }
      const minVal = get(row, 'minAmount');
      const maxVal = get(row, 'maxAmount');
      toCreate.push({
        type,
        category,
        subcategory: get(row, 'subcategory') || undefined,
        name,
        displayName,
        description: get(row, 'description') || '',
        applicableIndustries: getArr(row, 'applicableIndustries').length ? getArr(row, 'applicableIndustries') : undefined,
        applicableStages: getArr(row, 'applicableStages').length ? getArr(row, 'applicableStages') : undefined,
        applicableMethodologies: getArr(row, 'applicableMethodologies').length ? getArr(row, 'applicableMethodologies') : undefined,
        applicableOpportunityTypes: getArr(row, 'applicableOpportunityTypes').length ? getArr(row, 'applicableOpportunityTypes') : undefined,
        minAmount: minVal !== '' && !Number.isNaN(Number(minVal)) ? Number(minVal) : undefined,
        maxAmount: maxVal !== '' && !Number.isNaN(Number(maxVal)) ? Number(maxVal) : undefined,
        status: (get(row, 'status') === 'active' || get(row, 'status') === 'deprecated' || get(row, 'status') === 'draft') ? get(row, 'status') : 'draft',
      });
    }
    return toCreate;
  };

  const runImport = async (toCreate: Record<string, unknown>[], inputEl: HTMLInputElement) => {
    if (!apiBaseUrl || toCreate.length === 0) return;
    if (!window.confirm(`Import ${toCreate.length} entr${toCreate.length === 1 ? 'y' : 'ies'}? Duplicates (same type+name) may fail or overwrite.`)) {
      inputEl.value = '';
      setImporting(false);
      return;
    }
    const errors: string[] = [];
    for (let i = 0; i < toCreate.length; i++) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/action-catalog/entries`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toCreate[i]),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) errors.push(`Entry ${i + 1}: ${(data?.error?.message as string) || `HTTP ${res.status}`}`);
      } catch (err) {
        errors.push(`Entry ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (errors.length > 0) setError(errors.slice(0, 5).join('; ') + (errors.length > 5 ? ` (+${errors.length - 5} more)` : ''));
    else await fetchEntries();
    inputEl.value = '';
    setImporting(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file || !apiBaseUrl) {
      inputEl.value = '';
      return;
    }
    const reader = new FileReader();
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    reader.onload = async () => {
      setImporting(true);
      setError(null);
      try {
        const raw = reader.result as string;
        let toCreate: Record<string, unknown>[];
        if (isCsv) {
          const { headers, rows } = parseCsv(raw);
          if (headers.length === 0 || rows.length === 0) {
            setError('CSV must have a header row and at least one data row (§2.4.1)');
            inputEl.value = '';
            setImporting(false);
            return;
          }
          toCreate = csvRowsToEntries(headers, rows);
        } else {
          const parsed = JSON.parse(raw) as unknown;
          const items: unknown[] = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && 'entries' in parsed && Array.isArray((parsed as { entries: unknown[] }).entries)) ? (parsed as { entries: unknown[] }).entries : [];
          if (items.length === 0) {
            setError('JSON must be an array of entries or { "entries": [...] }');
            inputEl.value = '';
            setImporting(false);
            return;
          }
          toCreate = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || typeof item !== 'object') {
              setError(`Entry at index ${i}: must be an object`);
              inputEl.value = '';
              setImporting(false);
              return;
            }
            const o = item as Record<string, unknown>;
            const type = o.type === 'risk' || o.type === 'recommendation' ? o.type : null;
            const name = typeof o.name === 'string' ? o.name : null;
            const displayName = typeof o.displayName === 'string' ? o.displayName : null;
            const category = typeof o.category === 'string' ? o.category : null;
            if (!type || !name || !displayName || !category) {
              setError(`Entry at index ${i}: type, name, displayName, and category are required`);
              inputEl.value = '';
              setImporting(false);
              return;
            }
            toCreate.push({
              type,
              category,
              subcategory: typeof o.subcategory === 'string' ? o.subcategory : undefined,
              name,
              displayName,
              description: typeof o.description === 'string' ? o.description : '',
              applicableIndustries: Array.isArray(o.applicableIndustries) ? o.applicableIndustries : undefined,
              applicableStages: Array.isArray(o.applicableStages) ? o.applicableStages : undefined,
              applicableMethodologies: Array.isArray(o.applicableMethodologies) ? o.applicableMethodologies : undefined,
              applicableOpportunityTypes: Array.isArray(o.applicableOpportunityTypes) ? o.applicableOpportunityTypes : undefined,
              minAmount: typeof o.minAmount === 'number' && !Number.isNaN(o.minAmount) ? o.minAmount : undefined,
              maxAmount: typeof o.maxAmount === 'number' && !Number.isNaN(o.maxAmount) ? o.maxAmount : undefined,
              ...(type === 'risk' && o.riskDetails && typeof o.riskDetails === 'object' ? { riskDetails: o.riskDetails } : {}),
              ...(type === 'recommendation' && o.recommendationDetails && typeof o.recommendationDetails === 'object' ? { recommendationDetails: o.recommendationDetails } : {}),
              decisionRules: o.decisionRules && typeof o.decisionRules === 'object' ? o.decisionRules : undefined,
              status: o.status === 'active' || o.status === 'deprecated' || o.status === 'draft' ? o.status : 'draft',
            });
          }
        }
        await runImport(toCreate, inputEl);
      } catch (err) {
        setError(err instanceof Error ? err.message : (isCsv ? 'Invalid CSV' : 'Invalid JSON'));
        inputEl.value = '';
        setImporting(false);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const modalTitle = modalMode === 'create' ? 'Create action catalog entry' : modalMode === 'create-unified' ? 'Create risk + recommendation (§2.1.4)' : 'Edit action catalog entry';
  const unifiedWizardStepLabels = ['Basic (risk + recommendation)', 'Risk details', 'Recommendation details', 'Applicability', 'Decision rules', 'Review & Create'];

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
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-4 items-end">
          <Link
            href="/admin/action-catalog/entries/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium inline-block"
            aria-label="New entry (page)"
          >
            New entry
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
            aria-label="Create entry (modal)"
          >
            Create entry (modal)
          </button>
          <button
            type="button"
            onClick={openCreateUnified}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium"
            aria-label="Create risk and recommendation (§2.1.4)"
          >
            Create risk + recommendation (§2.1.4)
          </button>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
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
          <div>
            <label className="block text-sm font-medium mb-1">Category (§2.1.1)</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scope (§2.1.1)</label>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as '' | 'global' | 'tenant')}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              <option value="global">Global</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status (§2.1.1)</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'draft' | 'deprecated' | '')}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Industry (§2.1.1)</label>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              {industries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stage (§2.1.1)</label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Methodology (§2.1.1)</label>
            <select
              value={methodologyFilter}
              onChange={(e) => setMethodologyFilter(e.target.value)}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              {methodologies.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Effectiveness (§2.1.1)</label>
            <select
              value={effectivenessFilter}
              onChange={(e) => setEffectivenessFilter(e.target.value as '' | 'high' | 'medium' | 'low')}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              <option value="high">High (≥0.7)</option>
              <option value="medium">Medium (0.4–0.7)</option>
              <option value="low">Low (&lt;0.4)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Search (§2.1.1)</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or description…"
              className="w-48 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
              aria-label="Search by name or description"
            />
          </div>
          <button
            type="button"
            onClick={fetchEntries}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="Refresh entries"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportAll}
            disabled={entries.length === 0}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
            title="Export all entries as JSON (§2.4.2)"
          >
            Export all (JSON)
          </button>
          <button
            type="button"
            onClick={handleExportAllCsv}
            disabled={entries.length === 0}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
            title="Export all entries as CSV (§2.4.2)"
          >
            Export all (CSV)
          </button>
          <button
            type="button"
            onClick={() => setExportDialogOpen(true)}
            disabled={entries.length === 0}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
            title="Export with options: relationships, statistics, version history (§2.4.2)"
          >
            Export…
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={handleImportFile}
            aria-label="Import catalog JSON or CSV (§2.4.1)"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
            title="Import entries from JSON or CSV (§2.4.1)"
          >
            {importing ? 'Importing…' : 'Import catalog (JSON or CSV §2.4.1)'}
          </button>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Created by (§2.1.1)</label>
              <input
                type="text"
                value={createdByQuery}
                onChange={(e) => setCreatedByQuery(e.target.value)}
                placeholder="Filter by creator…"
                className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                aria-label="Filter by created by"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date from (§2.1.1)</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                aria-label="Filter from date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date to (§2.1.1)</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                aria-label="Filter to date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sort by (§2.1.1)</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                aria-label="Sort by"
              >
                <option value="">Default</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
                <option value="type">Type</option>
                <option value="effectiveness">Effectiveness</option>
                <option value="createdAt">Date created</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Order</label>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                className="w-32 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                aria-label="Sort direction"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {selectedEntryIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 py-2 px-3 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium">{selectedEntryIds.size} selected</span>
              <button
                type="button"
                onClick={handleBulkDuplicate}
                disabled={bulkInProgress}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {bulkDuplicating ? 'Duplicating…' : 'Duplicate selected (§2.4)'}
              </button>
              <button
                type="button"
                onClick={handleBulkDeprecate}
                disabled={bulkInProgress}
                className="px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
              >
                {bulkDeprecating ? 'Deprecating…' : 'Bulk deprecation (§2.4)'}
              </button>
              <button
                type="button"
                onClick={handleExportSelected}
                disabled={bulkInProgress}
                className="px-3 py-1.5 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
                title="Export selected as JSON (§2.4.2)"
              >
                Export selected (JSON)
              </button>
              <button
                type="button"
                onClick={handleExportSelectedCsv}
                disabled={bulkInProgress}
                className="px-3 py-1.5 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
                title="Export selected as CSV (§2.4.2)"
              >
                Export selected (CSV)
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkInProgress}
                className="px-3 py-1.5 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                Clear selection
              </button>
            </div>
          )}
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
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Entries</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchEntries}
                disabled={loading}
                className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                aria-label="Refresh entries"
              >
                Refresh
              </button>
              <div className="flex gap-1" role="group" aria-label="View mode (§2.1.1)">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium rounded border ${viewMode === 'table' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 text-sm font-medium rounded border ${viewMode === 'card' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Card (§2.1.1)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-sm font-medium rounded border ${viewMode === 'timeline' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Timeline (§2.1.1)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 text-sm font-medium rounded border ${viewMode === 'graph' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Graph (§2.1.1)
              </button>
            </div>
            </div>
          </div>
          {sorted.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-gray-500">
                {entries.length === 0 ? 'No entries for this tenant.' : 'No entries match the current filters.'}
              </p>
            </div>
          ) : viewMode === 'timeline' ? (
            <div className="p-4" role="region" aria-label="Entries by creation date">
              {(() => {
                const byDate = new Map<string, ActionCatalogEntry[]>();
                const timelineSorted = [...sorted].sort((a, b) => {
                  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return tb - ta;
                });
                for (const e of timelineSorted) {
                  const dateKey = e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 10) : '—';
                  if (!byDate.has(dateKey)) byDate.set(dateKey, []);
                  byDate.get(dateKey)!.push(e);
                }
                const dates = Array.from(byDate.keys()).sort((a, b) => (a === '—' ? 1 : b === '—' ? -1 : b.localeCompare(a)));
                return (
                  <ul className="space-y-6 list-none">
                    {dates.map((dateKey) => (
                      <li key={dateKey}>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                          {dateKey === '—' ? 'Unknown date' : new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </h3>
                        <ul className="space-y-2 list-none">
                          {(byDate.get(dateKey) ?? []).map((e) => (
                            <li key={e.id} className="flex flex-wrap items-center gap-2 py-2 px-3 rounded border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{e.displayName ?? e.name ?? e.id}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{e.type ?? '—'}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{e.status ?? '—'}</span>
                              {e.category && <span className="text-xs text-gray-500 dark:text-gray-400">{e.category}</span>}
                              {e.createdAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                                  {new Date(e.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => openEdit(e)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(e)}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => setTestEntry(e)}
                                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                Test
                              </button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          ) : viewMode === 'card' ? (
            <div className="p-4" role="region" aria-label="Entries as cards">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={sorted.length > 0 && sorted.every((e) => selectedEntryIds.has(e.id))}
                  onChange={() => {
                    if (selectedEntryIds.size === sorted.length) clearSelection();
                    else selectAllOnPage();
                  }}
                  className="rounded border-gray-300 dark:border-gray-600"
                  aria-label="Select all on page"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Select all</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map((e) => (
                  <article
                    key={e.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 flex flex-col min-h-0"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedEntryIds.has(e.id)}
                        onChange={() => toggleSelection(e.id)}
                        className="mt-0.5 rounded border-gray-300 dark:border-gray-600 shrink-0"
                        aria-label={`Select ${e.displayName || e.name}`}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate" title={e.displayName || e.name}>
                          <Link href={`/admin/action-catalog/entries/${encodeURIComponent(e.id)}`} className="hover:underline text-blue-600 dark:text-blue-400">
                            {e.displayName || e.name || e.id}
                          </Link>
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">{e.type ?? '—'}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{e.status ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                    {e.category && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {e.category}{e.subcategory ? ` / ${e.subcategory}` : ''}
                      </p>
                    )}
                    {e.description ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 flex-1 min-h-0" title={e.description}>
                        {e.description}
                      </p>
                    ) : (
                      <div className="flex-1 min-h-[2.5rem]" />
                    )}
                    {e.createdAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Created {new Date(e.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(e)}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestEntry(e)}
                        className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : viewMode === 'graph' ? (
            <div className="p-4 overflow-auto" role="region" aria-label="Relationship graph">
              {(() => {
                const risks = sorted.filter((e): e is ActionCatalogEntry => e.type === 'risk');
                const recommendations = sorted.filter((e): e is ActionCatalogEntry => e.type === 'recommendation');
                const riskIndexById = new Map(risks.map((r, i) => [r.id, i]));
                const recIndexById = new Map(recommendations.map((r, i) => [r.id, i]));
                const edgeKeys = new Set<string>();
                const edges: { riskIdx: number; recIdx: number }[] = [];
                for (let i = 0; i < risks.length; i++) {
                  const ids = risks[i].riskDetails?.mitigatingRecommendations ?? [];
                  for (const recId of ids) {
                    const j = recIndexById.get(recId);
                    if (j !== undefined) {
                      const key = `${risks[i].id}|${recId}`;
                      if (!edgeKeys.has(key)) {
                        edgeKeys.add(key);
                        edges.push({ riskIdx: i, recIdx: j });
                      }
                    }
                  }
                }
                for (let j = 0; j < recommendations.length; j++) {
                  const ids = recommendations[j].recommendationDetails?.mitigatesRisks ?? [];
                  for (const riskId of ids) {
                    const i = riskIndexById.get(riskId);
                    if (i !== undefined) {
                      const key = `${riskId}|${recommendations[j].id}`;
                      if (!edgeKeys.has(key)) {
                        edgeKeys.add(key);
                        edges.push({ riskIdx: i, recIdx: j });
                      }
                    }
                  }
                }
                const ROW_H = 44;
                const NODE_W = 180;
                const NODE_H = 32;
                const LEFT_X = 20;
                const GAP = 24;
                const RIGHT_X = LEFT_X + NODE_W + GAP;
                const W = RIGHT_X + NODE_W + 20;
                const H = Math.max(risks.length, recommendations.length, 1) * ROW_H + 32;
                return (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Risks (left) and recommendations (right). Lines show mitigates / mitigating links. Click a node to edit.
                    </p>
                    {risks.length === 0 && recommendations.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4">No risks or recommendations in current filter.</p>
                    ) : (
                      <svg
                        width="100%"
                        viewBox={`0 0 ${W} ${H}`}
                        className="min-h-[200px] border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900"
                      >
                        <defs>
                          <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                            <polygon points="0 0, 8 4, 0 8" fill="currentColor" className="text-gray-400" />
                          </marker>
                        </defs>
                        {edges.map(({ riskIdx, recIdx }, k) => {
                          const x1 = LEFT_X + NODE_W;
                          const y1 = 24 + riskIdx * ROW_H + NODE_H / 2;
                          const x2 = RIGHT_X;
                          const y2 = 24 + recIdx * ROW_H + NODE_H / 2;
                          return (
                            <line
                              key={k}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="currentColor"
                              strokeWidth="1"
                              className="text-gray-300 dark:text-gray-600"
                              markerEnd="url(#graph-arrow)"
                            />
                          );
                        })}
                        {risks.map((e, i) => {
                          const y = 24 + i * ROW_H;
                          return (
                            <g key={e.id}>
                              <rect
                                x={LEFT_X}
                                y={y}
                                width={NODE_W}
                                height={NODE_H}
                                rx={4}
                                className="fill-amber-100 dark:fill-amber-900/30 stroke-amber-600 dark:stroke-amber-500 stroke cursor-pointer hover:opacity-90"
                                onClick={() => openEdit(e)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(ev) => ev.key === 'Enter' && openEdit(e)}
                                aria-label={`Risk: ${e.displayName || e.name || e.id}`}
                              />
                              <text x={LEFT_X + 8} y={y + NODE_H / 2 + 4} className="text-xs fill-gray-800 dark:fill-gray-200 truncate" style={{ maxWidth: NODE_W - 16 }}>
                                {(e.displayName || e.name || e.id).slice(0, 22)}
                                {(e.displayName || e.name || e.id).length > 22 ? '…' : ''}
                              </text>
                            </g>
                          );
                        })}
                        {recommendations.map((e, j) => {
                          const y = 24 + j * ROW_H;
                          return (
                            <g key={e.id}>
                              <rect
                                x={RIGHT_X}
                                y={y}
                                width={NODE_W}
                                height={NODE_H}
                                rx={4}
                                className="fill-blue-100 dark:fill-blue-900/30 stroke-blue-600 dark:stroke-blue-500 stroke cursor-pointer hover:opacity-90"
                                onClick={() => openEdit(e)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(ev) => ev.key === 'Enter' && openEdit(e)}
                                aria-label={`Recommendation: ${e.displayName || e.name || e.id}`}
                              />
                              <text x={RIGHT_X + 8} y={y + NODE_H / 2 + 4} className="text-xs fill-gray-800 dark:fill-gray-200" style={{ maxWidth: NODE_W - 16 }}>
                                {(e.displayName || e.name || e.id).slice(0, 22)}
                                {(e.displayName || e.name || e.id).length > 22 ? '…' : ''}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    )}
                    <Link href="/admin/action-catalog/relationships" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      Manage relationships (add/remove links) →
                    </Link>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-4 w-10">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={sorted.length > 0 && sorted.every((e) => selectedEntryIds.has(e.id))}
                        onChange={() => {
                          if (selectedEntryIds.size === sorted.length) clearSelection();
                          else selectAllOnPage();
                        }}
                        className="rounded border-gray-300 dark:border-gray-600"
                        aria-label="Select all on page"
                      />
                    </th>
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Category</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Version</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-2 px-4">
                        <input
                          type="checkbox"
                          checked={selectedEntryIds.has(e.id)}
                          onChange={() => toggleSelection(e.id)}
                          className="rounded border-gray-300 dark:border-gray-600"
                          aria-label={`Select ${e.displayName || e.name}`}
                        />
                      </td>
                      <td className="py-2 px-4">{e.type}</td>
                      <td className="py-2 px-4">
                        <Link href={`/admin/action-catalog/entries/${encodeURIComponent(e.id)}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {e.displayName || e.name}
                        </Link>
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
                            onClick={() => handleDuplicate(e)}
                            className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestEntry(e)}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm"
                          >
                            Test
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

      {/* §2.1.6 Test Catalog Entry: placeholder modal (Testing playground) */}
      {testEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-catalog-dialog-title"
          onClick={() => { setTestEntry(null); setTestSampleJson(''); }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="test-catalog-dialog-title" className="text-lg font-semibold mb-2">Test catalog entry (§2.1.6)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Entry: <strong>{testEntry.displayName || testEntry.name || testEntry.id}</strong>
              {testEntry.type && <span className="ml-2 text-gray-500">({testEntry.type})</span>}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Input sample data</label>
              <textarea
                ref={testSampleTextareaRef}
                value={testSampleJson}
                onChange={(e) => setTestSampleJson(e.target.value)}
                placeholder='Paste opportunity JSON, e.g. {"stage":"discovery","industry":"technology","amount":50000}'
                rows={4}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm font-mono"
                aria-describedby="test-sample-data-hint"
              />
              <p id="test-sample-data-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Run test (risk detection / recommendation generation) will use this data when the backend API is available.
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Testing playground will also support: select from real opportunities, generate synthetic data, view detection confidence and rendered template, and test outcomes (success rate, sentiment, action rate). Full implementation coming soon.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setTestEntry(null); setTestSampleJson(''); }}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {exportDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-dialog-title"
          onClick={() => setExportDialogOpen(false)}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="export-dialog-title" className="text-lg font-semibold mb-4">Export catalog (§2.4.2)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Scope</label>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value as 'all' | 'selected')}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                  aria-label="Export scope"
                >
                  <option value="all">All entries</option>
                  <option value="selected">Selected only ({selectedEntryIds.size})</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'excel')}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                  aria-label="Export format"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (.xlsx)</option>
                </select>
              </div>
              <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                <label className="block text-sm font-medium">Include</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportIncludeRelationships}
                    onChange={(e) => setExportIncludeRelationships(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                    aria-label="Include relationships"
                  />
                  <span className="text-sm">Relationships (mitigatesRisks, mitigatingRecommendations)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportIncludeStatistics}
                    onChange={(e) => setExportIncludeStatistics(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                    aria-label="Include statistics"
                  />
                  <span className="text-sm">Statistics (usage: timesGenerated, avgFeedbackSentiment, etc.)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportIncludeVersionHistory}
                    onChange={(e) => setExportIncludeVersionHistory(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                    aria-label="Include version history"
                  />
                  <span className="text-sm">Version (version field)</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setExportDialogOpen(false)}
                className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportFromDialog}
                disabled={(exportScope === 'selected' && selectedEntryIds.size === 0) || (exportScope === 'all' && entries.length === 0)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" role="region" aria-label="Create entry wizard" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 id="modal-title" className="text-lg font-semibold mb-2">{modalTitle}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4" aria-live="polite" aria-current="step">
                Step {createWizardStep} of 5: {createWizardStepLabels[createWizardStep - 1]}
              </p>
              {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}

              {createWizardStep === 1 && (
                <div className="space-y-3">
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
                </div>
              )}

              {createWizardStep === 2 && createForm.type === 'risk' && (
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
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Impact assessment (§2.1.2)</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Win prob. decrease (%)</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={createForm.riskDetails.impact?.probabilityDecrease ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), probabilityDecrease: v },
                                  },
                                }));
                              }}
                              placeholder="—"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Revenue at risk ($)</label>
                            <input
                              type="number"
                              min={0}
                              value={createForm.riskDetails.impact?.revenueAtRisk ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), revenueAtRisk: v },
                                  },
                                }));
                              }}
                              placeholder="—"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Timeline delay (days)</label>
                            <input
                              type="number"
                              min={0}
                              value={createForm.riskDetails.impact?.timelineDelay ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), timelineDelay: v },
                                  },
                                }));
                              }}
                              placeholder="—"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-1.5">
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Impact description</label>
                          <textarea
                            value={createForm.riskDetails.impact?.description ?? ''}
                            onChange={(e) =>
                              setCreateForm((f) => ({
                                ...f,
                                riskDetails: {
                                  ...f.riskDetails,
                                  impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), description: e.target.value },
                                },
                              }))
                            }
                            rows={2}
                            placeholder="Optional rich text"
                            className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                          />
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">ML features (§2.1.2)</span>
                        <div className="flex gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Feature names (comma-separated)</label>
                            <input
                              type="text"
                              value={(createForm.riskDetails.mlFeatures ?? []).join(', ')}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    mlFeatures: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                  },
                                }))
                              }
                              placeholder="e.g. days_since_activity, stage_duration"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Threshold</label>
                            <input
                              type="number"
                              value={createForm.riskDetails.mlThreshold ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: { ...f.riskDetails, mlThreshold: v },
                                }));
                              }}
                              placeholder="—"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              {createWizardStep === 2 && createForm.type === 'recommendation' && (
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
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Action type (§2.1.3)</span>
                        <select
                          value={createForm.recommendationDetails.actionType ?? ''}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionType: (e.target.value || undefined) as RecommendationActionType | undefined,
                              },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="">—</option>
                          <option value="meeting">Meeting</option>
                          <option value="email">Email</option>
                          <option value="task">Task</option>
                          <option value="document">Document</option>
                          <option value="question">Question</option>
                          <option value="analysis">Analysis</option>
                        </select>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expected outcome (§2.1.3)</span>
                        <div className="space-y-1.5">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
                            <input
                              type="text"
                              value={createForm.recommendationDetails.expectedOutcome?.description ?? ''}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), description: e.target.value },
                                  },
                                }))
                              }
                              placeholder="e.g. Increase win probability"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Quantified impact</label>
                              <input
                                type="text"
                                value={createForm.recommendationDetails.expectedOutcome?.quantifiedImpact ?? ''}
                                onChange={(e) =>
                                  setCreateForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), quantifiedImpact: e.target.value || undefined },
                                    },
                                  }))
                                }
                                placeholder="e.g. +15% probability"
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Impact type</label>
                              <select
                                value={createForm.recommendationDetails.expectedOutcome?.impactType ?? ''}
                                onChange={(e) =>
                                  setCreateForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), impactType: (e.target.value || undefined) as RecommendationExpectedOutcome['impactType'] },
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              >
                                <option value="">—</option>
                                <option value="probability">Probability</option>
                                <option value="revenue">Revenue</option>
                                <option value="timeline">Timeline</option>
                                <option value="risk_reduction">Risk reduction</option>
                                <option value="efficiency">Efficiency</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Confidence</label>
                              <select
                                value={createForm.recommendationDetails.expectedOutcome?.confidence ?? ''}
                                onChange={(e) =>
                                  setCreateForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), confidence: (e.target.value || undefined) as 'low' | 'medium' | 'high' },
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              >
                                <option value="">—</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Evidence</label>
                              <input
                                type="text"
                                value={createForm.recommendationDetails.expectedOutcome?.evidence ?? ''}
                                onChange={(e) =>
                                  setCreateForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), evidence: e.target.value || undefined },
                                    },
                                  }))
                                }
                                placeholder="Optional"
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Implementation (§2.1.3)</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Effort</label>
                            <select
                              value={createForm.recommendationDetails.implementation?.effort ?? ''}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    implementation: { ...(f.recommendationDetails.implementation ?? DEFAULT_IMPLEMENTATION), effort: (e.target.value || undefined) as 'low' | 'medium' | 'high' },
                                  },
                                }))
                              }
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            >
                              <option value="">—</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Complexity</label>
                            <select
                              value={createForm.recommendationDetails.implementation?.complexity ?? ''}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    implementation: { ...(f.recommendationDetails.implementation ?? DEFAULT_IMPLEMENTATION), complexity: (e.target.value || undefined) as 'simple' | 'moderate' | 'complex' },
                                  },
                                }))
                              }
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            >
                              <option value="">—</option>
                              <option value="simple">Simple</option>
                              <option value="moderate">Moderate</option>
                              <option value="complex">Complex</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Estimated time</label>
                            <input
                              type="text"
                              value={createForm.recommendationDetails.implementation?.estimatedTime ?? ''}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    implementation: { ...(f.recommendationDetails.implementation ?? DEFAULT_IMPLEMENTATION), estimatedTime: e.target.value || undefined },
                                  },
                                }))
                              }
                              placeholder="e.g. 30 min"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              {createWizardStep === 3 && (
                <div className="space-y-3">
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
                <div>
                  <label className="block text-sm font-medium mb-1">Opportunity types (§2.1.2/§2.1.3)</label>
                  <div className="flex flex-wrap gap-3">
                    {OPPORTUNITY_TYPES.map((ot) => (
                      <label key={ot} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createForm.applicableOpportunityTypes.includes(ot)}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              applicableOpportunityTypes: e.target.checked
                                ? [...f.applicableOpportunityTypes, ot]
                                : f.applicableOpportunityTypes.filter((x) => x !== ot),
                            }))
                          }
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm capitalize">{ot.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min amount ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={createForm.minAmount ?? ''}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          minAmount: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      placeholder="Only for opps &gt; $X"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max amount ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={createForm.maxAmount ?? ''}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          maxAmount: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      placeholder="Only for opps &lt; $X"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                </div>
                </div>
              )}

              {createWizardStep === 4 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  {createForm.type === 'risk' && (
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk detection (§2.1.2)</span>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="createAutoDetect"
                            checked={createForm.riskDetails.autoDetect ?? false}
                            onChange={(e) =>
                              setCreateForm((f) => ({
                                ...f,
                                riskDetails: { ...f.riskDetails, autoDetect: e.target.checked },
                              }))
                            }
                            className="rounded"
                          />
                          <label htmlFor="createAutoDetect" className="text-sm">Auto-detect this risk</label>
                        </div>
                        <span className="block text-xs text-gray-600 dark:text-gray-400 mt-2">Notification rules</span>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createForm.riskDetails.notificationRules?.notifyOwner ?? true}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), notifyOwner: e.target.checked },
                                  },
                                }))
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Notify owner</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createForm.riskDetails.notificationRules?.notifyManager ?? false}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), notifyManager: e.target.checked },
                                  },
                                }))
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Notify manager</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createForm.riskDetails.notificationRules?.escalateIfCritical ?? false}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), escalateIfCritical: e.target.checked },
                                  },
                                }))
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Escalate if critical</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <label htmlFor="createEscalationDelay" className="text-sm whitespace-nowrap">Escalation delay (hours)</label>
                            <input
                              id="createEscalationDelay"
                              type="number"
                              min={0}
                              value={createForm.riskDetails.notificationRules?.escalationDelayHours ?? 24}
                              onChange={(e) =>
                                setCreateForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), escalationDelayHours: Math.max(0, Number(e.target.value) || 0) },
                                  },
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
              )}

              {createWizardStep === 5 && (
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800/50">
                  <p><strong>Type:</strong> {createForm.type}</p>
                  <p><strong>Name:</strong> {createForm.name || '—'}</p>
                  <p><strong>Display name:</strong> {createForm.displayName || '—'}</p>
                  <p><strong>Category:</strong> {createForm.category || '—'}</p>
                  {createForm.type === 'risk' && (
                    <>
                      <p><strong>Severity:</strong> {createForm.riskDetails.severity} · <strong>Impact type:</strong> {createForm.riskDetails.impactType}</p>
                      {(createForm.riskDetails.impact?.probabilityDecrease != null || createForm.riskDetails.impact?.revenueAtRisk != null || createForm.riskDetails.impact?.timelineDelay != null || (createForm.riskDetails.impact?.description ?? '').trim()) && (
                        <p><strong>Impact:</strong> {[createForm.riskDetails.impact?.probabilityDecrease != null && `${createForm.riskDetails.impact.probabilityDecrease}% win prob.`, createForm.riskDetails.impact?.revenueAtRisk != null && `$${createForm.riskDetails.impact.revenueAtRisk} at risk`, createForm.riskDetails.impact?.timelineDelay != null && `${createForm.riskDetails.impact.timelineDelay} days delay`].filter(Boolean).join('; ')} {createForm.riskDetails.impact?.description?.trim() && `— ${createForm.riskDetails.impact.description}`}</p>
                      )}
                      {((createForm.riskDetails.mlFeatures ?? []).length > 0 || createForm.riskDetails.mlThreshold != null) && (
                        <p><strong>ML:</strong> {(createForm.riskDetails.mlFeatures ?? []).join(', ') || '—'} {createForm.riskDetails.mlThreshold != null ? `(threshold: ${createForm.riskDetails.mlThreshold})` : ''}</p>
                      )}
                      {createForm.riskDetails.autoDetect && (
                        <p><strong>Risk detection:</strong> Auto-detect · Notify: {[createForm.riskDetails.notificationRules?.notifyOwner && 'owner', createForm.riskDetails.notificationRules?.notifyManager && 'manager', createForm.riskDetails.notificationRules?.escalateIfCritical && 'escalate if critical'].filter(Boolean).join(', ') || '—'} {createForm.riskDetails.notificationRules?.escalationDelayHours != null ? `(delay: ${createForm.riskDetails.notificationRules.escalationDelayHours}h)` : ''}</p>
                      )}
                    </>
                  )}
                  {createForm.type === 'recommendation' && (
                    <>
                      <p><strong>Recommendation type:</strong> {createForm.recommendationDetails.recommendationType}</p>
                      {createForm.recommendationDetails.actionType && (
                        <p><strong>Action type:</strong> {createForm.recommendationDetails.actionType}</p>
                      )}
                      {(createForm.recommendationDetails.expectedOutcome?.description || createForm.recommendationDetails.expectedOutcome?.quantifiedImpact) && (
                        <p><strong>Expected outcome:</strong> {createForm.recommendationDetails.expectedOutcome?.description || '—'} {createForm.recommendationDetails.expectedOutcome?.quantifiedImpact && `(${createForm.recommendationDetails.expectedOutcome.quantifiedImpact})`} {createForm.recommendationDetails.expectedOutcome?.confidence && `[${createForm.recommendationDetails.expectedOutcome.confidence}]`}</p>
                      )}
                      {(createForm.recommendationDetails.implementation?.effort || createForm.recommendationDetails.implementation?.complexity || createForm.recommendationDetails.implementation?.estimatedTime) && (
                        <p><strong>Implementation:</strong> {[createForm.recommendationDetails.implementation?.effort, createForm.recommendationDetails.implementation?.complexity, createForm.recommendationDetails.implementation?.estimatedTime].filter(Boolean).join(' · ') || '—'}</p>
                      )}
                    </>
                  )}
                  <p><strong>Applicability:</strong> industries {createForm.applicableIndustries.length || 0}, stages {createForm.applicableStages.length || 0}, methodologies {createForm.applicableMethodologies.length || 0}{createForm.applicableOpportunityTypes.length > 0 ? `, types: ${createForm.applicableOpportunityTypes.join(', ')}` : ''}{createForm.minAmount != null || createForm.maxAmount != null ? ` · Amount: ${createForm.minAmount != null ? `>$${createForm.minAmount}` : ''}${createForm.minAmount != null && createForm.maxAmount != null ? ' ' : ''}${createForm.maxAmount != null ? `<$${createForm.maxAmount}` : ''}` : ''}</p>
                  <p><strong>Decision rules:</strong> priority {createForm.decisionRules.priority}, urgency {createForm.decisionRules.urgency}</p>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                {createWizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCreateWizardStep((s) => s - 1)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Back
                  </button>
                )}
                {createWizardStep < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (createWizardStep === 1 && (!createForm.name.trim() || !createForm.displayName.trim() || !createForm.category.trim())) {
                        setFormError('Name, display name, and category are required.');
                        return;
                      }
                      setFormError(null);
                      setCreateWizardStep((s) => s + 1);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                )}
                {createWizardStep === 5 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCreateSubmit('draft')}
                      disabled={formSaving}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      {formSaving ? 'Saving…' : 'Save as Draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateSubmit('active')}
                      disabled={formSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {formSaving ? 'Creating…' : 'Activate'}
                    </button>
                  </>
                )}
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'create-unified' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="unified-modal-title" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" role="region" aria-label="Create risk + recommendation wizard" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 id="unified-modal-title" className="text-lg font-semibold mb-2">{modalTitle}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4" aria-live="polite">
                Step {unifiedWizardStep} of 6: {unifiedWizardStepLabels[unifiedWizardStep - 1]}
              </p>
              {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>}

              {unifiedWizardStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category (shared)</label>
                    <input
                      type="text"
                      value={unifiedForm.category}
                      onChange={(e) => setUnifiedForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subcategory (optional)</label>
                    <input
                      type="text"
                      value={unifiedForm.subcategory}
                      onChange={(e) => setUnifiedForm((f) => ({ ...f, subcategory: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk — basic</span>
                    <div className="space-y-2">
                      <input type="text" value={unifiedForm.riskName} onChange={(e) => setUnifiedForm((f) => ({ ...f, riskName: e.target.value }))} placeholder="Name (slug)" className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                      <input type="text" value={unifiedForm.riskDisplayName} onChange={(e) => setUnifiedForm((f) => ({ ...f, riskDisplayName: e.target.value }))} placeholder="Display name" className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                      <textarea value={unifiedForm.riskDescription} onChange={(e) => setUnifiedForm((f) => ({ ...f, riskDescription: e.target.value }))} placeholder="Description" rows={2} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommendation — basic</span>
                    <div className="space-y-2">
                      <input type="text" value={unifiedForm.recName} onChange={(e) => setUnifiedForm((f) => ({ ...f, recName: e.target.value }))} placeholder="Name (slug)" className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                      <input type="text" value={unifiedForm.recDisplayName} onChange={(e) => setUnifiedForm((f) => ({ ...f, recDisplayName: e.target.value }))} placeholder="Display name" className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                      <textarea value={unifiedForm.recDescription} onChange={(e) => setUnifiedForm((f) => ({ ...f, recDescription: e.target.value }))} placeholder="Description" rows={2} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                    </div>
                  </div>
                </div>
              )}

              {unifiedWizardStep === 2 && (
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk details</span>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Severity</label>
                    <select value={unifiedForm.riskDetails.severity} onChange={(e) => setUnifiedForm((f) => ({ ...f, riskDetails: { ...f.riskDetails, severity: e.target.value as RiskSeverity } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Impact type</label>
                    <select value={unifiedForm.riskDetails.impactType} onChange={(e) => setUnifiedForm((f) => ({ ...f, riskDetails: { ...f.riskDetails, impactType: e.target.value as RiskImpactType } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm">
                      <option value="commercial">Commercial</option><option value="technical">Technical</option><option value="legal">Legal</option><option value="competitive">Competitive</option><option value="timeline">Timeline</option><option value="resource">Resource</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Indicators (comma-separated)</label>
                    <input type="text" value={unifiedForm.riskDetails.indicators.join(', ')} onChange={(e) => setUnifiedForm((f) => ({ ...f, riskDetails: { ...f.riskDetails, indicators: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" placeholder="e.g. stalled, no activity" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Link to recommendation will be set automatically after create.</p>
                </div>
              )}

              {unifiedWizardStep === 3 && (
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommendation details (linked to risk automatically)</span>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Recommendation type</label>
                    <select value={unifiedForm.recommendationDetails.recommendationType} onChange={(e) => setUnifiedForm((f) => ({ ...f, recommendationDetails: { ...f.recommendationDetails, recommendationType: e.target.value as RecommendationTypeCatalog } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm">
                      <option value="next_action">Next action</option><option value="risk_mitigation">Risk mitigation</option><option value="reactivation">Reactivation</option><option value="content">Content</option><option value="methodology">Methodology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action template: title</label>
                    <input type="text" value={unifiedForm.recommendationDetails.actionTemplate.title} onChange={(e) => setUnifiedForm((f) => ({ ...f, recommendationDetails: { ...f.recommendationDetails, actionTemplate: { ...f.recommendationDetails.actionTemplate, title: e.target.value } } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" placeholder="e.g. Schedule discovery call" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Action template: description</label>
                    <input type="text" value={unifiedForm.recommendationDetails.actionTemplate.description} onChange={(e) => setUnifiedForm((f) => ({ ...f, recommendationDetails: { ...f.recommendationDetails, actionTemplate: { ...f.recommendationDetails.actionTemplate, description: e.target.value } } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Required data (comma-separated)</label>
                    <input type="text" value={unifiedForm.recommendationDetails.requiredData.join(', ')} onChange={(e) => setUnifiedForm((f) => ({ ...f, recommendationDetails: { ...f.recommendationDetails, requiredData: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm" placeholder="e.g. stage, amount" />
                  </div>
                </div>
              )}

              {unifiedWizardStep === 4 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Applicable industries (comma-separated)</label>
                    <input type="text" value={unifiedForm.applicableIndustries.join(', ')} onChange={(e) => setUnifiedForm((f) => ({ ...f, applicableIndustries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder="e.g. technology, healthcare" className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Applicable stages (comma-separated)</label>
                    <input type="text" value={unifiedForm.applicableStages.join(', ')} onChange={(e) => setUnifiedForm((f) => ({ ...f, applicableStages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder="e.g. discovery, negotiation" className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Applicable methodologies (comma-separated)</label>
                    <input type="text" value={unifiedForm.applicableMethodologies.join(', ')} onChange={(e) => setUnifiedForm((f) => ({ ...f, applicableMethodologies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder="e.g. MEDDIC, Challenger" className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Opportunity types</label>
                    <div className="flex flex-wrap gap-3">
                      {OPPORTUNITY_TYPES.map((ot) => (
                        <label key={ot} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={unifiedForm.applicableOpportunityTypes.includes(ot)} onChange={(e) => setUnifiedForm((f) => ({ ...f, applicableOpportunityTypes: e.target.checked ? [...f.applicableOpportunityTypes, ot] : f.applicableOpportunityTypes.filter((x) => x !== ot) }))} className="rounded border-gray-300 dark:border-gray-600" />
                          <span className="text-sm capitalize">{ot.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Min amount ($)</label>
                      <input type="number" value={unifiedForm.minAmount ?? ''} onChange={(e) => setUnifiedForm((f) => ({ ...f, minAmount: e.target.value === '' ? undefined : Number(e.target.value) }))} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Max amount ($)</label>
                      <input type="number" value={unifiedForm.maxAmount ?? ''} onChange={(e) => setUnifiedForm((f) => ({ ...f, maxAmount: e.target.value === '' ? undefined : Number(e.target.value) }))} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                    </div>
                  </div>
                </div>
              )}

              {unifiedWizardStep === 5 && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={unifiedForm.decisionRules.autoGenerate} onChange={(e) => setUnifiedForm((f) => ({ ...f, decisionRules: { ...f.decisionRules, autoGenerate: e.target.checked } }))} className="rounded border-gray-300 dark:border-gray-600" />
                    <span className="text-sm">Auto-generate</span>
                  </label>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Priority</label>
                    <select value={unifiedForm.decisionRules.priority} onChange={(e) => setUnifiedForm((f) => ({ ...f, decisionRules: { ...f.decisionRules, priority: e.target.value as DecisionRulesPriority } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm">
                      <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Urgency</label>
                    <select value={unifiedForm.decisionRules.urgency} onChange={(e) => setUnifiedForm((f) => ({ ...f, decisionRules: { ...f.decisionRules, urgency: e.target.value as DecisionRulesUrgency } }))} className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm">
                      <option value="immediate">Immediate</option><option value="this_week">This week</option><option value="this_month">This month</option><option value="flexible">Flexible</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={unifiedForm.decisionRules.suppressIfSimilarExists} onChange={(e) => setUnifiedForm((f) => ({ ...f, decisionRules: { ...f.decisionRules, suppressIfSimilarExists: e.target.checked } }))} className="rounded border-gray-300 dark:border-gray-600" />
                    <span className="text-sm">Suppress if similar exists</span>
                  </label>
                </div>
              )}

              {unifiedWizardStep === 6 && (
                <div className="space-y-2 text-sm">
                  <p><strong>Risk:</strong> {unifiedForm.riskDisplayName} ({unifiedForm.riskName}) — {unifiedForm.riskDetails.severity}, {unifiedForm.riskDetails.impactType}</p>
                  <p><strong>Recommendation:</strong> {unifiedForm.recDisplayName} ({unifiedForm.recName}) — {unifiedForm.recommendationDetails.recommendationType}</p>
                  <p className="text-gray-500">Both will be created and linked automatically (risk ↔ recommendation).</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                {unifiedWizardStep < 6 && (
                  <button type="button" onClick={() => setUnifiedWizardStep((s) => s + 1)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800">Next</button>
                )}
                {unifiedWizardStep > 1 && unifiedWizardStep < 6 && (
                  <button type="button" onClick={() => setUnifiedWizardStep((s) => s - 1)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800">Back</button>
                )}
                {unifiedWizardStep === 6 && (
                  <>
                    <button type="button" onClick={() => handleCreateUnifiedSubmit('draft')} disabled={formSaving} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">{formSaving ? 'Saving…' : 'Save as Draft'}</button>
                    <button type="button" onClick={() => handleCreateUnifiedSubmit('active')} disabled={formSaving} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">{formSaving ? 'Creating…' : 'Activate'}</button>
                  </>
                )}
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'edit' && editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 id="modal-title" className="text-lg font-semibold mb-2">{modalTitle}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Version: {editVersion ?? '—'}</p>
              <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded">
                <button
                  type="button"
                  onClick={() => setEditVersionHistoryOpen((o) => !o)}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                  aria-expanded={editVersionHistoryOpen}
                >
                  Version history (§2.1.5)
                  <span className="text-gray-400">{editVersionHistoryOpen ? '▼' : '▶'}</span>
                </button>
                {editVersionHistoryOpen && (
                  <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
                    <p>Current version: {editVersion ?? '—'}</p>
                    <p className="mt-1">Full version history, compare versions (diff), and rollback to a previous version will be available when the backend supports version history and previousVersionId.</p>
                  </div>
                )}
              </div>
              <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded">
                <button
                  type="button"
                  onClick={() => setEditChangeImpactOpen((o) => !o)}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                  aria-expanded={editChangeImpactOpen}
                >
                  Change impact (§2.1.5)
                  <span className="text-gray-400">{editChangeImpactOpen ? '▼' : '▶'}</span>
                </button>
                {editChangeImpactOpen && (
                  <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
                    {editEntryType === 'risk' && (
                      <>
                        <p className="font-medium mb-1">Linked recommendations (mitigating this risk)</p>
                        {(editForm.riskDetails.mitigatingRecommendations?.length ?? 0) === 0 ? (
                          <p className="text-gray-500">None</p>
                        ) : (
                          <ul className="list-disc list-inside space-y-0.5">
                            {editForm.riskDetails.mitigatingRecommendations.map((id) => {
                              const e = entries.find((x) => x.id === id);
                              return <li key={id}>{e ? (e.displayName || e.name || id) : id}</li>;
                            })}
                          </ul>
                        )}
                      </>
                    )}
                    {editEntryType === 'recommendation' && (
                      <>
                        <p className="font-medium mb-1">Linked risks (this recommendation mitigates)</p>
                        {(editForm.recommendationDetails.mitigatesRisks?.length ?? 0) === 0 ? (
                          <p className="text-gray-500">None</p>
                        ) : (
                          <ul className="list-disc list-inside space-y-0.5">
                            {editForm.recommendationDetails.mitigatesRisks.map((id) => {
                              const e = entries.find((x) => x.id === id);
                              return <li key={id}>{e ? (e.displayName || e.name || id) : id}</li>;
                            })}
                          </ul>
                        )}
                      </>
                    )}
                    <p className="mt-2 text-gray-500">Affected tenants and impact on accuracy will be available when the backend supports them.</p>
                  </div>
                )}
              </div>
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
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Impact assessment (§2.1.2)</span>
                        <div className="grid grid-cols-3 gap-2 mb-1.5">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Win prob. decrease (%)</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={editForm.riskDetails.impact?.probabilityDecrease ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), probabilityDecrease: v },
                                  },
                                }));
                              }}
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Revenue at risk ($)</label>
                            <input
                              type="number"
                              min={0}
                              value={editForm.riskDetails.impact?.revenueAtRisk ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), revenueAtRisk: v },
                                  },
                                }));
                              }}
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Timeline delay (days)</label>
                            <input
                              type="number"
                              min={0}
                              value={editForm.riskDetails.impact?.timelineDelay ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), timelineDelay: v },
                                  },
                                }));
                              }}
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Impact description</label>
                          <textarea
                            value={editForm.riskDetails.impact?.description ?? ''}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                riskDetails: {
                                  ...f.riskDetails,
                                  impact: { ...(f.riskDetails.impact ?? DEFAULT_RISK_IMPACT), description: e.target.value },
                                },
                              }))
                            }
                            rows={2}
                            className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                          />
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">ML features (§2.1.2)</span>
                        <div className="flex gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Feature names (comma-separated)</label>
                            <input
                              type="text"
                              value={(editForm.riskDetails.mlFeatures ?? []).join(', ')}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    mlFeatures: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                  },
                                }))
                              }
                              placeholder="e.g. days_since_activity"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Threshold</label>
                            <input
                              type="number"
                              value={editForm.riskDetails.mlThreshold ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: { ...f.riskDetails, mlThreshold: v },
                                }));
                              }}
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Risk detection (§2.1.2)</span>
                        <div className="flex items-center gap-2 mb-1.5">
                          <input
                            type="checkbox"
                            id="editAutoDetect"
                            checked={editForm.riskDetails.autoDetect ?? false}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                riskDetails: { ...f.riskDetails, autoDetect: e.target.checked },
                              }))
                            }
                            className="rounded"
                          />
                          <label htmlFor="editAutoDetect" className="text-sm">Auto-detect this risk</label>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.riskDetails.notificationRules?.notifyOwner ?? true}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), notifyOwner: e.target.checked },
                                  },
                                }))
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Notify owner</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.riskDetails.notificationRules?.notifyManager ?? false}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), notifyManager: e.target.checked },
                                  },
                                }))
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Notify manager</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.riskDetails.notificationRules?.escalateIfCritical ?? false}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), escalateIfCritical: e.target.checked },
                                  },
                                }))
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Escalate if critical</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <label htmlFor="editEscalationDelay" className="text-sm whitespace-nowrap">Escalation delay (h)</label>
                            <input
                              id="editEscalationDelay"
                              type="number"
                              min={0}
                              value={editForm.riskDetails.notificationRules?.escalationDelayHours ?? 24}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  riskDetails: {
                                    ...f.riskDetails,
                                    notificationRules: { ...(f.riskDetails.notificationRules ?? DEFAULT_RISK_NOTIFICATION_RULES), escalationDelayHours: Math.max(0, Number(e.target.value) || 0) },
                                  },
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
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
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Action type (§2.1.3)</span>
                        <select
                          value={editForm.recommendationDetails.actionType ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              recommendationDetails: {
                                ...f.recommendationDetails,
                                actionType: (e.target.value || undefined) as RecommendationActionType | undefined,
                              },
                            }))
                          }
                          className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                        >
                          <option value="">—</option>
                          <option value="meeting">Meeting</option>
                          <option value="email">Email</option>
                          <option value="task">Task</option>
                          <option value="document">Document</option>
                          <option value="question">Question</option>
                          <option value="analysis">Analysis</option>
                        </select>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expected outcome (§2.1.3)</span>
                        <div className="space-y-1.5">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
                            <input
                              type="text"
                              value={editForm.recommendationDetails.expectedOutcome?.description ?? ''}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), description: e.target.value },
                                  },
                                }))
                              }
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Quantified impact</label>
                              <input
                                type="text"
                                value={editForm.recommendationDetails.expectedOutcome?.quantifiedImpact ?? ''}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), quantifiedImpact: e.target.value || undefined },
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Impact type</label>
                              <select
                                value={editForm.recommendationDetails.expectedOutcome?.impactType ?? ''}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), impactType: (e.target.value || undefined) as RecommendationExpectedOutcome['impactType'] },
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              >
                                <option value="">—</option>
                                <option value="probability">Probability</option>
                                <option value="revenue">Revenue</option>
                                <option value="timeline">Timeline</option>
                                <option value="risk_reduction">Risk reduction</option>
                                <option value="efficiency">Efficiency</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Confidence</label>
                              <select
                                value={editForm.recommendationDetails.expectedOutcome?.confidence ?? ''}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), confidence: (e.target.value || undefined) as 'low' | 'medium' | 'high' },
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              >
                                <option value="">—</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Evidence</label>
                              <input
                                type="text"
                                value={editForm.recommendationDetails.expectedOutcome?.evidence ?? ''}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    recommendationDetails: {
                                      ...f.recommendationDetails,
                                      expectedOutcome: { ...(f.recommendationDetails.expectedOutcome ?? DEFAULT_EXPECTED_OUTCOME), evidence: e.target.value || undefined },
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Implementation (§2.1.3)</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Effort</label>
                            <select
                              value={editForm.recommendationDetails.implementation?.effort ?? ''}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    implementation: { ...(f.recommendationDetails.implementation ?? DEFAULT_IMPLEMENTATION), effort: (e.target.value || undefined) as 'low' | 'medium' | 'high' },
                                  },
                                }))
                              }
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            >
                              <option value="">—</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Complexity</label>
                            <select
                              value={editForm.recommendationDetails.implementation?.complexity ?? ''}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    implementation: { ...(f.recommendationDetails.implementation ?? DEFAULT_IMPLEMENTATION), complexity: (e.target.value || undefined) as 'simple' | 'moderate' | 'complex' },
                                  },
                                }))
                              }
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            >
                              <option value="">—</option>
                              <option value="simple">Simple</option>
                              <option value="moderate">Moderate</option>
                              <option value="complex">Complex</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Estimated time</label>
                            <input
                              type="text"
                              value={editForm.recommendationDetails.implementation?.estimatedTime ?? ''}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  recommendationDetails: {
                                    ...f.recommendationDetails,
                                    implementation: { ...(f.recommendationDetails.implementation ?? DEFAULT_IMPLEMENTATION), estimatedTime: e.target.value || undefined },
                                  },
                                }))
                              }
                              placeholder="e.g. 30 min"
                              className="w-full px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                            />
                          </div>
                        </div>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Opportunity types</label>
                  <div className="flex flex-wrap gap-3">
                    {OPPORTUNITY_TYPES.map((ot) => (
                      <label key={ot} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.applicableOpportunityTypes.includes(ot)}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              applicableOpportunityTypes: e.target.checked
                                ? [...f.applicableOpportunityTypes, ot]
                                : f.applicableOpportunityTypes.filter((x) => x !== ot),
                            }))
                          }
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm capitalize">{ot.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min amount ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.minAmount ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          minAmount: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max amount ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.maxAmount ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          maxAmount: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>
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
