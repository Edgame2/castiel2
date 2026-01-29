/**
 * FeedbackService - Feedback types, config, storage, aggregation
 * Per RECOMMENDATION_FEEDBACK_COMPLETE_REQUIREMENTS FR-1.x
 */

import { getContainer } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  FeedbackType,
  GlobalFeedbackConfig,
  TenantFeedbackConfig,
  RecommendationFeedbackRecord,
  FeedbackAggregation,
  FeedbackAggregationPeriod,
  CreateFeedbackTypeInput,
  UpdateFeedbackTypeInput,
} from '../types/feedback.types';
import { FEEDBACK_TYPES_SEED, toFeedbackTypeDoc, GLOBAL_FEEDBACK_CONFIG_SEED } from '../constants/feedback-types-seed';

const GLOBAL_TENANT_ID = '_global';

export class FeedbackService {
  private config = loadConfig();
  private feedbackContainerName: string;
  private aggregationContainerName: string;
  private configContainerName: string;

  constructor() {
    this.feedbackContainerName =
      this.config.cosmos_db.containers.feedback ?? 'recommendation_feedback';
    this.aggregationContainerName =
      this.config.cosmos_db.containers.feedback_aggregation ?? 'recommendation_feedback_aggregation';
    this.configContainerName =
      this.config.cosmos_db.containers.recommendation_config ?? 'recommendation_config';
  }

  /**
   * Get a single feedback type by id (global). Returns null if not found.
   */
  async getFeedbackTypeById(id: string): Promise<FeedbackType | null> {
    if (!id.startsWith('feedback_type_')) return null;
    const container = getContainer(this.configContainerName);
    const { resource } = await container.item(id, GLOBAL_TENANT_ID).read();
    return resource as FeedbackType | null;
  }

