import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { ComputedFieldsResult } from '../types/computed-field.types.js';
import { Shard } from '../types/shard.types.js';
import { ShardType } from '../types/shard-type.types.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardEdgeRepository } from '../repositories/shard-edge.repository.js';
interface ComputedFieldServiceOptions {
    monitoring: IMonitoringProvider;
    redis?: Redis;
    shardRepository: ShardRepository;
    shardEdgeRepository: ShardEdgeRepository;
}
/**
 * Computed Field Service
 * Calculates derived fields based on shard data and relationships
 */
export declare class ComputedFieldService {
    private monitoring;
    private redis?;
    private shardRepository;
    private shardEdgeRepository;
    private cache;
    constructor(options: ComputedFieldServiceOptions);
    /**
     * Compute all fields for a shard
     */
    computeFieldsForShard(shard: Shard, shardType: ShardType, options?: {
        useCache?: boolean;
        userId?: string;
    }): Promise<ComputedFieldsResult>;
    /**
     * Compute a single field
     */
    private computeField;
    /**
     * Compute self-referencing field
     */
    private computeSelfField;
    /**
     * Compute field from related shards
     */
    private computeRelatedField;
    /**
     * Compute lookup field
     */
    private computeLookupField;
    /**
     * Compute formula field
     */
    private computeFormulaField;
    /**
     * Evaluate an expression with context
     */
    private evaluateExpression;
    /**
     * Perform aggregation on shards
     */
    private aggregate;
    /**
     * Get default value for aggregation type
     */
    private getDefaultForAggregation;
    /**
     * Get nested value from object
     */
    private getNestedValue;
    /**
     * Get cached value
     */
    private getCachedValue;
    /**
     * Set cached value
     */
    private setCachedValue;
    /**
     * Invalidate cached computed fields for a shard
     */
    invalidateCache(shardId: string, fieldNames?: string[]): Promise<void>;
    /**
     * Get computed field definitions from ShardType
     */
    private getComputedFieldDefinitions;
    /**
     * Add computed fields to shard response
     */
    enrichShardWithComputedFields(shard: Shard, shardType: ShardType, options?: {
        useCache?: boolean;
        userId?: string;
    }): Promise<Shard & {
        computedFields?: Record<string, any>;
    }>;
}
export {};
//# sourceMappingURL=computed-field.service.d.ts.map