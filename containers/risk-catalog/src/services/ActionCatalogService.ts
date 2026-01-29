/**
 * Action Catalog Service
 * Unified catalog for risks and recommendations per RECOMMENDATION_FEEDBACK_COMPLETE_REQUIREMENTS
 * Uses shard-manager with shard type action_catalog (new shard type, not risk_catalog).
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  ActionCatalogEntry,
  ActionCatalogCategory,
  ActionCatalogRelationship,
  CreateActionCatalogEntryInput,
  UpdateActionCatalogEntryInput,
  GetApplicableCatalogEntriesInput,
  OpportunityContext,
  CatalogUsage,
  CreateActionCatalogCategoryInput,
  UpdateActionCatalogCategoryInput,
  CreateActionCatalogRelationshipInput,
} from '../types/action-catalog.types';

const ACTION_CATALOG_SHARD_TYPE_NAME = 'action_catalog';
const ACTION_CATALOG_CATEGORY_SHARD_TYPE_NAME = 'action_catalog_category';
const SYSTEM_TENANT_ID = 'system';

interface ShardType {
  id: string;
  name: string;
  displayName: string;
  description: string;
  schema: unknown;
}

interface Shard {
  id: string;
  tenantId: string;
  shardTypeId: string;
  shardTypeName?: string;
  structuredData: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ShardListResponse {
  items: Shard[];
  total?: number;
  continuationToken?: string;
}

function shardToEntry(shard: Shard): ActionCatalogEntry {
  const d = shard.structuredData as Record<string, unknown>;
  const entryId = (d.entryId as string) || shard.id;
  return {
    id: entryId,
    partitionKey: shard.tenantId,
    tenantId: shard.tenantId,
    type: (d.type as ActionCatalogEntry['type']) ?? 'risk',
    category: (d.category as string) ?? '',
    subcategory: d.subcategory as string | undefined,
    name: (d.name as string) ?? '',
    displayName: (d.displayName as string) ?? '',
    description: (d.description as string) ?? '',
    applicableIndustries: (d.applicableIndustries as string[]) ?? [],
    applicableStages: (d.applicableStages as string[]) ?? [],
    applicableMethodologies: (d.applicableMethodologies as string[]) ?? [],
    riskDetails: d.riskDetails as ActionCatalogEntry['riskDetails'],
    recommendationDetails: d.recommendationDetails as ActionCatalogEntry['recommendationDetails'],
    decisionRules: d.decisionRules as ActionCatalogEntry['decisionRules'],
    usage: (d.usage as CatalogUsage) ?? { timesGenerated: 0, avgFeedbackSentiment: 0, avgActionRate: 0 },
    status: (d.status as ActionCatalogEntry['status']) ?? 'active',
    version: (d.version as number) ?? 1,
    createdAt: typeof shard.createdAt === 'string' ? shard.createdAt : (shard.createdAt as Date).toISOString(),
    updatedAt: typeof shard.updatedAt === 'string' ? shard.updatedAt : (shard.updatedAt as Date).toISOString(),
    createdBy: (d.createdBy as string) ?? 'system',
  };
}

function shardToCategory(shard: Shard): ActionCatalogCategory {
  const d = shard.structuredData as Record<string, unknown>;
  return {
    id: (d.categoryId as string) ?? shard.id,
    displayName: (d.displayName as string) ?? '',
    type: (d.type as ActionCatalogCategory['type']) ?? 'both',
    icon: (d.icon as string) ?? '',
    color: (d.color as string) ?? '#6b7280',
    description: (d.description as string) ?? '',
    order: (d.order as number) ?? 0,
  };
}

export class ActionCatalogService {
  private shardManagerClient: ServiceClient;
  private config: ReturnType<typeof loadConfig>;
  private app: FastifyInstance | null = null;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.config = loadConfig();
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager.url,
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true, threshold: 5, timeout: 30000 },
    });
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) throw new Error('Fastify app not initialized');
    return generateServiceToken(this.app, {
      serviceId: 'risk-catalog',
      serviceName: 'risk-catalog',
      tenantId,
    });
  }

  private async ensureShardType(): Promise<void> {
    try {
      const token = this.getServiceToken(SYSTEM_TENANT_ID);
      const shardTypes = await this.shardManagerClient.get<ShardType[]>(
        '/api/v1/shard-types?limit=1000',
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': SYSTEM_TENANT_ID } }
      );
      if (Array.isArray(shardTypes) && shardTypes.some((st) => st.name === ACTION_CATALOG_SHARD_TYPE_NAME)) {
        return;
      }
      await this.shardManagerClient.post(
        '/api/v1/shard-types',
        {
          name: ACTION_CATALOG_SHARD_TYPE_NAME,
          displayName: 'Action Catalog',
          description: 'Unified catalog for risks and recommendations',
          category: 'catalog',
          schema: {
            type: 'object',
            properties: {
              entryId: { type: 'string' },
              type: { type: 'string', enum: ['risk', 'recommendation'] },
              category: { type: 'string' },
              name: { type: 'string' },
              displayName: { type: 'string' },
              description: { type: 'string' },
              applicableIndustries: { type: 'array', items: { type: 'string' } },
              applicableStages: { type: 'array', items: { type: 'string' } },
              applicableMethodologies: { type: 'array', items: { type: 'string' } },
              riskDetails: { type: 'object' },
              recommendationDetails: { type: 'object' },
              decisionRules: { type: 'object' },
              usage: { type: 'object' },
              status: { type: 'string' },
              version: { type: 'number' },
              createdBy: { type: 'string' },
            },
          },
          schemaFormat: 'rich',
          isCustom: false,
          isGlobal: true,
        },
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': SYSTEM_TENANT_ID } }
      );
      log.info('Action catalog shard type created', { name: ACTION_CATALOG_SHARD_TYPE_NAME, service: 'risk-catalog' });
    } catch (error: unknown) {
      log.error('Failed to ensure action catalog shard type', error as Error, { service: 'risk-catalog' });
    }
  }

  private async getShardTypeId(tenantId: string): Promise<string | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const shardTypes = await this.shardManagerClient.get<ShardType[]>(
        '/api/v1/shard-types?limit=1000',
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
      );
      const st = Array.isArray(shardTypes) ? shardTypes.find((s) => s.name === ACTION_CATALOG_SHARD_TYPE_NAME) : null;
      return st?.id ?? null;
    } catch {
      return null;
    }
  }

  private async ensureCategoryShardType(): Promise<void> {
    try {
      const token = this.getServiceToken(SYSTEM_TENANT_ID);
      const shardTypes = await this.shardManagerClient.get<ShardType[]>(
        '/api/v1/shard-types?limit=1000',
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': SYSTEM_TENANT_ID } }
      );
      if (Array.isArray(shardTypes) && shardTypes.some((st) => st.name === ACTION_CATALOG_CATEGORY_SHARD_TYPE_NAME)) {
        return;
      }
      await this.shardManagerClient.post(
        '/api/v1/shard-types',
        {
          name: ACTION_CATALOG_CATEGORY_SHARD_TYPE_NAME,
          displayName: 'Action Catalog Category',
          description: 'Categories for action catalog (risk/recommendation/both)',
          category: 'catalog',
          schema: {
            type: 'object',
            properties: {
              categoryId: { type: 'string' },
              displayName: { type: 'string' },
              type: { type: 'string', enum: ['risk', 'recommendation', 'both'] },
              icon: { type: 'string' },
              color: { type: 'string' },
              description: { type: 'string' },
              order: { type: 'number' },
            },
          },
          schemaFormat: 'rich',
          isCustom: false,
          isGlobal: true,
        },
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': SYSTEM_TENANT_ID } }
      );
      log.info('Action catalog category shard type created', { name: ACTION_CATALOG_CATEGORY_SHARD_TYPE_NAME, service: 'risk-catalog' });
    } catch (error: unknown) {
      log.error('Failed to ensure action catalog category shard type', error as Error, { service: 'risk-catalog' });
    }
  }

  private async getCategoryShardTypeId(tenantId: string): Promise<string | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const shardTypes = await this.shardManagerClient.get<ShardType[]>(
        '/api/v1/shard-types?limit=1000',
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
      );
      const st = Array.isArray(shardTypes) ? shardTypes.find((s) => s.name === ACTION_CATALOG_CATEGORY_SHARD_TYPE_NAME) : null;
      return st?.id ?? null;
    } catch {
      return null;
    }
  }

  /** List all action catalog shards for tenant (global = system) */
  private async listShards(tenantId: string, shardTypeId: string): Promise<Shard[]> {
    const token = this.getServiceToken(tenantId);
    const res = await this.shardManagerClient.get<ShardListResponse>(
      `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
      { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
    );
    return res?.items ?? [];
  }

  async getCatalogEntry(entryId: string, tenantId: string): Promise<ActionCatalogEntry | null> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);
    if (!shardTypeId) return null;
    const globalShards = await this.listShards(SYSTEM_TENANT_ID, shardTypeId);
    let found = globalShards.find((s) => (s.structuredData as Record<string, unknown>).entryId === entryId);
    if (!found && tenantId !== SYSTEM_TENANT_ID) {
      const tenantShards = await this.listShards(tenantId, shardTypeId);
      found = tenantShards.find((s) => (s.structuredData as Record<string, unknown>).entryId === entryId);
    }
    if (!found) return null;
    return shardToEntry(found);
  }

  async getApplicableCatalogEntries(
    _tenantId: string,
    input: GetApplicableCatalogEntriesInput
  ): Promise<ActionCatalogEntry[]> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);
    if (!shardTypeId) return [];
    const shards = await this.listShards(SYSTEM_TENANT_ID, shardTypeId);
    let entries = shards.map(shardToEntry).filter((e) => e.type === input.type && e.status === 'active');
    if (input.industry && input.industry.length > 0) {
      entries = entries.filter(
        (e) => e.applicableIndustries.length === 0 || e.applicableIndustries.includes(input.industry!)
      );
    }
    if (input.stage && input.stage.length > 0) {
      entries = entries.filter(
        (e) => e.applicableStages.length === 0 || e.applicableStages.includes(input.stage!)
      );
    }
    if (input.methodology && input.methodology.length > 0) {
      entries = entries.filter(
        (e) =>
          e.applicableMethodologies.length === 0 || e.applicableMethodologies.includes(input.methodology!)
      );
    }
    return entries;
  }

  async getRecommendationsForRisk(riskId: string, _tenantId: string): Promise<ActionCatalogEntry[]> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);
    if (!shardTypeId) return [];
    const shards = await this.listShards(SYSTEM_TENANT_ID, shardTypeId);
    return shards
      .map(shardToEntry)
      .filter(
        (e) =>
          e.type === 'recommendation' &&
          e.recommendationDetails?.mitigatesRisks?.includes(riskId)
      );
  }

  async getRisksMitigatedByRecommendation(recId: string, _tenantId: string): Promise<ActionCatalogEntry[]> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);
    if (!shardTypeId) return [];
    const shards = await this.listShards(SYSTEM_TENANT_ID, shardTypeId);
    return shards
      .map(shardToEntry)
      .filter(
        (e) =>
          e.type === 'risk' &&
          e.riskDetails?.mitigatingRecommendations?.includes(recId)
      );
  }

  /** Simple template render: replace {stage}, {industry} in strings */
  renderRecommendation(entry: ActionCatalogEntry, context: OpportunityContext): { title: string; description: string; actionItems: string[] } {
    if (!entry.recommendationDetails?.actionTemplate) {
      return { title: entry.displayName, description: entry.description, actionItems: [] };
    }
    const t = entry.recommendationDetails.actionTemplate;
    const replace = (s: string) =>
      s
        .replace(/\{stage\}/g, context.stage ?? '')
        .replace(/\{industry\}/g, context.industry ?? '')
        .replace(/\{opportunityId\}/g, context.opportunityId ?? '');
    return {
      title: replace(t.title),
      description: replace(t.description),
      actionItems: (t.actionItemsTemplate ?? []).map(replace),
    };
  }

  async updateCatalogUsageStats(
    _entryId: string,
    _feedback: { feedbackTypeId?: string; feedback?: { sentiment?: string }; action?: string }
  ): Promise<void> {
    // Placeholder: would PATCH shard to increment usage and update avgFeedbackSentiment/avgActionRate
    log.debug('updateCatalogUsageStats placeholder', { entryId: _entryId, service: 'risk-catalog' });
  }

  async createEntry(
    tenantId: string,
    userId: string,
    input: CreateActionCatalogEntryInput
  ): Promise<ActionCatalogEntry> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(tenantId);
    if (!shardTypeId) throw new Error('Action catalog shard type not found');
    const entryId = `action_catalog_${input.type}_${input.name}`;
    const token = this.getServiceToken(tenantId);
    const structuredData = {
      entryId,
      type: input.type,
      category: input.category,
      subcategory: input.subcategory,
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      applicableIndustries: input.applicableIndustries ?? [],
      applicableStages: input.applicableStages ?? [],
      applicableMethodologies: input.applicableMethodologies ?? [],
      riskDetails: input.riskDetails,
      recommendationDetails: input.recommendationDetails,
      decisionRules: input.decisionRules,
      usage: { timesGenerated: 0, avgFeedbackSentiment: 0, avgActionRate: 0 },
      status: input.status ?? 'active',
      version: 1,
      createdBy: userId,
    };
    const shard = await this.shardManagerClient.post<Shard>(
      '/api/v1/shards',
      { shardTypeId, structuredData },
      { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
    );
    return shardToEntry(shard);
  }

  async updateEntry(
    entryId: string,
    tenantId: string,
    userId: string,
    input: UpdateActionCatalogEntryInput
  ): Promise<ActionCatalogEntry | null> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(tenantId);
    if (!shardTypeId) return null;
    const shards = await this.listShards(tenantId, shardTypeId);
    const shard = shards.find((s) => (s.structuredData as Record<string, unknown>).entryId === entryId);
    if (!shard) return null;
    const d = shard.structuredData as Record<string, unknown>;
    const updated = {
      ...d,
      ...input,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    const token = this.getServiceToken(tenantId);
    const updatedShard = await this.shardManagerClient.put<Shard>(
      `/api/v1/shards/${shard.id}`,
      { structuredData: updated },
      { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
    );
    return shardToEntry(updatedShard);
  }

  async deleteEntry(entryId: string, tenantId: string): Promise<boolean> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(tenantId);
    if (!shardTypeId) return false;
    const shards = await this.listShards(tenantId, shardTypeId);
    const shard = shards.find((s) => (s.structuredData as Record<string, unknown>).entryId === entryId);
    if (!shard) return false;
    const token = this.getServiceToken(tenantId);
    await this.shardManagerClient.delete(`/api/v1/shards/${shard.id}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } },
    );
    return true;
  }

  async listEntries(tenantId: string, type?: 'risk' | 'recommendation'): Promise<ActionCatalogEntry[]> {
    await this.ensureShardType();
    const shardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);
    if (!shardTypeId) return [];
    const globalShards = await this.listShards(SYSTEM_TENANT_ID, shardTypeId);
    const tenantShards = tenantId !== SYSTEM_TENANT_ID ? await this.listShards(tenantId, shardTypeId) : [];
    const byEntryId = new Map<string, ActionCatalogEntry>();
    for (const s of globalShards) {
      const e = shardToEntry(s);
      byEntryId.set(e.id, e);
    }
    for (const s of tenantShards) {
      const e = shardToEntry(s);
      byEntryId.set(e.id, e);
    }
    let entries = Array.from(byEntryId.values());
    if (type) entries = entries.filter((e) => e.type === type);
    return entries;
  }

  /** List categories (global, system tenant) with entry counts and avg effectiveness (§2.2). */
  async listCategories(tenantId: string): Promise<ActionCatalogCategory[]> {
    await this.ensureCategoryShardType();
    const categoryShardTypeId = await this.getCategoryShardTypeId(SYSTEM_TENANT_ID);
    if (!categoryShardTypeId) return [];
    const categoryShards = await this.listShards(SYSTEM_TENANT_ID, categoryShardTypeId);
    const categories = categoryShards.map(shardToCategory).sort((a, b) => a.order - b.order);

    await this.ensureShardType();
    const entryShardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);
    if (!entryShardTypeId) return categories;
    const globalEntryShards = await this.listShards(SYSTEM_TENANT_ID, entryShardTypeId);
    const tenantEntryShards = tenantId !== SYSTEM_TENANT_ID ? await this.listShards(tenantId, entryShardTypeId) : [];
    const entries = [...globalEntryShards, ...tenantEntryShards].map(shardToEntry);

    const byCategoryId = new Map<string, { count: number; activeCount: number; effectivenessSum: number; effectivenessN: number }>();
    for (const cat of categories) {
      byCategoryId.set(cat.id, { count: 0, activeCount: 0, effectivenessSum: 0, effectivenessN: 0 });
    }
    for (const e of entries) {
      const catId = e.category || '_uncategorized';
      if (!byCategoryId.has(catId)) byCategoryId.set(catId, { count: 0, activeCount: 0, effectivenessSum: 0, effectivenessN: 0 });
      const stat = byCategoryId.get(catId)!;
      stat.count += 1;
      if (e.status === 'active') stat.activeCount += 1;
      const eff = e.usage?.avgImpact ?? e.usage?.avgActionRate ?? 0;
      stat.effectivenessSum += eff;
      stat.effectivenessN += 1;
    }

    return categories.map((c) => {
      const stat = byCategoryId.get(c.id) ?? { count: 0, activeCount: 0, effectivenessSum: 0, effectivenessN: 0 };
      return {
        ...c,
        entriesCount: stat.count,
        activeEntriesCount: stat.activeCount,
        avgEffectiveness: stat.effectivenessN > 0 ? stat.effectivenessSum / stat.effectivenessN : undefined,
      };
    });
  }

  async getCategory(categoryId: string, _tenantId: string): Promise<ActionCatalogCategory | null> {
    await this.ensureCategoryShardType();
    const categoryShardTypeId = await this.getCategoryShardTypeId(SYSTEM_TENANT_ID);
    if (!categoryShardTypeId) return null;
    const shards = await this.listShards(SYSTEM_TENANT_ID, categoryShardTypeId);
    const shard = shards.find((s) => (s.structuredData as Record<string, unknown>).categoryId === categoryId);
    return shard ? shardToCategory(shard) : null;
  }

  async createCategory(
    tenantId: string,
    _userId: string,
    input: CreateActionCatalogCategoryInput
  ): Promise<ActionCatalogCategory> {
    await this.ensureCategoryShardType();
    const categoryShardTypeId = await this.getCategoryShardTypeId(SYSTEM_TENANT_ID);
    if (!categoryShardTypeId) throw new Error('Action catalog category shard type not found');
    const categoryId = input.id ?? input.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const existing = await this.getCategory(categoryId, tenantId);
    if (existing) throw new Error(`Category already exists: ${categoryId}`);
    const token = this.getServiceToken(SYSTEM_TENANT_ID);
    const structuredData = {
      categoryId,
      displayName: input.displayName,
      type: input.type,
      icon: input.icon,
      color: input.color,
      description: input.description ?? '',
      order: input.order ?? 0,
    };
    const shard = await this.shardManagerClient.post<Shard>(
      '/api/v1/shards',
      { shardTypeId: categoryShardTypeId, structuredData },
      { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': SYSTEM_TENANT_ID } }
    );
    return shardToCategory(shard);
  }

  async updateCategory(
    categoryId: string,
    _tenantId: string,
    _userId: string,
    input: UpdateActionCatalogCategoryInput
  ): Promise<ActionCatalogCategory | null> {
    await this.ensureCategoryShardType();
    const categoryShardTypeId = await this.getCategoryShardTypeId(SYSTEM_TENANT_ID);
    if (!categoryShardTypeId) return null;
    const shards = await this.listShards(SYSTEM_TENANT_ID, categoryShardTypeId);
    const shard = shards.find((s) => (s.structuredData as Record<string, unknown>).categoryId === categoryId);
    if (!shard) return null;
    const d = shard.structuredData as Record<string, unknown>;
    const updated = {
      ...d,
      ...input,
    };
    const token = this.getServiceToken(SYSTEM_TENANT_ID);
    const updatedShard = await this.shardManagerClient.put<Shard>(
      `/api/v1/shards/${shard.id}`,
      { structuredData: updated },
      { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': SYSTEM_TENANT_ID } }
    );
    return shardToCategory(updatedShard);
  }

  async deleteCategory(categoryId: string, tenantId: string, userId: string, reassignTo?: string): Promise<boolean> {
    await this.ensureCategoryShardType();
    const categoryShardTypeId = await this.getCategoryShardTypeId(SYSTEM_TENANT_ID);
    if (!categoryShardTypeId) return false;
    const categoryShards = await this.listShards(SYSTEM_TENANT_ID, categoryShardTypeId);
    const categoryShard = categoryShards.find((s) => (s.structuredData as Record<string, unknown>).categoryId === categoryId);
    if (!categoryShard) return false;

    if (reassignTo) {
      await this.ensureShardType();
      const entryShardTypeId = await this.getShardTypeId(SYSTEM_TENANT_ID);
      if (entryShardTypeId) {
        const globalShards = await this.listShards(SYSTEM_TENANT_ID, entryShardTypeId);
        const tenantShards = tenantId !== SYSTEM_TENANT_ID ? await this.listShards(tenantId, entryShardTypeId) : [];
        for (const s of [...globalShards, ...tenantShards]) {
          const d = s.structuredData as Record<string, unknown>;
          if (d.category === categoryId) {
            const entryId = d.entryId as string;
            await this.updateEntry(entryId, s.tenantId, userId, { category: reassignTo });
          }
        }
      }
    }

    const token = this.getServiceToken(SYSTEM_TENANT_ID);
    await this.shardManagerClient.delete(`/api/v1/shards/${categoryShard.id}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': SYSTEM_TENANT_ID } },
    );
    return true;
  }

  /** List risk–recommendation relationships (§2.3). Derived from entries. */
  async listRelationships(tenantId: string): Promise<ActionCatalogRelationship[]> {
    const entries = await this.listEntries(tenantId);
    const pairs: ActionCatalogRelationship[] = [];
    for (const e of entries) {
      if (e.type === 'risk' && e.riskDetails?.mitigatingRecommendations?.length) {
        const riskId = e.id;
        for (const recId of e.riskDetails.mitigatingRecommendations) {
          pairs.push({ riskId, recommendationId: recId });
        }
      }
    }
    return pairs;
  }

  /** Create link: risk mitigates → recommendation. Updates both entries. */
  async createRelationship(
    tenantId: string,
    userId: string,
    input: CreateActionCatalogRelationshipInput
  ): Promise<ActionCatalogRelationship> {
    const { riskId, recommendationId } = input;
    const risk = await this.getCatalogEntry(riskId, tenantId);
    const rec = await this.getCatalogEntry(recommendationId, tenantId);
    if (!risk) throw new Error(`Risk not found: ${riskId}`);
    if (!rec) throw new Error(`Recommendation not found: ${recommendationId}`);
    if (risk.type !== 'risk') throw new Error(`Entry ${riskId} is not a risk`);
    if (rec.type !== 'recommendation') throw new Error(`Entry ${recommendationId} is not a recommendation`);

    const riskDetails = risk.riskDetails ?? {
      severity: 'medium',
      impactType: 'commercial',
      indicators: [],
      mitigatingRecommendations: [],
    };
    const recDetails = rec.recommendationDetails ?? {
      recommendationType: 'next_action',
      actionTemplate: { title: '', description: '', actionItemsTemplate: [], reasoningTemplate: '', expectedOutcomeTemplate: '' },
      mitigatesRisks: [],
      requiredData: [],
    };
    const mitigatingRecommendations = [...new Set([...riskDetails.mitigatingRecommendations, recommendationId])];
    const mitigatesRisks = [...new Set([...recDetails.mitigatesRisks, riskId])];

    const riskTenantId = risk.tenantId ?? risk.partitionKey ?? tenantId;
    const recTenantId = rec.tenantId ?? rec.partitionKey ?? tenantId;
    await this.updateEntry(riskId, riskTenantId, userId, {
      riskDetails: { ...riskDetails, mitigatingRecommendations },
    });
    await this.updateEntry(recommendationId, recTenantId, userId, {
      recommendationDetails: { ...recDetails, mitigatesRisks },
    });
    return { riskId, recommendationId };
  }

  /** Remove link between risk and recommendation. */
  async deleteRelationship(
    riskId: string,
    recommendationId: string,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    const risk = await this.getCatalogEntry(riskId, tenantId);
    const rec = await this.getCatalogEntry(recommendationId, tenantId);
    if (!risk || !rec) return false;
    if (risk.type !== 'risk' || rec.type !== 'recommendation') return false;

    const riskDetails = risk.riskDetails ?? {
      severity: 'medium',
      impactType: 'commercial',
      indicators: [],
      mitigatingRecommendations: [],
    };
    const recDetails = rec.recommendationDetails ?? {
      recommendationType: 'next_action',
      actionTemplate: { title: '', description: '', actionItemsTemplate: [], reasoningTemplate: '', expectedOutcomeTemplate: '' },
      mitigatesRisks: [],
      requiredData: [],
    };
    const mitigatingRecommendations = riskDetails.mitigatingRecommendations.filter((id) => id !== recommendationId);
    const mitigatesRisks = recDetails.mitigatesRisks.filter((id) => id !== riskId);

    const riskTenantId = risk.tenantId ?? risk.partitionKey ?? tenantId;
    const recTenantId = rec.tenantId ?? rec.partitionKey ?? tenantId;
    await this.updateEntry(riskId, riskTenantId, userId, {
      riskDetails: { ...riskDetails, mitigatingRecommendations },
    });
    await this.updateEntry(recommendationId, recTenantId, userId, {
      recommendationDetails: { ...recDetails, mitigatesRisks },
    });
    return true;
  }
}
