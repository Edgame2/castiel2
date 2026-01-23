/**
 * Integration Shard Service
 * Handles creation of shards from integration data with multi-type support
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { ConversionSchema } from '../types/conversion-schema.types.js';
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
export declare class IntegrationShardService {
    private shardRepository;
    private relationshipService;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, relationshipService: ShardRelationshipService);
    /**
     * Create shards from integration data with relationship preservation
     */
    createShardsFromIntegrationData(tenantId: string, integrationId: string, records: any[], schema: ConversionSchema, options?: ShardCreationOptions): Promise<ShardCreationResult>;
    /**
     * Create primary shard from record
     */
    private createPrimaryShard;
    /**
     * Create derived shards from same source data
     */
    private createDerivedShards;
    /**
     * Create shard link
     */
    private createShardLink;
    /**
     * Store external ID mapping
     */
    private storeExternalIdMapping;
    /**
     * Find shard by external ID
     */
    findShardByExternalId(tenantId: string, integrationId: string, externalId: string): Promise<string | null>;
    /**
     * Extract relationships from record
     */
    private extractRelationships;
    /**
     * Apply field mappings to transform data
     */
    private applyFieldMappings;
    /**
     * Apply single field mapping
     */
    private applyFieldMapping;
    /**
     * Apply composite mapping
     */
    private applyCompositeMapping;
    /**
     * Apply transform mapping
     */
    private applyTransformMapping;
    /**
     * Apply single transformation
     */
    private applyTransformation;
    /**
     * Evaluate condition
     */
    private evaluateCondition;
}
//# sourceMappingURL=integration-shard.service.d.ts.map