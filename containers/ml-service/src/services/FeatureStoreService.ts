/**
 * Layer 2 Feature Store Service (COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY, LAYER_2_FEATURE_ENGINEERING_REQUIREMENTS).
 * Orchestrates extraction (via FeatureService), optional Redis cache, snapshot persistence, and export.
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { getRedisClient } from '@coder/shared/cache';
import type { RedisConfig } from '@coder/shared/cache';
import { NotFoundError } from '@coder/shared/utils/errors';
import { FeatureService } from './FeatureService';
import type {
  FeatureSnapshot,
  FeatureSchemaDefinition,
  FeaturePurpose,
  RiskCatalogFeatures,
  RiskCatalogDefinition,
  RiskCatalogTemplateView,
  MethodologyFeatures,
  MeddicFeatures,
  DormantOpportunityFeatures,
} from '../types/feature-store.types';
import { loadConfig } from '../config';

const DEFAULT_FEATURE_VERSION = 'v1';

export interface ExtractOptions {
  /** Resolve version (e.g. "v1"); used for snapshot and cache key. */
  featureVersion?: string;
  /** If true, persist snapshot to Cosmos. */
  persist?: boolean;
  /** If true, read from cache when available. */
  useCache?: boolean;
}

export interface ExportOptions {
  purpose: FeaturePurpose;
  featureVersion?: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  limit?: number;
}

export class FeatureStoreService {
  private snapshotContainerName: string;
  private featureService: FeatureService;
  private config: ReturnType<typeof loadConfig>;
  private redisConfig: RedisConfig | null = null;
  private cacheTtlSeconds: number = 3600;

  constructor(featureService: FeatureService) {
    this.featureService = featureService;
    this.config = loadConfig();
    this.snapshotContainerName =
      this.config.cosmos_db?.containers?.feature_snapshots ?? 'ml_feature_snapshots';
    if (this.config.cache?.redis?.enabled && this.config.cache.redis.url) {
      this.redisConfig = { url: this.config.cache.redis.url };
      this.cacheTtlSeconds = this.config.cache.redis.ttl_seconds ?? 3600;
    }
  }

  /**
   * Cache key for feature vector (tenantId, opportunityId, purpose, version).
   */
  private cacheKey(tenantId: string, opportunityId: string, purpose: FeaturePurpose, version: string): string {
    return `feature:${tenantId}:${opportunityId}:${purpose}:${version}`;
  }

  /**
   * Get cached feature vector if Redis is configured.
   */
  private async getCached(
    tenantId: string,
    opportunityId: string,
    purpose: FeaturePurpose,
    version: string
  ): Promise<Record<string, number> | null> {
    if (!this.redisConfig) return null;
    try {
      const client = getRedisClient(this.redisConfig);
      const redis = await client.getClient();
      const raw = await redis.get(this.cacheKey(tenantId, opportunityId, purpose, version));
      if (!raw) return null;
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return null;
    }
  }

  /**
   * Set feature vector in cache if Redis is configured.
   */
  private async setCached(
    tenantId: string,
    opportunityId: string,
    purpose: FeaturePurpose,
    version: string,
    features: Record<string, number>
  ): Promise<void> {
    if (!this.redisConfig) return;
    try {
      const client = getRedisClient(this.redisConfig);
      const redis = await client.getClient();
      await redis.setex(
        this.cacheKey(tenantId, opportunityId, purpose, version),
        this.cacheTtlSeconds,
        JSON.stringify(features)
      );
    } catch {
      // Cache write failure is non-fatal
    }
  }

