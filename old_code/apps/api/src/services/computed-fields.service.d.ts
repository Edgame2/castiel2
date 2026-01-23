/**
 * Computed Fields Service
 *
 * Handles computed/derived field calculations for shards
 */
import type { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';
import { ComputedFieldDefinition, ShardTypeComputedFields, ComputedFieldResult, ComputationContext, ComputeTrigger } from '../types/computed-fields.types.js';
import type { Shard, StructuredData } from '../types/shard.types.js';
import type { ShardRepository } from '../repositories/shard.repository.js';
import type { ShardRelationshipRepository } from '../repositories/shard-relationship.repository.js';
/**
 * Computed Fields Service
 */
export declare class ComputedFieldsService {
    private readonly redis;
    private readonly shardRepository;
    private readonly relationshipRepository?;
    private readonly server?;
    private customFunctions;
    constructor(redis: Redis, shardRepository: ShardRepository, relationshipRepository?: ShardRelationshipRepository | undefined, server?: FastifyInstance | undefined);
    /**
     * Set computed fields configuration for a shard type
     */
    setComputedFieldsConfig(tenantId: string, shardTypeId: string, fields: ComputedFieldDefinition[]): Promise<ShardTypeComputedFields>;
    /**
     * Get computed fields configuration
     */
    getComputedFieldsConfig(tenantId: string, shardTypeId: string): Promise<ShardTypeComputedFields | null>;
    /**
     * Delete computed fields configuration
     */
    deleteComputedFieldsConfig(tenantId: string, shardTypeId: string): Promise<boolean>;
    /**
     * Compute all fields for a shard
     */
    computeFields(shard: Shard, trigger: ComputeTrigger, userId: string): Promise<Map<string, ComputedFieldResult>>;
    /**
     * Compute a single field
     */
    private computeField;
    /**
     * Compute formula expression
     */
    private computeFormula;
    /**
     * Compute template string
     */
    private computeTemplate;
    /**
     * Compute aggregate from related shards
     */
    private computeAggregate;
    /**
     * Compute lookup from another shard
     */
    private computeLookup;
    /**
     * Compute conditional logic
     */
    private computeConditional;
    /**
     * Compute using custom function
     */
    private computeCustom;
    /**
     * Register a custom computation function
     */
    registerCustomFunction(name: string, fn: (ctx: ComputationContext, params?: any) => any): void;
    /**
     * Evaluate a mathematical/logical expression safely
     */
    private evaluateExpression;
    /**
     * Validate expression is safe (basic check - not comprehensive)
     * Blocks function calls, require, import, eval, and other dangerous patterns
     */
    private isExpressionSafe;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Set nested value in object using dot notation
     */
    private setNestedValue;
    /**
     * Get cached computed value
     */
    private getCachedValue;
    /**
     * Set cached computed value
     */
    private setCachedValue;
    /**
     * Invalidate cache for a shard
     */
    invalidateCache(tenantId: string, shardId: string, fieldPath?: string): Promise<void>;
    /**
     * Apply computed fields to shard data
     */
    applyComputedFields(shard: Shard, trigger: ComputeTrigger, userId: string): Promise<StructuredData>;
    /**
     * Get computed field values as a separate object (not merged into structuredData)
     */
    getComputedFieldValues(shard: Shard, userId: string): Promise<Record<string, ComputedFieldResult>>;
}
//# sourceMappingURL=computed-fields.service.d.ts.map