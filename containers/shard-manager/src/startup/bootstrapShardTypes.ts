/**
 * Bootstrap system and platform shard types.
 * System: c_competitor, c_opportunity_competitor, c_product, product_fit, c_recommendation.
 * Platform: opportunity, account, contact, lead, document, email, message, meeting, calendarevent, activity, interaction.
 * Idempotent: creates if missing, updates platform types if schema version changed.
 */

import type { ShardTypeService } from '../services/ShardTypeService';
import type { CreateShardTypeInput } from '../types/shard.types';
import { PLATFORM_SHARD_TYPE_DEFINITIONS } from './shardTypeDefinitions';

const SYSTEM_SHARD_TYPES: Omit<CreateShardTypeInput, 'tenantId' | 'createdBy'>[] = [
  {
    name: 'c_competitor',
    description: 'Tenant competitor master: name, segment, strengths, weaknesses, differentiation',
    isSystem: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        segment: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        differentiation: { type: 'string' },
        website: { type: 'string' },
        region: { type: 'string' },
        industry: { type: 'string' },
      },
    },
  },
  {
    name: 'c_opportunity_competitor',
    description: 'Link: competitor detected on opportunity (mentionCount, sentiment, winLikelihood)',
    isSystem: true,
    schema: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string' },
        competitorId: { type: 'string' },
        mentionCount: { type: 'number' },
        sentiment: { type: 'number' },
        winLikelihood: { type: 'number' },
        detectedAt: { type: 'string', format: 'date-time' },
        lastMentionDate: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
      },
    },
  },
  {
    name: 'c_product',
    description: 'Product catalog with goodFitIf/badFitIf rules',
    isSystem: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string' },
        goodFitIf: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              field: { type: 'string' },
              operator: { type: 'string' },
              value: {},
            },
          },
        },
        badFitIf: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              field: { type: 'string' },
              operator: { type: 'string' },
              value: {},
            },
          },
        },
      },
    },
  },
  {
    name: 'product_fit',
    description: 'Product-fit assessment per opportunity/product (score, dimensions)',
    isSystem: true,
    schema: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string' },
        productId: { type: 'string' },
        accountId: { type: 'string' },
        score: { type: 'number' },
        dimensions: { type: 'object' },
        source: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  },
  {
    name: 'c_recommendation',
    description: 'Recommendation entity (type, source, title, confidence, score, status)',
    isSystem: true,
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        opportunityId: { type: 'string' },
        userId: { type: 'string' },
        type: { type: 'string' },
        source: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        explanation: { type: 'string' },
        confidence: { type: 'number' },
        score: { type: 'number' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
        metadata: { type: 'object' },
      },
    },
  },
  {
    name: 'c_usage',
    description: 'Product/customer usage data (Snowflake or custom); level, features, trends, lastActive, adoptionScore',
    isSystem: true,
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        accountId: { type: 'string' },
        opportunityId: { type: 'string' },
        level: { type: 'string' },
        features: { type: 'object' },
        trends: { type: 'object' },
        lastActive: { type: 'string', format: 'date-time' },
        adoptionScore: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  },
  {
    name: 'c_search',
    description: 'Stored search (web, on-demand or recurring); query, searchType, resultCount',
    isSystem: true,
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        query: { type: 'string' },
        searchType: { type: 'string' },
        userId: { type: 'string' },
        opportunityId: { type: 'string' },
        accountId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        resultCount: { type: 'number' },
        scheduledSearchId: { type: 'string' },
        scope: { type: 'string' },
      },
    },
  },
];

export interface BootstrapShardTypesConfig {
  tenant_id: string;
  created_by: string;
}

const SCHEMA_VERSION_KEY = '$schemaVersion';

/**
 * Ensure all system and platform shard types exist for the bootstrap tenant. Idempotent.
 */
export async function bootstrapShardTypes(
  shardTypeService: ShardTypeService,
  config: BootstrapShardTypesConfig
): Promise<void> {
  const tenantId = config.tenant_id;
  const createdBy = config.created_by;

  for (const def of SYSTEM_SHARD_TYPES) {
    const existing = await shardTypeService.getByName(def.name, tenantId);
    if (existing) {
      continue;
    }
    await shardTypeService.create({
      ...def,
      tenantId,
      createdBy,
    });
    console.log(`Bootstrap: created shard type ${def.name} for tenant ${tenantId}`);
  }

  for (const def of PLATFORM_SHARD_TYPE_DEFINITIONS) {
    const schemaWithVersion = { ...def.schema, [SCHEMA_VERSION_KEY]: def.schemaVersion };
    const existing = await shardTypeService.getByName(def.name, tenantId);
    if (!existing) {
      await shardTypeService.create({
        tenantId,
        name: def.name,
        description: def.description,
        schema: schemaWithVersion as Record<string, unknown>,
        isSystem: false,
        createdBy,
      });
      console.log(`Bootstrap: created shard type ${def.name} for tenant ${tenantId}`);
      continue;
    }
    const existingVersion = (existing.schema as Record<string, unknown>)?.[SCHEMA_VERSION_KEY] as string | undefined;
    if (existingVersion !== def.schemaVersion) {
      await shardTypeService.update(existing.id, tenantId, {
        schema: schemaWithVersion as Record<string, unknown>,
      });
      console.log(`Bootstrap: updated shard type ${def.name} (${existingVersion} -> ${def.schemaVersion}) for tenant ${tenantId}`);
    }
  }
}
