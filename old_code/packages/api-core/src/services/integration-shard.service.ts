/**
 * Integration Shard Service
 * Handles creation of shards from integration data with multi-type support
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
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
            if (derived.linkToPrimary && derived.linkRelationshipType) {
              try {
                await this.relationshipService.createRelationship({
                  sourceShardId: primaryShard.id,
                  targetShardId: derived.id,
                  relationshipType: derived.linkRelationshipType,
                  tenantId,
                  sourceShardTypeId: primaryShard.shardTypeId,
                  sourceShardTypeName: primaryShard.shardTypeName,
                  targetShardTypeId: derived.shardTypeId,
                  targetShardTypeName: derived.shardTypeName,
                  createdBy: 'system',
                });

                result.relationships.push({
                  source: primaryShard.id,
                  target: derived.id,
                  type: derived.linkRelationshipType,
                });
              } catch (relError) {
                this.monitoring.trackException(relError as Error, {
                  operation: 'integration.shard.create.relationship',
                  primaryShardId: primaryShard.id,
                  derivedShardId: derived.id,
                });
              }
            }
          }
        }

        // Create relationships if configured
        if (options.createRelationships !== false && schema.relationships) {
          const relationships = await this.createRelationships(
            tenantId,
            primaryShard,
            record,
            schema
          );
          result.relationships.push(...relationships);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failed.push({
          externalId: record.id || record.externalId || 'unknown',
          error: errorMessage,
        });

        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          operation: 'integration.shard.create.record',
          tenantId,
          integrationId,
          recordId: record.id || record.externalId,
        });
      }
    }

    this.monitoring.trackEvent('integration.shard.create.completed', {
      tenantId,
      integrationId,
      created: result.created.length,
      updated: result.updated.length,
      failed: result.failed.length,
      relationships: result.relationships.length,
      durationMs: Date.now() - startTime,
    });

    return result;
  }

  /**
   * Create primary shard from integration record
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
    shardTypeName?: string;
    name: string;
    externalId: string;
    created: boolean;
  }> {
    // Get shard type from schema
    const shardTypeId = schema.outputShardTypes?.primary || schema.shardTypeId;
    if (!shardTypeId) {
      throw new Error('Schema must specify primary shard type');
    }

    // Extract external ID
    const externalId = this.extractExternalId(record, schema);
    if (!externalId) {
      throw new Error('Record must have an external ID');
    }

    // Check for existing shard if duplicate check is enabled
    if (!options.skipDuplicateCheck) {
      const existing = await this.shardRepository.findByExternalId(
        tenantId,
        integrationId,
        externalId,
        shardTypeId
      );

      if (existing) {
        if (options.updateExisting) {
          // Update existing shard
          const updated = await this.shardRepository.update(existing.id, tenantId, {
            structuredData: this.transformRecord(record, schema),
            syncStatus: SyncStatus.SYNCED,
            lastSyncedAt: new Date(),
          });

          return {
            id: updated.id,
            shardTypeId: updated.shardTypeId,
            shardTypeName: updated.shardTypeName,
            name: updated.name,
            externalId: updated.externalId || externalId,
            created: false,
          };
        } else {
          // Return existing without updating
          return {
            id: existing.id,
            shardTypeId: existing.shardTypeId,
            shardTypeName: existing.shardTypeName,
            name: existing.name,
            externalId: existing.externalId || externalId,
            created: false,
          };
        }
      }
    }

    // Create new shard
    const transformedData = this.transformRecord(record, schema);
    const name = this.extractName(record, schema) || externalId;

    const shard = await this.shardRepository.create({
      tenantId,
      userId: 'system',
      shardTypeId,
      name,
      externalId,
      structuredData: transformedData,
      source: ShardSource.INTEGRATION,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: new Date(),
      metadata: {
        integrationId,
        externalId,
        originalRecord: record,
      },
    });

    return {
      id: shard.id,
      shardTypeId: shard.shardTypeId,
      shardTypeName: shard.shardTypeName,
      name: shard.name,
      externalId: shard.externalId || externalId,
      created: true,
    };
  }

  /**
   * Create derived shards from integration record
   */
  private async createDerivedShards(
    tenantId: string,
    integrationId: string,
    record: any,
    primaryShard: {
      id: string;
      shardTypeId: string;
      shardTypeName?: string;
    },
    schema: ConversionSchema,
    options: ShardCreationOptions
  ): Promise<{
    created: Array<{
      id: string;
      shardTypeId: string;
      shardTypeName?: string;
      name: string;
      externalId: string;
      linkToPrimary?: boolean;
      linkRelationshipType?: string;
    }>;
    failed: Array<{
      externalId: string;
      error: string;
    }>;
  }> {
    const result = {
      created: [] as Array<{
        id: string;
        shardTypeId: string;
        shardTypeName?: string;
        name: string;
        externalId: string;
        linkToPrimary?: boolean;
        linkRelationshipType?: string;
      }>,
      failed: [] as Array<{
        externalId: string;
        error: string;
      }>,
    };

    if (!schema.outputShardTypes?.derived) {
      return result;
    }

    for (const derivedConfig of schema.outputShardTypes.derived) {
      try {
        // Extract data for derived shard
        const derivedData = this.extractDerivedData(record, derivedConfig);
        if (!derivedData) {
          continue; // Skip if no data for this derived shard
        }

        const derivedExternalId = derivedData.externalId || `${primaryShard.id}-${derivedConfig.shardTypeId}`;
        const derivedName = derivedData.name || derivedExternalId;

        // Check for existing derived shard
        let derivedShard;
        if (!options.skipDuplicateCheck) {
          const existing = await this.shardRepository.findByExternalId(
            tenantId,
            integrationId,
            derivedExternalId,
            derivedConfig.shardTypeId
          );

          if (existing) {
            if (options.updateExisting) {
              derivedShard = await this.shardRepository.update(existing.id, tenantId, {
                structuredData: derivedData.data,
                syncStatus: SyncStatus.SYNCED,
                lastSyncedAt: new Date(),
              });
            } else {
              derivedShard = existing;
            }
          }
        }

        // Create new derived shard if not found
        if (!derivedShard) {
          derivedShard = await this.shardRepository.create({
            tenantId,
            userId: 'system',
            shardTypeId: derivedConfig.shardTypeId,
            name: derivedName,
            externalId: derivedExternalId,
            structuredData: derivedData.data,
            source: ShardSource.INTEGRATION,
            syncStatus: SyncStatus.SYNCED,
            lastSyncedAt: new Date(),
            metadata: {
              integrationId,
              externalId: derivedExternalId,
              primaryShardId: primaryShard.id,
            },
          });
        }

        result.created.push({
          id: derivedShard.id,
          shardTypeId: derivedShard.shardTypeId,
          shardTypeName: derivedShard.shardTypeName,
          name: derivedShard.name,
          externalId: derivedShard.externalId || derivedExternalId,
          linkToPrimary: derivedConfig.linkToPrimary,
          linkRelationshipType: derivedConfig.linkRelationshipType,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failed.push({
          externalId: record.id || record.externalId || 'unknown',
          error: `Derived shard creation failed: ${errorMessage}`,
        });

        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          operation: 'integration.shard.create.derived',
          tenantId,
          integrationId,
          derivedTypeId: derivedConfig.shardTypeId,
        });
      }
    }

    return result;
  }

  /**
   * Create relationships between shards based on schema
   */
  private async createRelationships(
    tenantId: string,
    primaryShard: {
      id: string;
      shardTypeId: string;
      shardTypeName?: string;
    },
    record: any,
    schema: ConversionSchema
  ): Promise<Array<{ source: string; target: string; type: string }>> {
    const relationships: Array<{ source: string; target: string; type: string }> = [];

    if (!schema.relationships) {
      return relationships;
    }

    for (const relConfig of schema.relationships) {
      try {
        // Extract target external ID from record
        const targetExternalId = this.extractFieldValue(record, relConfig.targetExternalIdField);
        if (!targetExternalId) {
          continue; // Skip if target not found
        }

        // Find target shard
        const targetShard = await this.shardRepository.findByExternalId(
          tenantId,
          record.integrationId || 'unknown',
          targetExternalId,
          relConfig.targetShardTypeId
        );

        if (!targetShard) {
          continue; // Skip if target shard not found
        }

        // Create relationship
        await this.relationshipService.createRelationship({
          sourceShardId: primaryShard.id,
          targetShardId: targetShard.id,
          relationshipType: relConfig.relationshipType,
          tenantId,
          sourceShardTypeId: primaryShard.shardTypeId,
          sourceShardTypeName: primaryShard.shardTypeName,
          targetShardTypeId: targetShard.shardTypeId,
          targetShardTypeName: targetShard.shardTypeName,
          createdBy: 'system',
        });

        relationships.push({
          source: primaryShard.id,
          target: targetShard.id,
          type: relConfig.relationshipType,
        });
      } catch (error) {
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          operation: 'integration.shard.create.relationship',
          tenantId,
          relationshipType: relConfig.relationshipType,
        });
      }
    }

    return relationships;
  }

  /**
   * Transform integration record to shard data using schema
   */
  private transformRecord(record: any, schema: ConversionSchema): any {
    const transformed: any = {};

    if (!schema.fieldMappings) {
      return record; // Return as-is if no mappings
    }

    for (const mapping of schema.fieldMappings) {
      const sourceValue = this.extractFieldValue(record, mapping.sourceField);
      if (sourceValue === undefined || sourceValue === null) {
        continue; // Skip if source field not found
      }

      // Apply transformation if configured
      let transformedValue = sourceValue;
      if (mapping.transformation) {
        transformedValue = this.applyTransformation(sourceValue, mapping.transformation, record);
      }

      // Apply conditional rules
      if (mapping.conditionalRules) {
        for (const rule of mapping.conditionalRules) {
          if (this.evaluateCondition(record, rule.condition)) {
            transformedValue = this.applyTransformation(transformedValue, rule.transformation, record);
          }
        }
      }

      // Set target field
      this.setNestedField(transformed, mapping.targetField, transformedValue);
    }

    return transformed;
  }

  /**
   * Extract external ID from record
   */
  private extractExternalId(record: any, schema: ConversionSchema): string | null {
    if (schema.externalIdField) {
      return this.extractFieldValue(record, schema.externalIdField) || null;
    }

    // Fallback to common ID fields
    return record.id || record.externalId || record.Id || record.external_id || null;
  }

  /**
   * Extract name from record
   */
  private extractName(record: any, schema: ConversionSchema): string | null {
    if (schema.nameField) {
      return this.extractFieldValue(record, schema.nameField) || null;
    }

    // Fallback to common name fields
    return record.name || record.Name || record.title || record.Title || null;
  }

  /**
   * Extract field value from nested object using dot notation
   */
  private extractFieldValue(obj: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Set nested field value using dot notation
   */
  private setNestedField(obj: any, fieldPath: string, value: any): void {
    const parts = fieldPath.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Apply transformation to value
   */
  private applyTransformation(value: any, transformation: any, record: any): any {
    if (!transformation || !transformation.type) {
      return value;
    }

    switch (transformation.type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'date':
        return new Date(value).toISOString();
      case 'boolean':
        return Boolean(value);
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'concat':
        if (transformation.fields) {
          return transformation.fields.map((f: string) => this.extractFieldValue(record, f) || '').join(transformation.separator || ' ');
        }
        return value;
      case 'default':
        return value === undefined || value === null ? transformation.defaultValue : value;
      case 'map':
        if (transformation.mapping && transformation.mapping[value]) {
          return transformation.mapping[value];
        }
        return transformation.defaultValue !== undefined ? transformation.defaultValue : value;
      default:
        return value;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(record: any, condition: any): boolean {
    if (!condition) {
      return true;
    }

    const fieldValue = this.extractFieldValue(record, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'notEquals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'notContains':
        return !String(fieldValue).includes(String(condition.value));
      case 'greaterThan':
        return Number(fieldValue) > Number(condition.value);
      case 'lessThan':
        return Number(fieldValue) < Number(condition.value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'notExists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return true;
    }
  }

  /**
   * Extract derived shard data
   */
  private extractDerivedData(record: any, derivedConfig: any): { data: any; externalId?: string; name?: string } | null {
    if (!derivedConfig.dataExtraction) {
      return null;
    }

    const extracted: any = {};

    // Extract fields
    if (derivedConfig.dataExtraction.fields) {
      for (const fieldMapping of derivedConfig.dataExtraction.fields) {
        const sourceValue = this.extractFieldValue(record, fieldMapping.source);
        if (sourceValue !== undefined && sourceValue !== null) {
          this.setNestedField(extracted, fieldMapping.target, sourceValue);
        }
      }
    }

    // Extract external ID
    const externalId = derivedConfig.dataExtraction.externalIdField
      ? this.extractFieldValue(record, derivedConfig.dataExtraction.externalIdField)
      : undefined;

    // Extract name
    const name = derivedConfig.dataExtraction.nameField
      ? this.extractFieldValue(record, derivedConfig.dataExtraction.nameField)
      : undefined;

    return {
      data: extracted,
      externalId,
      name,
    };
  }
}