  /**
   * Invalidate cache for an opportunity (e.g. on opportunity.updated). No-op if Redis not configured.
   */
  async invalidateCache(tenantId: string, opportunityId: string, _reason?: string): Promise<void> {
    if (!this.redisConfig) return;
    try {
      const client = getRedisClient(this.redisConfig);
      const redis = await client.getClient();
      const pattern = `feature:${tenantId}:${opportunityId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // Non-fatal
    }
  }

  /**
   * Extract features for one opportunity: cache → extract → optional persist → cache.
   */
  async extract(
    tenantId: string,
    opportunityId: string,
    purpose: FeaturePurpose,
    options: ExtractOptions = {}
  ): Promise<{ features: Record<string, number>; fromCache: boolean; snapshotId?: string }> {
    const version = options.featureVersion ?? DEFAULT_FEATURE_VERSION;
    const useCache = options.useCache !== false;
    const persist = options.persist === true;

    if (useCache) {
      const cached = await this.getCached(tenantId, opportunityId, purpose, version);
      if (cached) {
        return { features: cached, fromCache: true };
      }
    }

    const vector = await this.featureService.buildVectorForOpportunity(tenantId, opportunityId, purpose);
    if (!vector) {
      throw new NotFoundError('Opportunity', opportunityId);
    }

    if (persist) {
      const snapshot: FeatureSnapshot = {
        id: uuidv4(),
        tenantId,
        opportunityId,
        purpose,
        featureVersion: version,
        features: vector,
        extractedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const container = getContainer(this.snapshotContainerName);
      await container.items.create(snapshot, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
      await this.setCached(tenantId, opportunityId, purpose, version, vector);
      return { features: vector, fromCache: false, snapshotId: snapshot.id };
    }

    await this.setCached(tenantId, opportunityId, purpose, version, vector);
    return { features: vector, fromCache: false };
  }

  /**
   * Extract features for multiple opportunities (batch). Does not use cache per id; persists optionally.
   */
  async extractBatch(
    tenantId: string,
    opportunityIds: string[],
    purpose: FeaturePurpose,
    options: ExtractOptions = {}
  ): Promise<Map<string, { features: Record<string, number>; snapshotId?: string }>> {
    const result = new Map<string, { features: Record<string, number>; snapshotId?: string }>();
    for (const opportunityId of opportunityIds) {
      try {
        const out = await this.extract(tenantId, opportunityId, purpose, options);
        result.set(opportunityId, { features: out.features, snapshotId: out.snapshotId });
      } catch {
        // Skip failed opportunities; caller can check result size
      }
    }
    return result;
  }

  /**
   * W7 Gap 1 – Extract risk catalog features for Layer 2 (FR-1.7).
   * Calls risk-catalog tenant-catalog API and returns RiskCatalogFeatures.
   */
  async extractRiskCatalogFeatures(
    tenantId: string,
    industry?: string,
    stage?: string
  ): Promise<RiskCatalogFeatures> {
    const view = await this.featureService.getTenantCatalogView(tenantId, industry, stage);
    if (!view) {
      return {
        tenantRiskCategories: [],
        categoryDefinitions: {},
        riskTemplates: [],
        industrySpecificRisks: [],
        methodologyRisks: [],
      };
    }
    const categoryDefinitions: Record<string, RiskCatalogDefinition> = {};
    for (const [k, v] of Object.entries(view.categoryDefinitions)) {
      categoryDefinitions[k] = {
        name: v.name,
        description: v.description,
        defaultPonderation: v.defaultPonderation,
      };
    }
    const riskTemplates: RiskCatalogTemplateView[] = view.riskTemplates.map(t => ({
      id: t.id,
      riskId: t.riskId,
      name: t.name,
      category: t.category,
      industryId: t.industryId,
      applicableStages: t.applicableStages ?? [],
    }));
    return {
      tenantRiskCategories: view.tenantRiskCategories ?? [],
      categoryDefinitions,
      riskTemplates,
      industrySpecificRisks: view.industrySpecificRisks ?? [],
      methodologyRisks: view.methodologyRisks ?? [],
    };
  }

  /**
   * W8 – Extract methodology-aware features for Layer 2 (FR-1.8).
   * Uses tenant methodology from risk-analytics and opportunity structuredData (e.g. from shard c_opportunity).
   */
  async extractMethodologyFeatures(
    tenantId: string,
    opportunity: Record<string, unknown>
  ): Promise<MethodologyFeatures> {
    const empty: MethodologyFeatures = {
      stageRequirementsMet: 0,
      stageRequirementsMissing: [],
      stageExitCriteriaReady: false,
      daysInCurrentStage: 0,
      expectedDaysInStage: 0,
      stageDurationAnomaly: false,
      methodologyFieldsComplete: 0,
      methodologyFieldsMissing: [],
      expectedActivitiesCompleted: 0,
      unexpectedActivitiesCount: 0,
    };

    const methodology = await this.featureService.getTenantMethodology(tenantId);
    if (!methodology?.stages?.length) return empty;

    const stageKey = (opportunity.StageName ?? opportunity.stage) as string | undefined;
    const currentStage = methodology.stages.find(
      (s) => s.stageId === stageKey || s.stageName === stageKey
    );
    if (!currentStage) return empty;

    const nowMs = Date.now();
    const stageUpdatedAt = opportunity.StageUpdatedAt ?? opportunity.StageUpdated ?? opportunity.LastModifiedDate;
    const createdDate = opportunity.CreatedDate ?? opportunity.CreatedAt;
    const dateSrc = typeof stageUpdatedAt === 'string' ? new Date(stageUpdatedAt).getTime() : typeof stageUpdatedAt === 'number' ? stageUpdatedAt : null;
    const createdMs = typeof createdDate === 'string' ? new Date(createdDate).getTime() : typeof createdDate === 'number' ? createdDate : null;
    const refMs = Number.isFinite(dateSrc) ? dateSrc! : createdMs ?? nowMs;
    const daysInCurrentStage = Math.max(0, Math.floor((nowMs - refMs) / 86400000));
    const expectedDaysInStage = currentStage.typicalDurationDays?.avg ?? 0;
    const stageDurationAnomaly = daysInCurrentStage > (currentStage.typicalDurationDays?.max ?? Number.MAX_SAFE_INTEGER);

    const requiredForStage = (methodology.requiredFields ?? []).filter((rf) => {
      const stages = (rf.stages ?? []) as string[];
      return stages.length > 0 && (stages.includes(currentStage.stageId) || stages.includes(currentStage.stageName));
    });
    let filled = 0;
    const methodologyFieldsMissing: string[] = [];
    for (const rf of requiredForStage) {
      const val = opportunity[rf.fieldName];
      if (val !== undefined && val !== null && String(val).trim() !== '') filled++;
      else methodologyFieldsMissing.push(rf.fieldName);
    }
    const methodologyFieldsComplete = requiredForStage.length > 0 ? filled / requiredForStage.length : 1;

    const requirements = currentStage.requirements ?? [];
    const stageRequirementsMissing = requirements.map((r) => r.name);
    const stageRequirementsMet = requirements.length > 0 ? 0 : 1;
    const stageExitCriteriaReady = false;

    let meddic: MeddicFeatures | undefined;
    if (methodology.methodologyType === 'MEDDIC' || methodology.methodologyType === 'MEDDPICC') {
      const fields = ['MetricsIdentified', 'EconomicBuyerIdentified', 'DecisionCriteriaKnown', 'DecisionProcessKnown', 'PaperProcessKnown', 'IdentifiedPainConfirmed', 'ChampionIdentified', 'CompetitionAssessed'] as const;
      const booleans: Record<string, boolean> = {};
      let count = 0;
      for (const f of fields) {
        const v = opportunity[f] ?? opportunity[f.charAt(0).toLowerCase() + f.slice(1)];
        const b = v === true || v === 'true' || v === 1;
        booleans[f] = b;
        if (b) count++;
      }
      const total = methodology.methodologyType === 'MEDDPICC' ? 8 : 7;
      meddic = {
        metricsIdentified: booleans.MetricsIdentified ?? false,
        economicBuyerIdentified: booleans.EconomicBuyerIdentified ?? false,
        decisionCriteriaKnown: booleans.DecisionCriteriaKnown ?? false,
        decisionProcessKnown: booleans.DecisionProcessKnown ?? false,
        paperProcessKnown: methodology.methodologyType === 'MEDDPICC' ? (booleans.PaperProcessKnown ?? false) : undefined,
        identifiedPainConfirmed: booleans.IdentifiedPainConfirmed ?? false,
        championIdentified: booleans.ChampionIdentified ?? false,
        competitionAssessed: methodology.methodologyType === 'MEDDPICC' ? (booleans.CompetitionAssessed ?? false) : undefined,
        meddicScore: total > 0 ? count / total : 0,
      };
    }

    return {
      stageRequirementsMet,
      stageRequirementsMissing,
      stageExitCriteriaReady,
      daysInCurrentStage,
      expectedDaysInStage,
      stageDurationAnomaly,
      methodologyFieldsComplete,
      methodologyFieldsMissing,
      expectedActivitiesCompleted: 0,
      unexpectedActivitiesCount: 0,
      meddic,
    };
  }

  /**
   * W9 – Extract dormant opportunity features for Layer 2 (FR-1.9).
   */
  async extractDormantOpportunityFeatures(tenantId: string, opportunityId: string): Promise<DormantOpportunityFeatures | null> {
    return this.featureService.extractDormantOpportunityFeatures(tenantId, opportunityId);
  }

  /**
   * Get feature schema for a purpose (feature names and types from pipeline). Derived from buildVectorForOpportunity output shape.
   */
  getSchema(purpose?: FeaturePurpose): FeatureSchemaDefinition[] {
    const base: FeatureSchemaDefinition[] = [
      { name: 'amount', type: 'number', description: 'Opportunity amount', source: 'c_opportunity' },
      { name: 'probability', type: 'number', description: 'Win probability 0-1', source: 'c_opportunity' },
      { name: 'days_to_close', type: 'number', source: 'c_opportunity' },
      { name: 'days_in_stage', type: 'number', source: 'c_opportunity' },
      { name: 'days_since_created', type: 'number', source: 'c_opportunity' },
      { name: 'is_closed', type: 'number', source: 'c_opportunity' },
      { name: 'is_won', type: 'number', source: 'c_opportunity' },
      { name: 'stage_encoded', type: 'number', source: 'c_opportunity' },
      { name: 'industry_encoded', type: 'number', source: 'c_opportunity' },
      { name: 'competitor_count', type: 'number', source: 'c_opportunity' },
      { name: 'days_since_last_activity', type: 'number', source: 'activities' },
      { name: 'activity_count_30d', type: 'number', source: 'activities' },
      { name: 'stage_stagnation_days', type: 'number', source: 'c_opportunity' },
      { name: 'stakeholder_count', type: 'number', source: 'c_contact' },
      { name: 'risk_score_latest', type: 'number', source: 'risk_analytics' },
      { name: 'risk_velocity', type: 'number', source: 'risk_analytics' },
      { name: 'risk_acceleration', type: 'number', source: 'risk_analytics' },
    ];
    if (purpose === 'forecasting') {
      return [...base, { name: 'opportunity_value', type: 'number', source: 'c_opportunity' }];
    }
    return base;
  }

  /**
   * Export snapshots for training: list by tenant, purpose, version, date range.
   */
  async exportSnapshots(
    tenantId: string,
    options: ExportOptions
  ): Promise<{ items: FeatureSnapshot[]; continuationToken?: string }> {
    const version = options.featureVersion ?? DEFAULT_FEATURE_VERSION;
    const limit = Math.min(options.limit ?? 1000, 5000);
    const container = getContainer(this.snapshotContainerName);
    const query = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.purpose = @purpose AND c.featureVersion = @version AND c.extractedAt >= @start AND c.extractedAt <= @end ORDER BY c.extractedAt ASC`;
    const parameters = [
      { name: '@tenantId', value: tenantId },
      { name: '@purpose', value: options.purpose },
      { name: '@version', value: version },
      { name: '@start', value: options.startDate },
      { name: '@end', value: options.endDate },
    ];
    const { resources, continuationToken } = await container.items
      .query<FeatureSnapshot>({ query, parameters })
      .fetchNext();
    return {
      items: resources.slice(0, limit),
      continuationToken: resources.length > limit ? continuationToken : undefined,
    };
  }

  /**
   * Get a single snapshot by id (tenantId is partition key).
   */
  async getSnapshotById(snapshotId: string, tenantId: string): Promise<FeatureSnapshot> {
    const container = getContainer(this.snapshotContainerName);
    const query = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.id = @id`;
    const { resources } = await container.items
      .query<FeatureSnapshot>({ query, parameters: [{ name: '@tenantId', value: tenantId }, { name: '@id', value: snapshotId }] })
      .fetchNext();
    if (!resources?.[0]) {
      throw new NotFoundError('Feature snapshot', snapshotId);
    }
    return resources[0];
  }
}
