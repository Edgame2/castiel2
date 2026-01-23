/**
 * Integration Shard Service
 * Handles creation of shards from integration data with multi-type support
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ShardRelationshipService,
} from '@castiel/api-core';
import { ConversionSchema, ConditionalRule } from '../types/conversion-schema.types.js';
import { ShardSource, SyncStatus, SyncDirection } from '../types/shard.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shard creation options
 */
export interface ShardCreationOptions {
  skipDuplicateCheck?: boolean;
  updateExisting?: boolean;
  createRelationships?: boolean;
  linkDerivedShards?: boolean;
}

/**
 * Shard creation result
 */
export interface ShardCreationResult {
  created: Array<{
    id: string;
    shardTypeId: string;
    name: string;
    externalId: string;
  }>;
  updated: Array<{
    id: string;
    shardTypeId: string;
    name: string;
    externalId: string;
  }>;
  failed: Array<{
    externalId: string;
    error: string;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

/**
 * External ID mapping for deduplication
 */
export interface ExternalIdMapping {
  integrationId: string;
  externalId: string;
  entityType: string;
}

/**
 * Integration Shard Service
 */
export class IntegrationShardService {
  private shardRepository: ShardRepository;
  private relationshipService: ShardRelationshipService;
  private monitoring: IMonitoringProvider;

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository,
    relationshipService: ShardRelationshipService
  ) {
    this.monitoring = monitoring;
    this.shardRepository = shardRepository;
    this.relationshipService = relationshipService;
  }

  /**
   * Create shards from integration data with relationship preservation
   */
  async createShardsFromIntegrationData(
    tenantId: string,
    integrationId: string,
    records: any[],
    schema: ConversionSchema,
    options: ShardCreationOptions = {}
  ): Promise<ShardCreationResult> {
    const startTime = Date.now();
    const result: ShardCreationResult = {
      created: [],
      updated: [],
      failed: [],
      relationships: [],
    };

    this.monitoring.trackEvent('integration.shard.create.started', {
      tenantId,
      integrationId,
      recordCount: records.length,
      schemaId: schema.id,
    });

    for (const record of records) {
      try {
        // Create primary shard
        const primaryShard = await this.createPrimaryShard(
          tenantId,
          integrationId,
          record,
          schema,
          options
        );

        if (primaryShard.created) {
          result.created.push({
            id: primaryShard.id,
            shardTypeId: primaryShard.shardTypeId,
            name: primaryShard.name,
            externalId: primaryShard.externalId,
          });
        } else {
          result.updated.push({
            id: primaryShard.id,
            shardTypeId: primaryShard.shardTypeId,
            name: primaryShard.name,
            externalId: primaryShard.externalId,
          });
        }

        // Create derived shards if configured
        if (schema.outputShardTypes?.derived && options.linkDerivedShards !== false) {
          const derivedShards = await this.createDerivedShards(
            tenantId,
            integrationId,
            record,
            primaryShard,
            schema,
            options
          );

          result.created.push(...derivedShards.created.map(d => ({
            id: d.id,
            shardTypeId: d.shardTypeId,
            name: d.name,
            externalId: d.externalId,
            // linkToPrimary and linkRelationshipType are not part of ShardCreationResult.created
          })));
          result.failed.push(...derivedShards.failed);

          // Link derived shards to primary
          for (const derived of derivedShards.created) {
            if (derived.linkToPrimary) {
              const link = await this.createShardLink(
                tenantId,
                primaryShard.id,
                derived.id,
                derived.linkRelationshipType || 'derived_from'
              );

              if (link) {
                result.relationships.push({
                  source: primaryShard.id,
                  target: derived.id,
                  type: derived.linkRelationshipType || 'derived_from',
                });
              }
            }
          }
        }

        // Preserve external relationships
        if (schema.preserveRelationships && schema.relationshipMappings) {
          const relationships = await this.extractRelationships(
            tenantId,
            integrationId,
            record,
            primaryShard.id,
            schema
          );
          result.relationships.push(...relationships);
        }

        // Store external ID mapping
        await this.storeExternalIdMapping(
          tenantId,
          integrationId,
          record.Id || record.id || record.externalId,
          primaryShard.id,
          schema.source.entity
        );
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'createShardsFromIntegrationData',
          tenantId,
          integrationId,
          recordId: record.Id || record.id,
        });

        result.failed.push({
          externalId: record.Id || record.id || 'unknown',
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    this.monitoring.trackMetric('integration.shard.create.duration', duration, {
      tenantId,
      integrationId,
      recordCount: records.length,
    });

    this.monitoring.trackEvent('integration.shard.create.completed', {
      tenantId,
      integrationId,
      created: result.created.length,
      updated: result.updated.length,
      failed: result.failed.length,
      relationships: result.relationships.length,
      duration,
    });

    return result;
  }

  /**
   * Create primary shard from record
   */
  private async createPrimaryShard(
    tenantId: string,
    integrationId: string,
    record: any,
    schema: ConversionSchema,
    options: ShardCreationOptions
  ): Promise<{
    id: string;
    shardTypeId: string;
    name: string;
    externalId: string;
    created: boolean;
  }> {
    const externalId = record.Id || record.id || record.externalId;

    // Check for existing shard
    let existingShardId: string | null = null;
    if (!options.skipDuplicateCheck) {
      existingShardId = await this.findShardByExternalId(
        tenantId,
        integrationId,
        externalId
      );
    }

    // Apply field mappings
    const structuredData = await this.applyFieldMappings(record, schema.fieldMappings);

    if (existingShardId && options.updateExisting !== false) {
      // Update existing shard
      const updated = await this.shardRepository.update(existingShardId, tenantId, {
        structuredData,
        external_relationships: [
          {
            id: uuidv4(),
            system: integrationId,
            systemType: schema.source.entity,
            externalId,
            syncStatus: SyncStatus.SYNCED,
            syncDirection: SyncDirection.INBOUND,
            lastSyncedAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      if (!updated) {
        throw new Error(`Failed to update shard: ${existingShardId}`);
      }

      return {
        id: updated.id,
        shardTypeId: updated.shardTypeId,
        name: (structuredData as any)?.name || externalId,
        externalId,
        created: false,
      };
    }

    // Create new shard
    const shard = await this.shardRepository.create({
      tenantId,
      shardTypeId: schema.target.shardTypeId,
      structuredData,
      external_relationships: [
        {
          id: uuidv4(),
          system: integrationId,
          systemType: schema.source.entity,
          externalId,
          syncStatus: SyncStatus.SYNCED,
          syncDirection: SyncDirection.INBOUND,
          lastSyncedAt: new Date(),
          createdAt: new Date(),
        },
      ],
      internal_relationships: [],
      source: ShardSource.INTEGRATION,
      sourceDetails: {
        integrationName: integrationId,
        originalId: externalId,
        syncedAt: new Date(),
      },
      createdBy: 'system-integration',
    });

    return {
      id: shard.id,
      shardTypeId: shard.shardTypeId,
      name: (shard.structuredData as any)?.name || externalId,
      externalId,
      created: true,
    };
  }

  /**
   * Create derived shards from same source data
   */
  private async createDerivedShards(
    tenantId: string,
    integrationId: string,
    record: any,
    primaryShard: any,
    schema: ConversionSchema,
    options: ShardCreationOptions
  ): Promise<{
    created: Array<{
      id: string;
      shardTypeId: string;
      name: string;
      externalId: string;
      linkToPrimary: boolean;
      linkRelationshipType?: string;
    }>;
    failed: Array<{
      externalId: string;
      error: string;
    }>;
  }> {
    const result: {
      created: Array<{
        id: string;
        shardTypeId: string;
        name: string;
        externalId: string;
        linkToPrimary: boolean;
        linkRelationshipType?: string;
      }>;
      failed: Array<{
        externalId: string;
        error: string;
      }>;
    } = {
      created: [],
      failed: [],
    };

    if (!schema.outputShardTypes?.derived) {
      return result;
    }

    for (const derivedConfig of schema.outputShardTypes.derived) {
      try {
        // Check condition if specified
        if (derivedConfig.condition) {
          const conditionMet = this.evaluateCondition(record, derivedConfig.condition);
          if (!conditionMet) {
            continue;
          }
        }

        // Apply derived shard field mappings
        const structuredData = await this.applyFieldMappings(
          record,
          derivedConfig.fieldMappings as any[]
        );

        const externalId = `${primaryShard.externalId}-derived-${derivedConfig.shardTypeId}`;

        // Create derived shard
        const derivedShard = await this.shardRepository.create({
          tenantId,
          shardTypeId: derivedConfig.shardTypeId,
          structuredData,
          external_relationships: [],
          internal_relationships: [],
          source: ShardSource.INTEGRATION,
          sourceDetails: {
            integrationName: integrationId,
            originalId: externalId,
            syncedAt: new Date(),
          },
          createdBy: 'system-integration',
        });

        result.created.push({
          id: derivedShard.id,
          shardTypeId: derivedShard.shardTypeId,
          name: (derivedShard.structuredData as any)?.name || externalId,
          externalId,
          linkToPrimary: true,
          linkRelationshipType: derivedConfig.linkRelationshipType,
        });
      } catch (error: any) {
        result.failed.push({
          externalId: `${primaryShard.externalId}-derived`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Create shard link
   */
  private async createShardLink(
    tenantId: string,
    sourceId: string,
    targetId: string,
    relationshipType: string
  ): Promise<boolean> {
    try {
      await this.relationshipService.createRelationship({
        tenantId,
        sourceShardId: sourceId,
        targetShardId: targetId,
        relationshipType,
        bidirectional: false,
        createdBy: 'system-integration',
        // These will be populated by the service
        sourceShardTypeId: '',
        sourceShardTypeName: '',
        targetShardTypeId: '',
        targetShardTypeName: '',
      } as any);
      return true;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'createShardLink',
        tenantId,
        sourceId,
        targetId,
      });
      return false;
    }
  }

  /**
   * Store external ID mapping
   */
  private async storeExternalIdMapping(
    tenantId: string,
    integrationId: string,
    externalId: string,
    shardId: string,
    entityType: string
  ): Promise<void> {
    // External ID is stored in the shard's external_relationships field
    // This is already handled in createPrimaryShard
  }

  /**
   * Find shard by external ID
   */
  async findShardByExternalId(
    tenantId: string,
    integrationId: string,
    externalId: string
  ): Promise<string | null> {
    try {
      const shards = await this.shardRepository.list({
        filter: {
          tenantId,
        },
        limit: 100,
      });
      
      // Filter by external_relationships manually
      const matchingShards = shards.shards.filter((shard: any) => {
        const externalRels = shard.external_relationships || [];
        return externalRels.some((rel: any) => 
          rel.system === integrationId && rel.externalId === externalId
        );
      });
      
      if (matchingShards.length === 0) {
        return null;
      }
      
      return matchingShards[0].id;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'findShardByExternalId',
        tenantId,
        integrationId,
        externalId,
      });
      return null;
    }
  }

  /**
   * Extract relationships from record
   */
  private async extractRelationships(
    tenantId: string,
    integrationId: string,
    record: any,
    shardId: string,
    schema: ConversionSchema
  ): Promise<Array<{ source: string; target: string; type: string }>> {
    const relationships: Array<{ source: string; target: string; type: string }> = [];

    if (!schema.relationshipMappings) {
      return relationships;
    }

    for (const mapping of schema.relationshipMappings) {
      try {
        const relatedExternalId = record[mapping.sourceField];
        if (!relatedExternalId) {
          continue;
        }

        // Find related shard
        const relatedShardId = await this.findShardByExternalId(
          tenantId,
          integrationId,
          relatedExternalId
        );

        if (relatedShardId) {
          await this.createShardLink(
            tenantId,
            shardId,
            relatedShardId,
            mapping.relationshipType
          );

          relationships.push({
            source: shardId,
            target: relatedShardId,
            type: mapping.relationshipType,
          });
        }
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'extractRelationships',
          tenantId,
          shardId,
        });
      }
    }

    return relationships;
  }

  /**
   * Apply field mappings to transform data
   */
  private async applyFieldMappings(
    sourceData: any,
    mappings: any[]
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      try {
        const value = this.applyFieldMapping(sourceData, mapping);
        if (value !== undefined) {
          result[mapping.targetField] = value;
        }
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'applyFieldMapping',
          targetField: mapping.targetField,
        });
      }
    }

    return result;
  }

  /**
   * Apply single field mapping
   */
  private applyFieldMapping(sourceData: any, mapping: any): any {
    switch (mapping.mappingType || mapping.config?.type) {
      case 'direct':
        return sourceData[mapping.config.sourceField];
      case 'default':
        return mapping.config.value;
      case 'composite':
        return this.applyCompositeMapping(sourceData, mapping.config);
      case 'transform':
        return this.applyTransformMapping(sourceData, mapping.config);
      default:
        return sourceData[mapping.config?.sourceField || mapping.targetField];
    }
  }

  /**
   * Apply composite mapping
   */
  private applyCompositeMapping(sourceData: any, config: any): string {
    const values = config.sourceFields.map((field: string) => sourceData[field] || '');
    if (config.template) {
      return config.template.replace(/\{(\w+)\}/g, (_: string, field: string) => sourceData[field] || '');
    }
    return values.join(config.separator || ' ');
  }

  /**
   * Apply transform mapping
   */
  private applyTransformMapping(sourceData: any, config: any): any {
    let value = sourceData[config.sourceField];

    if (config.transformations) {
      for (const transform of config.transformations) {
        value = this.applyTransformation(value, transform);
      }
    }

    return value;
  }

  /**
   * Apply single transformation
   */
  private applyTransformation(value: any, transform: any): any {
    switch (transform.type) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'to_string':
        return String(value);
      case 'to_number':
        return Number(value);
      case 'to_boolean':
        return Boolean(value);
      default:
        return value;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(record: any, condition: ConditionalRule): boolean {
    const fieldValue = record[condition.field];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return fieldValue === conditionValue;
      case 'neq':
        return fieldValue !== conditionValue;
      case 'gt':
        return fieldValue > conditionValue;
      case 'gte':
        return fieldValue >= conditionValue;
      case 'lt':
        return fieldValue < conditionValue;
      case 'lte':
        return fieldValue <= conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'starts_with':
        return String(fieldValue).startsWith(String(conditionValue));
      case 'ends_with':
        return String(fieldValue).endsWith(String(conditionValue));
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'is_null':
        return fieldValue == null;
      case 'is_not_null':
        return fieldValue != null;
      default:
        return false;
    }
  }
}
