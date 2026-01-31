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
  FeedbackCollectionSettings,
  TenantFeedbackConfig,
  RecommendationFeedbackRecord,
  FeedbackAggregation,
  FeedbackAggregationPeriod,
  CreateFeedbackTypeInput,
  UpdateFeedbackTypeInput,
  BulkFeedbackTypesInput,
  BulkFeedbackTypesResult,
  ImportFeedbackTypesInput,
  ImportFeedbackTypesResult,
  FeedbackSentiment,
  PatternDetectionTestResult,
} from '../types/feedback.types';
import { FEEDBACK_TYPES_SEED, toFeedbackTypeDoc, GLOBAL_FEEDBACK_CONFIG_SEED } from '../constants/feedback-types-seed';
import { publishRecommendationEvent } from '../events/publishers/RecommendationEventPublisher';

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
   * Get usage stats (count and lastUsed) per feedback type from recommendation_feedback.
   * Cross-partition query; capped at maxRows for performance. Super Admin §1.1.1.
   */
  async getFeedbackTypeUsageStats(
    typeIds: string[],
    maxRows: number = 50_000
  ): Promise<Map<string, { usageCount: number; lastUsed: string }>> {
    const stats = new Map<string, { usageCount: number; lastUsed: string }>();
    if (typeIds.length === 0) return stats;
    const container = getContainer(this.feedbackContainerName);
    const querySpec = 'SELECT c.feedbackTypeId, c.createdAt FROM c WHERE c.feedbackTypeId != null';
    const feedOptions = {
      enableCrossPartitionQuery: true,
      maxItemCount: 1000,
    } as Parameters<typeof container.items.query>[1];
    let totalProcessed = 0;
    const iterator = container.items
      .query<{ feedbackTypeId: string; createdAt?: string }>(querySpec, feedOptions)
      .getAsyncIterator();
    for await (const { resources: page } of iterator) {
      for (const r of page) {
        const id = r.feedbackTypeId;
        if (!id || !typeIds.includes(id)) continue;
        const cur = stats.get(id) ?? { usageCount: 0, lastUsed: '' };
        cur.usageCount += 1;
        if (r.createdAt && (!cur.lastUsed || r.createdAt > cur.lastUsed)) cur.lastUsed = r.createdAt;
        stats.set(id, cur);
      }
      totalProcessed += page.length;
      if (totalProcessed >= maxRows) break;
    }
    return stats;
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

  /** Default sentiment score when not provided in bulk setSentiment. */
  private static defaultSentimentScore(sentiment: FeedbackSentiment): number {
    switch (sentiment) {
      case 'positive': return 1;
      case 'negative': return -1;
      default: return 0;
    }
  }

  /**
   * Bulk update feedback types. Super Admin §1.1.5.
   */
  async bulkUpdateFeedbackTypes(
    input: BulkFeedbackTypesInput,
    updatedBy: string
  ): Promise<BulkFeedbackTypesResult> {
    const failed: { id: string; error: string }[] = [];
    let updated = 0;
    let updates: UpdateFeedbackTypeInput;
    switch (input.operation) {
      case 'activate':
        updates = { isActive: true };
        break;
      case 'deactivate':
        updates = { isActive: false };
        break;
      case 'setCategory':
        if (input.category == null) {
          const err = new Error('category is required for setCategory');
          (err as Error & { statusCode?: number }).statusCode = 400;
          throw err;
        }
        updates = { category: input.category };
        break;
      case 'setSentiment':
        if (input.sentiment == null) {
          const err = new Error('sentiment is required for setSentiment');
          (err as Error & { statusCode?: number }).statusCode = 400;
          throw err;
        }
        updates = {
          sentiment: input.sentiment,
          sentimentScore: input.sentimentScore ?? FeedbackService.defaultSentimentScore(input.sentiment),
        };
        break;
      default:
        const bad = new Error(`Unknown operation: ${(input as { operation: string }).operation}`);
        (bad as Error & { statusCode?: number }).statusCode = 400;
        throw bad;
    }
    for (const id of input.ids) {
      if (!id || !id.startsWith('feedback_type_')) continue;
      try {
        const result = await this.updateFeedbackType(id, updates, updatedBy);
        if (result) updated += 1;
      } catch (e) {
        failed.push({ id, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { updated, failed };
  }

  /**
   * Import feedback types from JSON (create or update by name). Super Admin §1.1.5.
   */
  async importFeedbackTypes(
    input: ImportFeedbackTypesInput,
    createdBy: string
  ): Promise<ImportFeedbackTypesResult> {
    const failed: { index: number; error: string }[] = [];
    let created = 0;
    let updated = 0;
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const id = item.id ?? `feedback_type_${item.name}`;
      try {
        const existing = await this.getFeedbackTypeById(id);
        if (existing) {
          await this.updateFeedbackType(id, {
            displayName: item.displayName,
            category: item.category,
            sentiment: item.sentiment,
            sentimentScore: item.sentimentScore,
            icon: item.icon,
            color: item.color,
            order: item.order,
            behavior: item.behavior,
            applicableToRecTypes: item.applicableToRecTypes ?? [],
            isActive: item.isActive,
            isDefault: item.isDefault,
            translations: item.translations,
          }, createdBy);
          updated += 1;
        } else {
          await this.createFeedbackType(
            {
              name: item.name,
              displayName: item.displayName,
              category: item.category,
              sentiment: item.sentiment,
              sentimentScore: item.sentimentScore,
              icon: item.icon,
              color: item.color,
              order: item.order,
              behavior: item.behavior,
              applicableToRecTypes: item.applicableToRecTypes ?? [],
              isActive: item.isActive,
              isDefault: item.isDefault,
              translations: item.translations,
            },
            createdBy
          );
          created += 1;
        }
      } catch (e) {
        failed.push({ index: i, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { created, updated, failed };
  }

  /**
   * Update a feedback type's behavior and return affected tenant IDs. Super Admin §1.1.3 "Bulk update behavior for all tenants".
   * Behavior is stored on the type; all tenants using this type see the new behavior on next load.
   */
  async updateFeedbackTypeBehaviorAndGetAffectedTenants(
    id: string,
    behavior: Partial<FeedbackType['behavior']>,
    updatedBy: string
  ): Promise<{ type: FeedbackType; affectedTenantIds: string[] }> {
    const existing = await this.getFeedbackTypeById(id);
    if (!existing) {
      const err = new Error('Feedback type not found');
      (err as Error & { statusCode?: number }).statusCode = 404;
      throw err;
    }
    const mergedBehavior = { ...existing.behavior, ...behavior };
    const updated = await this.updateFeedbackType(id, { behavior: mergedBehavior }, updatedBy);
    if (!updated) {
      const err = new Error('Failed to update feedback type');
      (err as Error & { statusCode?: number }).statusCode = 500;
      throw err;
    }
    const affectedTenantIds = await this.getTenantIdsUsingFeedbackType(id);
    return { type: updated, affectedTenantIds };
  }

  /**
   * Get tenant IDs that have this feedback type in their activeTypes. Super Admin §1.1.3 "View tenants using this type".
   */
  async getTenantIdsUsingFeedbackType(feedbackTypeId: string): Promise<string[]> {
    const existing = await this.getFeedbackTypeById(feedbackTypeId);
    if (!existing) return [];
    const configContainer = getContainer(this.configContainerName);
    const { resources } = await configContainer.items
      .query<{ tenantId: string }>(
        {
          query:
            'SELECT c.tenantId FROM c WHERE c.tenantId != @global AND EXISTS(SELECT VALUE 1 FROM t IN c.activeTypes WHERE t.feedbackTypeId = @id)',
          parameters: [
            { name: '@global', value: GLOBAL_TENANT_ID },
            { name: '@id', value: feedbackTypeId },
          ],
        },
        { enableCrossPartitionQuery: true } as Parameters<typeof configContainer.items.query>[1]
      )
      .fetchNext();
    return (resources ?? []).map((r) => r.tenantId).filter(Boolean);
  }

  /**
   * Check if a feedback type is in use: has feedback records or is in any tenant's activeTypes. Super Admin §1.1.4.
   */
  async isFeedbackTypeInUse(id: string): Promise<{ usageCount: number; usedByTenants: boolean }> {
    const statsMap = await this.getFeedbackTypeUsageStats([id], 10_000);
    const stats = statsMap.get(id);
    const usageCount = stats?.usageCount ?? 0;
    const configContainer = getContainer(this.configContainerName);
    const { resources } = await configContainer.items
      .query<{ tenantId: string }>(
        {
          query:
            'SELECT * FROM c WHERE c.tenantId != @global AND EXISTS(SELECT VALUE 1 FROM t IN c.activeTypes WHERE t.feedbackTypeId = @id)',
          parameters: [
            { name: '@global', value: GLOBAL_TENANT_ID },
            { name: '@id', value: id },
          ],
        },
        { enableCrossPartitionQuery: true } as Parameters<typeof configContainer.items.query>[1]
      )
      .fetchNext();
    const usedByTenants = (resources?.length ?? 0) > 0;
    return { usageCount, usedByTenants };
  }

  /**
   * Delete a feedback type (Super Admin). Pre-deletion checks per §1.1.4; removes from global config if present.
   */
  async deleteFeedbackType(id: string): Promise<boolean> {
    const existing = await this.getFeedbackTypeById(id);
    if (!existing) return false;

    if (existing.isDefault) {
      const err = new Error('Cannot delete default feedback type');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }

    const { usageCount, usedByTenants } = await this.isFeedbackTypeInUse(id);
    if (usageCount > 0 || usedByTenants) {
      const err = new Error('Cannot delete: feedback type is in use by tenants or has feedback records');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }

    if (existing.isActive) {
      const err = new Error('Deactivate the feedback type before deleting');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }

    const inactiveMs = Date.now() - new Date(existing.updatedAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (inactiveMs < thirtyDaysMs) {
      const err = new Error('Feedback type must be inactive for at least 30 days before deletion');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }

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
   * Update global feedback config (Super Admin). Validates default limits per §1.2.1.
   */
  async updateGlobalFeedbackConfig(updates: Partial<GlobalFeedbackConfig>, updatedBy: string): Promise<GlobalFeedbackConfig> {
    const container = getContainer(this.configContainerName);
    const existing = await this.getGlobalFeedbackConfig();
    const minLimit = updates.minLimit ?? existing?.minLimit ?? 3;
    const maxLimit = updates.maxLimit ?? existing?.maxLimit ?? 10;
    const defaultLimit = updates.defaultLimit ?? existing?.defaultLimit ?? 5;
    if (minLimit > maxLimit) {
      const err = new Error('minLimit must be less than or equal to maxLimit');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }
    if (defaultLimit < minLimit || defaultLimit > maxLimit) {
      const err = new Error('defaultLimit must be between minLimit and maxLimit (inclusive)');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }
    const now = new Date().toISOString();
    const prevPattern = existing?.patternDetection;
    const nextPattern = updates.patternDetection;
    const thresholds = {
      ignoreRate: nextPattern?.thresholds?.ignoreRate ?? prevPattern?.thresholds?.ignoreRate ?? 0.6,
      actionRate: nextPattern?.thresholds?.actionRate ?? prevPattern?.thresholds?.actionRate ?? 0.4,
      sentimentThreshold: nextPattern?.thresholds?.sentimentThreshold ?? prevPattern?.thresholds?.sentimentThreshold ?? 0.3,
    };
    const patternDetection = {
      enabled: nextPattern?.enabled ?? prevPattern?.enabled ?? true,
      minSampleSize: nextPattern?.minSampleSize ?? prevPattern?.minSampleSize ?? 50,
      thresholds,
      autoSuppressEnabled: nextPattern?.autoSuppressEnabled ?? prevPattern?.autoSuppressEnabled ?? false,
      autoBoostEnabled: nextPattern?.autoBoostEnabled ?? prevPattern?.autoBoostEnabled ?? false,
      notifyOnPattern: nextPattern?.notifyOnPattern ?? prevPattern?.notifyOnPattern ?? false,
      patternReportFrequency: nextPattern?.patternReportFrequency ?? prevPattern?.patternReportFrequency ?? 'weekly',
    };
    const defaultFeedbackCollection: FeedbackCollectionSettings = {
      requireFeedback: false,
      requireFeedbackAfterDays: 7,
      allowComments: true,
      maxCommentLength: 500,
      moderateComments: false,
      allowMultipleSelection: false,
      maxSelectionsPerFeedback: 1,
      allowFeedbackEdit: false,
      editWindowDays: 1,
      trackFeedbackHistory: false,
      allowAnonymousFeedback: false,
      anonymousForNegative: false,
    };
    const prevFc = existing?.feedbackCollection;
    const nextFc = updates.feedbackCollection;
    const feedbackCollection: FeedbackCollectionSettings = {
      requireFeedback: nextFc?.requireFeedback ?? prevFc?.requireFeedback ?? defaultFeedbackCollection.requireFeedback,
      requireFeedbackAfterDays: nextFc?.requireFeedbackAfterDays ?? prevFc?.requireFeedbackAfterDays ?? defaultFeedbackCollection.requireFeedbackAfterDays,
      allowComments: nextFc?.allowComments ?? prevFc?.allowComments ?? defaultFeedbackCollection.allowComments,
      maxCommentLength: nextFc?.maxCommentLength ?? prevFc?.maxCommentLength ?? defaultFeedbackCollection.maxCommentLength,
      moderateComments: nextFc?.moderateComments ?? prevFc?.moderateComments ?? defaultFeedbackCollection.moderateComments,
      allowMultipleSelection: nextFc?.allowMultipleSelection ?? prevFc?.allowMultipleSelection ?? defaultFeedbackCollection.allowMultipleSelection,
      maxSelectionsPerFeedback: nextFc?.maxSelectionsPerFeedback ?? prevFc?.maxSelectionsPerFeedback ?? defaultFeedbackCollection.maxSelectionsPerFeedback,
      allowFeedbackEdit: nextFc?.allowFeedbackEdit ?? prevFc?.allowFeedbackEdit ?? defaultFeedbackCollection.allowFeedbackEdit,
      editWindowDays: nextFc?.editWindowDays ?? prevFc?.editWindowDays ?? defaultFeedbackCollection.editWindowDays,
      trackFeedbackHistory: nextFc?.trackFeedbackHistory ?? prevFc?.trackFeedbackHistory ?? defaultFeedbackCollection.trackFeedbackHistory,
      allowAnonymousFeedback: nextFc?.allowAnonymousFeedback ?? prevFc?.allowAnonymousFeedback ?? defaultFeedbackCollection.allowAnonymousFeedback,
      anonymousForNegative: nextFc?.anonymousForNegative ?? prevFc?.anonymousForNegative ?? defaultFeedbackCollection.anonymousForNegative,
    };
    const allowTenantOverride = updates.allowTenantOverride ?? existing?.allowTenantOverride ?? true;
    const doc = {
      id: 'global_feedback_config',
      tenantId: GLOBAL_TENANT_ID,
      partitionKey: GLOBAL_TENANT_ID,
      defaultLimit,
      minLimit,
      maxLimit,
      allowTenantOverride,
      availableTypes: updates.availableTypes ?? existing?.availableTypes ?? [],
      defaultActiveTypes: updates.defaultActiveTypes ?? existing?.defaultActiveTypes ?? [],
      patternDetection,
      feedbackCollection,
      updatedAt: now,
      updatedBy,
    };
    await container.items.upsert(doc);
    return doc as GlobalFeedbackConfig;
  }

  /**
   * §1.2.1 Apply current global feedback config to all existing tenant configs.
   * Discovers tenant IDs from config container (docs with id like tenant_feedback_config_*).
   * Returns applied tenant IDs and any failures.
   */
  async applyGlobalConfigToAllTenants(updatedBy: string): Promise<{ applied: string[]; failed: { tenantId: string; error: string }[] }> {
    const globalConfig = await this.getGlobalFeedbackConfig();
    if (!globalConfig) {
      return { applied: [], failed: [{ tenantId: '_global', error: 'Global feedback config not found' }] };
    }
    const container = getContainer(this.configContainerName);
    const { resources } = await container.items
      .query<{ partitionKey: string }>({
        query: "SELECT DISTINCT c.partitionKey FROM c WHERE STARTSWITH(c.id, 'tenant_feedback_config_')",
        parameters: [],
      })
      .fetchAll();
    const tenantIds = resources.map((r) => r.partitionKey).filter((id) => id && id !== GLOBAL_TENANT_ID);
    const applied: string[] = [];
    const failed: { tenantId: string; error: string }[] = [];
    const defaultActiveTypes = globalConfig.defaultActiveTypes ?? [];
    const fc = globalConfig.feedbackCollection;
    const pd = globalConfig.patternDetection;
    for (const tenantId of tenantIds) {
      try {
        await this.updateTenantFeedbackConfig(
          tenantId,
          {
            activeLimit: globalConfig.defaultLimit ?? 5,
            activeTypes: defaultActiveTypes.map((feedbackTypeId, i) => ({ feedbackTypeId, order: i })),
            requireFeedback: fc?.requireFeedback ?? false,
            allowComments: fc?.allowComments ?? true,
            commentRequired: false,
            allowMultipleSelection: fc?.allowMultipleSelection ?? false,
            patternDetection: {
              enabled: pd?.enabled ?? true,
              autoSuppressEnabled: pd?.autoSuppressEnabled ?? false,
              autoBoostEnabled: pd?.autoBoostEnabled ?? false,
            },
          },
          updatedBy
        );
        applied.push(tenantId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ tenantId, error: msg });
      }
    }
    return { applied, failed };
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
   * Get tenant-level feedback usage statistics. Super Admin §1.3.2.
   */
  async getTenantFeedbackStats(tenantId: string): Promise<{ totalFeedbackCount: number; lastFeedbackAt: string | null }> {
    const container = getContainer(this.feedbackContainerName);
    const countResult = await container.items
      .query<unknown>(
        { query: 'SELECT VALUE COUNT(1) FROM c' },
        { partitionKey: tenantId } as Parameters<typeof container.items.query>[1]
      )
      .fetchNext();
    const totalFeedbackCount = (countResult.resources?.[0] as number) ?? 0;
    const lastResult = await container.items
      .query<{ recordedAt: string }>(
        { query: 'SELECT TOP 1 c.recordedAt FROM c ORDER BY c.recordedAt DESC' },
        { partitionKey: tenantId } as Parameters<typeof container.items.query>[1]
      )
      .fetchNext();
    const lastFeedbackAt = (lastResult.resources?.[0]?.recordedAt as string) ?? null;
    return { totalFeedbackCount, lastFeedbackAt };
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
    await publishRecommendationEvent('feedback.aggregation.updated', tenantId, {
      aggregationKey: tenantId,
      period,
      startDate: windowStart,
      endDate: windowEnd,
      aggregationId: id,
    });
    return doc as FeedbackAggregation;
  }

  /**
   * §1.2.2 Run pattern detection against historical feedback using current global thresholds.
   * Groups by recommendationId (and tenantId), computes ignore rate, action rate, avg sentiment;
   * applies minSampleSize and thresholds; returns counts and sample recs (suppressed / flagged).
   */
  async runPatternDetectionTest(options?: {
    tenantId?: string;
    maxFeedbackRows?: number;
    windowDays?: number;
  }): Promise<PatternDetectionTestResult> {
    const globalConfig = await this.getGlobalFeedbackConfig();
    const pd = globalConfig?.patternDetection;
    const minSampleSize = pd?.minSampleSize ?? 50;
    const ignoreRateThreshold = pd?.thresholds?.ignoreRate ?? 0.6;
    const actionRateThreshold = pd?.thresholds?.actionRate ?? 0.4;
    const sentimentThreshold = pd?.thresholds?.sentimentThreshold ?? 0.3;

    const maxRows = Math.min(options?.maxFeedbackRows ?? 10_000, 50_000);
    const windowDays = options?.windowDays ?? 90;
    const end = new Date();
    const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const windowStart = start.toISOString();
    const windowEnd = end.toISOString();

    const feedbackContainer = getContainer(this.feedbackContainerName);
    const query =
      options?.tenantId
        ? 'SELECT * FROM c WHERE c.tenantId = @tid AND c.recordedAt >= @start AND c.recordedAt <= @end'
        : 'SELECT * FROM c WHERE c.recordedAt >= @start AND c.recordedAt <= @end';
    const parameters: { name: string; value: string }[] = [
      { name: '@start', value: windowStart },
      { name: '@end', value: windowEnd },
    ];
    if (options?.tenantId) parameters.push({ name: '@tid', value: options.tenantId });

    const feedOptions = {
      enableCrossPartitionQuery: !options?.tenantId,
      maxItemCount: 500,
    } as Parameters<typeof feedbackContainer.items.query>[1];

    const rows: RecommendationFeedbackRecord[] = [];
    const iterator = feedbackContainer.items
      .query<RecommendationFeedbackRecord>({ query, parameters }, feedOptions)
      .getAsyncIterator();
    for await (const { resources: page } of iterator) {
      rows.push(...page);
      if (rows.length >= maxRows) break;
    }
    const totalFeedbackRows = rows.length;

    type RecKey = string;
    const key = (tid: string, recId: string): RecKey => `${tid}|${recId}`;
    const stats = new Map<
      RecKey,
      { tenantId: string; recommendationId: string; total: number; ignoreCount: number; acceptCount: number; sentimentSum: number }
    >();
    for (const r of rows) {
      const k = key(r.tenantId, r.recommendationId);
      let s = stats.get(k);
      if (!s) {
        s = { tenantId: r.tenantId, recommendationId: r.recommendationId, total: 0, ignoreCount: 0, acceptCount: 0, sentimentSum: 0 };
        stats.set(k, s);
      }
      s.total += 1;
      const act = (r.action ?? '').toLowerCase();
      if (act === 'ignore') s.ignoreCount += 1;
      else if (act === 'accept') s.acceptCount += 1;
      s.sentimentSum += r.feedback?.sentimentScore ?? 0;
    }

    const aboveMin = Array.from(stats.values()).filter((s) => s.total >= minSampleSize);
    const recommendationCount = aboveMin.length;

    const suppressed: PatternDetectionTestResult['sampleSuppressed'] = [];
    const flagged: PatternDetectionTestResult['sampleFlagged'] = [];
    for (const s of aboveMin) {
      const ignoreRate = s.total > 0 ? s.ignoreCount / s.total : 0;
      const actionRate = s.total > 0 ? s.acceptCount / s.total : 0;
      const avgSentiment = s.total > 0 ? s.sentimentSum / s.total : 0;
      const wouldSuppress = ignoreRate > ignoreRateThreshold;
      const wouldFlag = actionRate < actionRateThreshold || avgSentiment < sentimentThreshold;
      const item = { recommendationId: s.recommendationId, tenantId: s.tenantId, feedbackCount: s.total, ignoreRate, actionRate, avgSentiment };
      if (wouldSuppress) suppressed.push(item);
      if (wouldFlag && !wouldSuppress) flagged.push(item);
    }
    const suppressedCount = suppressed.length;
    const flaggedCount = flagged.length;

    return {
      totalFeedbackRows,
      recommendationCount,
      suppressedCount,
      flaggedCount,
      sampleSuppressed: suppressed.slice(0, 10),
      sampleFlagged: flagged.slice(0, 10),
      appliedThresholds: { minSampleSize, ignoreRate: ignoreRateThreshold, actionRate: actionRateThreshold, sentimentThreshold },
    };
  }
}