  /**
   * Get feedback types (global). Seeds if empty.
   */
  async getFeedbackTypes(): Promise<FeedbackType[]> {
    const container = getContainer(this.configContainerName);
    const now = new Date().toISOString();
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tid AND STARTSWITH(c.id, @prefix)',
        parameters: [
          { name: '@tid', value: GLOBAL_TENANT_ID },
          { name: '@prefix', value: 'feedback_type_' },
        ],
      })
      .fetchAll();
    if (resources.length === 0) {
      await this.seedFeedbackTypesAndGlobalConfig(now);
      return this.getFeedbackTypes();
    }
    return resources as FeedbackType[];
  }

  /**
   * Seed 25+ feedback types and global config if not present.
   */
  async seedFeedbackTypesAndGlobalConfig(now?: string): Promise<void> {
    const container = getContainer(this.configContainerName);
    const ts = now ?? new Date().toISOString();
    const existing = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tid AND c.id = @id',
        parameters: [
          { name: '@tid', value: GLOBAL_TENANT_ID },
          { name: '@id', value: 'global_feedback_config' },
        ],
      })
      .fetchAll();
    if (existing.resources.length > 0) return;
    for (const seed of FEEDBACK_TYPES_SEED) {
      const doc = toFeedbackTypeDoc(seed, ts);
      await container.items.create(
        { ...doc, tenantId: GLOBAL_TENANT_ID, partitionKey: GLOBAL_TENANT_ID },
        { partitionKey: GLOBAL_TENANT_ID } as Parameters<typeof container.items.create>[1]
      );
    }
    const globalConfig = {
      ...GLOBAL_FEEDBACK_CONFIG_SEED,
      tenantId: GLOBAL_TENANT_ID,
      partitionKey: GLOBAL_TENANT_ID,
    };
    await container.items.create(globalConfig, { partitionKey: GLOBAL_TENANT_ID } as Parameters<typeof container.items.create>[1]);
    log.info('Seeded feedback types and global config', { service: 'recommendations' });
  }

  /**
   * Create a feedback type (Super Admin). Id is feedback_type_<name>; name must be unique slug (e.g. alphanumeric + underscore).
   */
  async createFeedbackType(input: CreateFeedbackTypeInput, createdBy: string): Promise<FeedbackType> {
    const container = getContainer(this.configContainerName);
    const id = `feedback_type_${input.name}`;
    const existing = await this.getFeedbackTypeById(id);
    if (existing) {
      const err = new Error(`Feedback type with name "${input.name}" already exists`);
      (err as Error & { statusCode?: number }).statusCode = 409;
      throw err;
    }
    const now = new Date().toISOString();
    const doc: FeedbackType & { tenantId: string; partitionKey: string } = {
      id,
      partitionKey: GLOBAL_TENANT_ID,
      tenantId: GLOBAL_TENANT_ID,
      name: input.name,
      displayName: input.displayName,
      category: input.category,
      sentiment: input.sentiment,
      sentimentScore: input.sentimentScore,
      icon: input.icon,
      color: input.color,
      order: input.order,
      behavior: input.behavior,
      applicableToRecTypes: input.applicableToRecTypes ?? [],
      isActive: input.isActive,
      isDefault: input.isDefault,
      translations: input.translations,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    await container.items.create(doc, { partitionKey: GLOBAL_TENANT_ID } as Parameters<typeof container.items.create>[1]);
    return doc as FeedbackType;
  }

  /**
   * Update a feedback type (Super Admin).
   */
  async updateFeedbackType(id: string, updates: UpdateFeedbackTypeInput, _updatedBy: string): Promise<FeedbackType | null> {
    const existing = await this.getFeedbackTypeById(id);
    if (!existing) return null;
    const container = getContainer(this.configContainerName);
    const now = new Date().toISOString();
    const behavior = updates.behavior
      ? { ...existing.behavior, ...updates.behavior }
      : existing.behavior;
    const doc: FeedbackType & { tenantId: string; partitionKey: string } = {
      ...existing,
      tenantId: GLOBAL_TENANT_ID,
      partitionKey: GLOBAL_TENANT_ID,
      displayName: updates.displayName ?? existing.displayName,
      category: updates.category ?? existing.category,
      sentiment: updates.sentiment ?? existing.sentiment,
      sentimentScore: updates.sentimentScore ?? existing.sentimentScore,
      icon: updates.icon !== undefined ? updates.icon : existing.icon,
      color: updates.color !== undefined ? updates.color : existing.color,
      order: updates.order ?? existing.order,
      behavior,
      applicableToRecTypes: updates.applicableToRecTypes ?? existing.applicableToRecTypes,
      isActive: updates.isActive ?? existing.isActive,
      isDefault: updates.isDefault ?? existing.isDefault,
      translations: updates.translations ?? existing.translations,
      updatedAt: now,
      createdBy: existing.createdBy,
    };
    await container.item(id, GLOBAL_TENANT_ID).replace(doc);
    return doc as FeedbackType;
  }

  /**
   * Delete a feedback type (Super Admin). Removes id from global config defaultActiveTypes and availableTypes if present.
   */
  async deleteFeedbackType(id: string): Promise<boolean> {
    const existing = await this.getFeedbackTypeById(id);
    if (!existing) return false;
    const container = getContainer(this.configContainerName);
    await container.item(id, GLOBAL_TENANT_ID).delete();
    const globalConfig = await this.getGlobalFeedbackConfig();
    if (globalConfig) {
      const defaultActiveTypes = (globalConfig.defaultActiveTypes ?? []).filter((t) => t !== id);
      const availableTypes = (globalConfig.availableTypes ?? []).filter((t) => t !== id);
      if (
        defaultActiveTypes.length !== (globalConfig.defaultActiveTypes ?? []).length ||
        availableTypes.length !== (globalConfig.availableTypes ?? []).length
      ) {
        await this.updateGlobalFeedbackConfig(
          { defaultActiveTypes, availableTypes },
          'system'
        );
      }
    }
    return true;
  }

  /**
   * Get global feedback config.
   */
  async getGlobalFeedbackConfig(): Promise<GlobalFeedbackConfig | null> {
    const container = getContainer(this.configContainerName);
    const { resource } = await container.item('global_feedback_config', GLOBAL_TENANT_ID).read();
    return resource as GlobalFeedbackConfig | null;
  }

  /**
   * Update global feedback config (Super Admin).
   */
  async updateGlobalFeedbackConfig(updates: Partial<GlobalFeedbackConfig>, updatedBy: string): Promise<GlobalFeedbackConfig> {
    const container = getContainer(this.configContainerName);
    const existing = await this.getGlobalFeedbackConfig();
    const now = new Date().toISOString();
    const doc = {
      id: 'global_feedback_config',
      tenantId: GLOBAL_TENANT_ID,
      partitionKey: GLOBAL_TENANT_ID,
      defaultLimit: updates.defaultLimit ?? existing?.defaultLimit ?? 5,
      minLimit: updates.minLimit ?? existing?.minLimit ?? 3,
      maxLimit: updates.maxLimit ?? existing?.maxLimit ?? 10,
      availableTypes: updates.availableTypes ?? existing?.availableTypes ?? [],
      defaultActiveTypes: updates.defaultActiveTypes ?? existing?.defaultActiveTypes ?? [],
      patternDetection: updates.patternDetection ?? existing?.patternDetection ?? {
        enabled: true,
        minSampleSize: 50,
        thresholds: { ignoreRate: 0.6, actionRate: 0.4 },
      },
      updatedAt: now,
      updatedBy,
    };
    await container.items.upsert(doc);
    return doc as GlobalFeedbackConfig;
  }

  /**
   * Get tenant feedback config. Returns default from global if not set.
   */
  async getTenantFeedbackConfig(tenantId: string): Promise<TenantFeedbackConfig> {
    const container = getContainer(this.configContainerName);
    const globalConfig = await this.getGlobalFeedbackConfig();
    const id = `tenant_feedback_config_${tenantId}`;
    const { resource } = await container.item(id, tenantId).read();
    if (resource) {
      return resource as TenantFeedbackConfig;
    }
    return {
      id,
      partitionKey: tenantId,
      tenantId,
      activeLimit: globalConfig?.defaultLimit ?? 5,
      activeTypes: (globalConfig?.defaultActiveTypes ?? []).map((feedbackTypeId, i) => ({
        feedbackTypeId,
        order: i,
      })),
      perTypeConfig: {},
      requireFeedback: false,
      allowComments: true,
      commentRequired: false,
      allowMultipleSelection: false,
      patternDetection: {
        enabled: globalConfig?.patternDetection?.enabled ?? true,
        autoSuppressEnabled: true,
        autoBoostEnabled: true,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };
  }

  /**
   * Update tenant feedback config.
   */
  async updateTenantFeedbackConfig(
    tenantId: string,
    updates: Partial<Omit<TenantFeedbackConfig, 'id' | 'partitionKey' | 'tenantId'>>,
    updatedBy: string
  ): Promise<TenantFeedbackConfig> {
    const container = getContainer(this.configContainerName);
    const existing = await this.getTenantFeedbackConfig(tenantId);
    const now = new Date().toISOString();
    const doc: TenantFeedbackConfig = {
      id: existing.id,
      partitionKey: tenantId,
      tenantId,
      activeLimit: updates.activeLimit ?? existing.activeLimit,
      activeTypes: updates.activeTypes ?? existing.activeTypes,
      perTypeConfig: updates.perTypeConfig ?? existing.perTypeConfig,
      requireFeedback: updates.requireFeedback ?? existing.requireFeedback,
      allowComments: updates.allowComments ?? existing.allowComments,
      commentRequired: updates.commentRequired ?? existing.commentRequired,
      allowMultipleSelection: updates.allowMultipleSelection ?? existing.allowMultipleSelection,
      patternDetection: updates.patternDetection ?? existing.patternDetection,
      updatedAt: now,
      updatedBy,
    };
    await container.items.upsert(doc);
    return doc;
  }

  /**
   * Store a feedback record and return it.
   */
  async recordFeedbackRecord(record: Omit<RecommendationFeedbackRecord, 'id' | 'createdAt' | 'updatedAt' | 'recordedAt'>): Promise<RecommendationFeedbackRecord> {
    const container = getContainer(this.feedbackContainerName);
    const id = `feedback_${record.recommendationId}_${record.userId}_${Date.now()}`;
    const now = new Date().toISOString();
    const doc: RecommendationFeedbackRecord = {
      ...record,
      id,
      partitionKey: record.tenantId,
      createdAt: now,
      updatedAt: now,
      recordedAt: now,
      version: record.version ?? 1,
    };
    await container.items.create(doc, { partitionKey: record.tenantId } as Parameters<typeof container.items.create>[1]);
    return doc;
  }

  /**
   * Get aggregation for tenant (and optional recType, period).
   */
  async getAggregation(
    tenantId: string,
    options?: { recType?: string; period?: FeedbackAggregationPeriod; startDate?: string; endDate?: string }
  ): Promise<FeedbackAggregation | null> {
    const container = getContainer(this.aggregationContainerName);
    const period = options?.period ?? 'monthly';
    const aggregationKey = options?.recType ? `${tenantId}_${options.recType}` : tenantId;
    const id = `feedback_agg_tenant_${period}_${aggregationKey}_${options?.startDate ?? 'all'}`;
    const { resource } = await container.item(id, tenantId).read();
    return resource as FeedbackAggregation | null;
  }

  /**
   * Compute and upsert a simple aggregation for tenant (weighted + temporal placeholder).
   */
  async computeAndUpsertAggregation(
    tenantId: string,
    period: FeedbackAggregationPeriod,
    windowStart: string,
    windowEnd: string
  ): Promise<FeedbackAggregation> {
    const feedbackContainer = getContainer(this.feedbackContainerName);
    const aggregationContainer = getContainer(this.aggregationContainerName);
    const { resources } = await feedbackContainer.items
      .query({
        query:
          'SELECT * FROM c WHERE c.tenantId = @tid AND c.recordedAt >= @start AND c.recordedAt <= @end',
        parameters: [
          { name: '@tid', value: tenantId },
          { name: '@start', value: windowStart },
          { name: '@end', value: windowEnd },
        ],
      })
      .fetchAll();
    const total = resources.length;
    const feedbackByType: Record<string, { count: number; percentage: number }> = {};
    let positive = 0,
      neutral = 0,
      negative = 0,
      sentimentSum = 0;
    for (const r of resources as RecommendationFeedbackRecord[]) {
      const typeId = r.feedbackTypeId || r.action || 'unknown';
      feedbackByType[typeId] = feedbackByType[typeId] || { count: 0, percentage: 0 };
      feedbackByType[typeId].count += 1;
      const sent = r.feedback?.sentiment;
      if (sent === 'positive') positive++;
      else if (sent === 'negative') negative++;
      else neutral++;
      sentimentSum += r.feedback?.sentimentScore ?? 0;
    }
    for (const k of Object.keys(feedbackByType)) {
      feedbackByType[k].percentage = total > 0 ? (feedbackByType[k].count / total) * 100 : 0;
    }
    const id = `feedback_agg_tenant_${period}_${tenantId}_${windowStart}`;
    const doc: FeedbackAggregation & { tenantId: string } = {
      id,
      partitionKey: tenantId,
      tenantId,
      aggregationType: 'tenant',
      aggregationKey: tenantId,
      period,
      startDate: windowStart,
      endDate: windowEnd,
      recommendations: {
        total,
        shown: total,
        receivedFeedback: total,
        feedbackRate: 100,
      },
      feedbackByType,
      feedbackBySentiment: {
        positive,
        neutral,
        negative,
        avgSentimentScore: total > 0 ? sentimentSum / total : 0,
      },
      actionMetrics: {
        actionIntended: positive + neutral,
        actionTaken: 0,
        actionCompleted: 0,
        actionRate: 0,
      },
      updatedAt: new Date().toISOString(),
    };
    await aggregationContainer.items.upsert(doc);
    return doc as FeedbackAggregation;
  }
}
