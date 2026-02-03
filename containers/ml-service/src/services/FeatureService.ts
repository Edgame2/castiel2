/**
 * Feature Service
 * Handles feature store management and buildVectorForOpportunity (BI_SALES_RISK_FEATURE_PIPELINE_SPEC).
 * Uses CAIS (adaptive-learning) for adaptive feature engineering.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { FastifyInstance } from 'fastify';
import {
  Feature,
} from '../types/ml.types';
import type { DormantOpportunityFeatures, TenantMLConfigView } from '../types/feature-store.types';
import { loadConfig } from '../config';

/** Purpose for buildVectorForOpportunity (FEATURE_PIPELINE_SPEC §1). */
export type FeaturePurpose = 'risk-scoring' | 'win-probability' | 'lstm' | 'anomaly' | 'forecasting';

const DEFAULT_STAGE_LABELS = ['Unknown', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const DEFAULT_INDUSTRY_LABELS = ['general'];
const MS_PER_DAY = 86400000;

export class FeatureService {
  private containerName = 'ml_features';
  private adaptiveLearningClient: ServiceClient;
  private shardManagerClient: ServiceClient | null = null;
  private riskAnalyticsClient: ServiceClient | null = null;
  private riskCatalogClient: ServiceClient | null = null;
  private app: FastifyInstance | null = null;
  private config: ReturnType<typeof loadConfig>;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();

    // Initialize adaptive-learning service client
    this.adaptiveLearningClient = new ServiceClient({
      baseURL: this.config.services.adaptive_learning?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    const smUrl = this.config.services.shard_manager?.url;
    if (smUrl) {
      this.shardManagerClient = new ServiceClient({
        baseURL: smUrl,
        timeout: 15000,
        retries: 2,
        circuitBreaker: { enabled: true },
      });
    }
    const raUrl = this.config.services.risk_analytics?.url;
    if (raUrl) {
      this.riskAnalyticsClient = new ServiceClient({
        baseURL: raUrl,
        timeout: 15000,
        retries: 2,
        circuitBreaker: { enabled: true },
      });
    }
    const rcUrl = this.config.services.risk_catalog?.url;
    if (rcUrl) {
      this.riskCatalogClient = new ServiceClient({
        baseURL: rcUrl,
        timeout: 15000,
        retries: 2,
        circuitBreaker: { enabled: true },
      });
    }
  }

  /**
   * W7 Gap 1 – Get tenant catalog view from risk-catalog (Layer 2).
   * Returns raw view; use FeatureStoreService.extractRiskCatalogFeatures for RiskCatalogFeatures.
   */
  async getTenantCatalogView(
    tenantId: string,
    industry?: string,
    stage?: string
  ): Promise<{
    tenantRiskCategories: string[];
    categoryDefinitions: Record<string, { name: string; description?: string; defaultPonderation?: number }>;
    riskTemplates: Array<{ id: string; riskId: string; name: string; category: string; industryId?: string; applicableStages: string[] }>;
    industrySpecificRisks: string[];
    methodologyRisks: string[];
  } | null> {
    if (!this.riskCatalogClient) return null;
    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const params = new URLSearchParams();
    if (industry) params.set('industry', industry);
    if (stage) params.set('stage', stage);
    const qs = params.toString();
    try {
      const response = await this.riskCatalogClient.get<{
        tenantRiskCategories: string[];
        categoryDefinitions: Record<string, { name: string; description?: string; defaultPonderation?: number }>;
        riskTemplates: Array<{ id: string; riskId: string; name: string; category: string; industryId?: string; applicableStages: string[] }>;
        industrySpecificRisks: string[];
        methodologyRisks: string[];
      }>(`/api/v1/risk-catalog/tenant-catalog${qs ? `?${qs}` : ''}`, { headers });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('ml-service: risk-catalog tenant-catalog unavailable', { error: msg, tenantId, service: 'ml-service' });
      return null;
    }
  }

  /**
   * W10 – Get tenant ML configuration from risk-analytics (Layer 3 model selection, thresholds).
   * Returns null if risk-analytics is not configured or returns 404.
   */
  async getTenantMLConfig(tenantId: string): Promise<TenantMLConfigView | null> {
    if (!this.riskAnalyticsClient) return null;
    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const response = await this.riskAnalyticsClient.get<{
        modelPreferences?: { preferIndustryModels?: boolean; minConfidenceThreshold?: number };
      }>('/api/v1/tenant-ml-config', { headers });
      return response ? { modelPreferences: response.modelPreferences } : null;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('ml-service: risk-analytics tenant-ml-config unavailable', { error: msg, tenantId, service: 'ml-service' });
      return null;
    }
  }

  /**
   * W8 – Get tenant sales methodology from risk-analytics (Layer 2 extractMethodologyFeatures).
   * Returns null if risk-analytics is not configured or returns 404.
   */
  async getTenantMethodology(tenantId: string): Promise<{
    methodologyType: string;
    stages: Array<{
      stageId: string;
      stageName: string;
      displayName: string;
      order: number;
      requirements: Array<{ requirementId: string; name: string; mandatory: boolean }>;
      exitCriteria: Array<{ criteriaId: string; mandatory: boolean }>;
      typicalDurationDays: { min: number; avg: number; max: number };
      expectedActivities: string[];
    }>;
    requiredFields: Array<{ fieldName: string; stages: string[]; dataType: string }>;
    risks: Array<{ riskId: string; stage: string; description: string; severity: string }>;
  } | null> {
    if (!this.riskAnalyticsClient) return null;
    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const response = await this.riskAnalyticsClient.get<{
        methodologyType: string;
        stages: Array<{
          stageId: string;
          stageName: string;
          displayName: string;
          order: number;
          requirements: Array<{ requirementId: string; name: string; mandatory: boolean }>;
          exitCriteria: Array<{ criteriaId: string; mandatory: boolean }>;
          typicalDurationDays: { min: number; avg: number; max: number };
          expectedActivities: string[];
        }>;
        requiredFields: Array<{ fieldName: string; stages: string[]; dataType: string }>;
        risks: Array<{ riskId: string; stage: string; description: string; severity: string }>;
      }>(`/api/v1/sales-methodology`, { headers });
      return response;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('ml-service: risk-analytics sales-methodology unavailable', { error: msg, tenantId, service: 'ml-service' });
      return null;
    }
  }

  /**
   * Get opportunity structuredData from shard-manager for methodology/feature extraction.
   * Returns null if shard-manager not configured or opportunity not found.
   */
  async getOpportunityStructuredData(tenantId: string, opportunityId: string): Promise<Record<string, unknown> | null> {
    if (!this.shardManagerClient) return null;
    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const shard = await this.shardManagerClient.get<{ structuredData?: Record<string, unknown> }>(`/api/v1/shards/${opportunityId}`, { headers });
      return shard?.structuredData ?? null;
    } catch (e: unknown) {
      if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
      throw e;
    }
  }

  /**
   * W9 – Get related activities for an opportunity (c_email, c_call, c_meeting) for dormant feature extraction.
   */
  private async getOpportunityActivities(tenantId: string, opportunityId: string): Promise<Array<{ createdAt?: string | Date }>> {
    if (!this.shardManagerClient) return [];
    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const activityTypes = ['c_email', 'c_call', 'c_meeting'];
    const activities: Array<{ createdAt?: string | Date }> = [];
    for (const t of activityTypes) {
      try {
        const related = await this.shardManagerClient.get<Array<{ shard?: { createdAt?: string | Date } }>>(
          `/api/v1/shards/${opportunityId}/related?direction=both&targetShardTypeId=${encodeURIComponent(t)}&limit=500`,
          { headers }
        );
        const list = Array.isArray(related) ? related : [];
        for (const r of list) {
          if (r?.shard) activities.push(r.shard);
        }
      } catch {
        // ignore
      }
    }
    return activities;
  }

  /**
   * W9 – Extract dormant opportunity features (Layer 2, FR-1.9).
   * Uses opportunity structuredData and related activities from shard-manager.
   */
  async extractDormantOpportunityFeatures(tenantId: string, opportunityId: string): Promise<DormantOpportunityFeatures | null> {
    const opportunity = await this.getOpportunityStructuredData(tenantId, opportunityId);
    if (!opportunity) return null;
    const activities = await this.getOpportunityActivities(tenantId, opportunityId);
    const now = Date.now();
    const MS_PER_DAY = 86400000;
    const toMs = (v: unknown): number => {
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'string') return new Date(v).getTime();
      if (typeof v === 'number' && !isNaN(v)) return v;
      return 0;
    };

    const lastActivityDate = opportunity.LastActivityDate as string | undefined;
    const actDate = lastActivityDate
      ? new Date(lastActivityDate).getTime()
      : (activities.length > 0 ? Math.max(...activities.map((a) => toMs(a.createdAt))) : null);
    const daysSinceLastActivity = actDate != null ? Math.max(0, Math.floor((now - actDate) / MS_PER_DAY)) : 999;

    const stageUpdatedAt = (opportunity.StageUpdatedAt as string) ?? (opportunity.StageDates as Record<string, string>)?.[opportunity.StageName as string];
    const daysSinceLastStageChange = stageUpdatedAt
      ? Math.max(0, Math.floor((now - new Date(stageUpdatedAt).getTime()) / MS_PER_DAY))
      : (opportunity.CreatedDate ? Math.max(0, Math.floor((now - new Date(opportunity.CreatedDate as string).getTime()) / MS_PER_DAY)) : 999);

    const daysSinceOwnerContact = daysSinceLastActivity;
    const daysSinceCustomerResponse = daysSinceLastActivity;

    const cutoff7 = now - 7 * MS_PER_DAY;
    const cutoff30 = now - 30 * MS_PER_DAY;
    const cutoff90 = now - 90 * MS_PER_DAY;
    const activityCountLast7Days = activities.filter((a) => toMs(a.createdAt) >= cutoff7).length;
    const activityCountLast30Days = activities.filter((a) => toMs(a.createdAt) >= cutoff30).length;
    const activityCountLast90Days = activities.filter((a) => toMs(a.createdAt) >= cutoff90).length;

    const prev30 = activityCountLast30Days - activityCountLast7Days;
    const activityVelocityChange = prev30 > 0 ? (activityCountLast7Days - prev30 / (23 / 7)) / (prev30 / (23 / 7)) : 0;

    const createdMs = opportunity.CreatedDate ? new Date(opportunity.CreatedDate as string).getTime() : now;
    const timeElapsed = Math.max(0, Math.floor((now - createdMs) / MS_PER_DAY));
    const closeDate = opportunity.CloseDate as string | undefined;
    const closeMs = closeDate ? new Date(closeDate).getTime() : null;
    const timeToClose = closeMs != null ? (closeMs <= now ? 0 : Math.floor((closeMs - now) / MS_PER_DAY)) : 0;

    const customerEngagementScore = activityCountLast30Days > 0 ? Math.min(1, activityCountLast30Days / 10) : 0;
    const ownerEngagementScore = activityCountLast30Days > 0 ? Math.min(1, activityCountLast30Days / 8) : 0;
    const stakeholderEngagementScore = customerEngagementScore;

    let dormancyCategory: 'recently_dormant' | 'long_dormant' | 'likely_lost' = 'recently_dormant';
    let dormancyReason: string | undefined;
    if (daysSinceLastActivity >= 90) {
      dormancyCategory = 'likely_lost';
      dormancyReason = 'No activity for 90+ days';
    } else if (daysSinceLastActivity >= 30) {
      dormancyCategory = 'long_dormant';
      dormancyReason = 'No activity for 30+ days';
    } else if (daysSinceLastActivity >= 14) {
      dormancyCategory = 'recently_dormant';
      dormancyReason = 'No activity for 14+ days';
    }

    return {
      daysSinceLastActivity,
      daysSinceLastStageChange,
      daysSinceOwnerContact,
      daysSinceCustomerResponse,
      activityVelocityChange,
      activityCountLast7Days,
      activityCountLast30Days,
      activityCountLast90Days,
      customerEngagementScore,
      ownerEngagementScore,
      stakeholderEngagementScore,
      previouslyReactivated: false,
      reactivationSuccessRate: 0,
      timeToClose,
      timeElapsed,
      recentAccountActivity: false,
      economicIndicators: [],
      competitorActivity: false,
      dormancyCategory,
      dormancyReason,
    };
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'ml-service',
      serviceName: 'ml-service',
      tenantId,
    });
  }

  /**
   * Get adaptive feature importance weights from CAIS
   */
  async getAdaptiveFeatureWeights(tenantId: string, context?: string): Promise<Record<string, number> | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<any>(
        `/api/v1/adaptive-learning/feature-engineering/${tenantId}${context ? `?context=${context}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response.featureWeights || null;
    } catch (error: unknown) {
      // CAIS unavailable, return null (use default weights)
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('Failed to get adaptive feature weights, using defaults', { error: msg, tenantId, service: 'ml-service' });
      return null;
    }
  }

  /**
   * Build feature vector for an opportunity (BI_SALES_RISK_FEATURE_PIPELINE_SPEC).
   * Calls shard-manager (/shards/:id, /shards/:id/related) and risk-analytics (risk-snapshots).
   * @returns Record<string, number> or null if opportunity not found
   */
  async buildVectorForOpportunity(
    tenantId: string,
    opportunityId: string,
    purpose: FeaturePurpose
  ): Promise<Record<string, number> | null> {
    if (!this.shardManagerClient) {
      throw new BadRequestError('services.shard_manager.url is required for buildVectorForOpportunity');
    }

    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // 1. GET /shards/{opportunityId}
    let opportunity: { structuredData?: Record<string, unknown>; id?: string } | null = null;
    try {
      opportunity = await this.shardManagerClient.get(`/api/v1/shards/${opportunityId}`, { headers });
    } catch (e: unknown) {
      if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
      throw e;
    }
    if (!opportunity?.structuredData) return null;

    const sd = opportunity.structuredData as Record<string, unknown>;
    const now = Date.now();

    // 2. Account (optional)
    let accountSd: Record<string, unknown> | null = null;
    const accountId = sd.AccountId as string | undefined;
    if (accountId && this.shardManagerClient) {
      try {
        const account = await this.shardManagerClient.get<{ structuredData?: Record<string, unknown> }>(`/api/v1/shards/${accountId}`, { headers });
        accountSd = account?.structuredData ?? null;
      } catch { /* 404 or other: keep null */ }
    }

    // 3. Related activities and contacts
    const activityTypes = ['c_email', 'c_call', 'c_meeting'];
    const activities: Array<{ createdAt?: string | Date }> = [];
    for (const t of activityTypes) {
      try {
        const related = await this.shardManagerClient.get<Array<{ shard?: { createdAt?: string | Date } }>>(
          `/api/v1/shards/${opportunityId}/related?direction=both&targetShardTypeId=${encodeURIComponent(t)}&limit=500`,
          { headers }
        );
        const list = Array.isArray(related) ? related : [];
        for (const r of list) {
          if (r?.shard) activities.push(r.shard);
        }
      } catch { /* ignore */ }
    }

    let contacts: Array<unknown> = [];
    try {
      const related = await this.shardManagerClient.get<Array<{ shard?: unknown }>>(
        `/api/v1/shards/${opportunityId}/related?direction=both&targetShardTypeId=c_contact&limit=500`,
        { headers }
      );
      const list = Array.isArray(related) ? related : [];
      contacts = list.map((r) => r?.shard).filter(Boolean);
    } catch { /* ignore */ }

    // 4. Risk snapshots from risk-analytics
    let riskScoreLatest = 0.5;
    let riskVelocity = 0;
    let riskAcceleration = 0;
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (purpose === 'lstm' ? 30 : 7));
    if (this.riskAnalyticsClient) {
      try {
        const res = await this.riskAnalyticsClient.get<{ snapshots?: Array<{ riskScore?: number; snapshotDate?: string }> }>(
          `/api/v1/opportunities/${opportunityId}/risk-snapshots?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`,
          { headers }
        );
        const snapshots = (res?.snapshots ?? []).slice().sort((a: { snapshotDate?: string }, b: { snapshotDate?: string }) =>
          (b.snapshotDate || '').localeCompare(a.snapshotDate || '')
        );
        if (snapshots.length > 0) {
          riskScoreLatest = Number(snapshots[0]?.riskScore ?? 0.5);
          if (snapshots.length >= 2) {
            const s0 = Number(snapshots[0]?.riskScore ?? 0);
            const s1 = Number(snapshots[1]?.riskScore ?? 0);
            riskVelocity = (s0 - s1) / 7;
          }
          if (snapshots.length >= 3) {
            const s1 = Number(snapshots[1]?.riskScore ?? 0);
            const s2 = Number(snapshots[2]?.riskScore ?? 0);
            const v1 = (s1 - s2) / 7;
            riskAcceleration = riskVelocity - v1;
          }
        } else {
          // Fallback to latest-evaluation when no snapshots (FEATURE_PIPELINE_SPEC §2.2: risk_evaluations)
          try {
            const latest = await this.riskAnalyticsClient.get<{ riskScore?: number }>(
              `/api/v1/risk/opportunities/${opportunityId}/latest-evaluation`,
              { headers }
            );
            if (latest?.riskScore != null) riskScoreLatest = Number(latest.riskScore);
          } catch { /* 404 or error: keep riskScoreLatest 0.5 */ }
        }
      } catch { /* use defaults */ }
    }

    // 5. Compute features (FEATURE_PIPELINE_SPEC §3)
    const stageLabels = this.config.feature_pipeline?.stage_labels ?? DEFAULT_STAGE_LABELS;
    const industryLabels = this.config.feature_pipeline?.industry_labels ?? DEFAULT_INDUSTRY_LABELS;

    const labelIndex = (arr: string[], v: string | undefined): number => {
      if (v == null || v === '') return 0;
      const i = arr.indexOf(v);
      return i >= 0 ? i : 0;
    };

    const closeDate = sd.CloseDate ? new Date(sd.CloseDate as string).getTime() : null;
    const daysToClose = closeDate != null
      ? (closeDate <= now ? 0 : Math.min(999, Math.round((closeDate - now) / MS_PER_DAY)))
      : 0;

    const stageUpdatedAtRaw = (sd.StageUpdatedAt as string) || (sd.StageDates && (sd.StageDates as Record<string, string>)[sd.StageName as string]);
    const stageUpdatedAt = typeof stageUpdatedAtRaw === 'string' || typeof stageUpdatedAtRaw === 'number' || stageUpdatedAtRaw instanceof Date ? stageUpdatedAtRaw : null;
    const daysInStage = stageUpdatedAt != null
      ? Math.max(0, Math.round((now - new Date(stageUpdatedAt).getTime()) / MS_PER_DAY))
      : 0;

    const createdDate = sd.CreatedDate as string | undefined;
    const daysSinceCreated = createdDate
      ? Math.max(0, Math.round((now - new Date(createdDate).getTime()) / MS_PER_DAY))
      : 0;

    const toMs = (v: unknown): number => {
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'string') return new Date(v).getTime();
      if (typeof v === 'number' && !isNaN(v)) return v;
      return 0;
    };
    const lastActivityDate = sd.LastActivityDate as string | undefined;
    const actDate = lastActivityDate
      ? new Date(lastActivityDate).getTime()
      : (activities.length > 0
          ? Math.max(...activities.map((a) => toMs(a.createdAt)))
          : null);
    const daysSinceLastActivity = actDate != null
      ? Math.max(0, Math.round((now - actDate) / MS_PER_DAY))
      : 999;

    const cutoff30 = now - 30 * MS_PER_DAY;
    const activityCount30d = activities.filter((a) => toMs(a.createdAt) >= cutoff30).length;

    const industryId = (sd.IndustryId as string) || (accountSd?.IndustryId as string) || null;
    const stageEncoded = labelIndex(stageLabels, sd.StageName as string);
    const industryEncoded = labelIndex(industryLabels, industryId ?? undefined);

    const vec: Record<string, number> = {
      amount: Number(sd.Amount ?? 0),
      probability: Number(sd.Probability ?? 50) / 100,
      days_to_close: daysToClose,
      days_in_stage: daysInStage,
      days_since_created: daysSinceCreated,
      is_closed: (sd.IsClosed as boolean) ? 1 : 0,
      is_won: (sd.IsWon as boolean) ? 1 : 0,
      stage_encoded: stageEncoded,
      industry_encoded: industryEncoded,
      competitor_count: Array.isArray(sd.CompetitorIds) ? sd.CompetitorIds.length : 0,
      days_since_last_activity: daysSinceLastActivity,
      activity_count_30d: activityCount30d,
      stage_stagnation_days: daysInStage,
      stakeholder_count: contacts.length,
      risk_score_latest: riskScoreLatest,
      risk_velocity: riskVelocity,
      risk_acceleration: riskAcceleration,
    };

    if (purpose === 'forecasting') {
      vec.opportunity_value = vec.amount;
    }

    return vec;
  }

  /**
   * Create feature
   */
  async create(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      type: 'numeric' | 'categorical' | 'text' | 'datetime' | 'boolean';
      source?: string;
      transformation?: string;
      statistics?: Feature['statistics'];
    }
  ): Promise<Feature> {
    if (!tenantId || !input.name || !input.type) {
      throw new BadRequestError('tenantId, name, and type are required');
    }

    const feature: Feature = {
      id: uuidv4(),
      tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      source: input.source,
      transformation: input.transformation,
      statistics: input.statistics,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(feature, {
        partitionKey: tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create feature');
      }

      return resource as Feature;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Feature with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get feature by ID
   */
  async getById(featureId: string, tenantId: string): Promise<Feature> {
    if (!featureId || !tenantId) {
      throw new BadRequestError('featureId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(featureId, tenantId).read<Feature>();

      if (!resource) {
        throw new NotFoundError('Feature', featureId);
      }

      return resource;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) throw error;
      if ((error as { code?: number }).code === 404) {
        throw new NotFoundError('Feature', featureId);
      }
      throw error;
    }
  }

  /**
   * Update feature
   */
  async update(
    featureId: string,
    tenantId: string,
    input: Partial<Omit<Feature, 'id' | 'tenantId' | 'createdAt' | 'createdBy' | '_rid' | '_self' | '_etag' | '_ts'>>
  ): Promise<Feature> {
    const existing = await this.getById(featureId, tenantId);

    const updated: Feature = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(featureId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update feature');
      }

      return resource as Feature;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Feature', featureId);
      }
      throw error;
    }
  }

  /**
   * Delete feature
   */
  async delete(featureId: string, tenantId: string): Promise<void> {
    await this.getById(featureId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(featureId, tenantId).delete();
  }

  /**
   * List features
   */
  async list(
    tenantId: string,
    filters?: {
      type?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Feature[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Feature>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list features: ${msg}`);
    }
  }
}

