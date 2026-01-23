import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardType, CreateShardTypeInput, UpdateShardTypeInput, ShardTypeListOptions, ShardTypeListResult, ResolvedShardType, JSONSchema } from '../types/shard-type.types.js';
/**
 * ShardType Repository
 * Handles all Cosmos DB operations for ShardTypes
 * NO CACHING - ShardTypes are read infrequently and don't change often
 */
export declare class ShardTypeRepository {
    private client;
    private container;
    private shardContainer;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize container with proper indexing
     */
    ensureContainer(): Promise<void>;
    /**
     * Create a new shard type
     */
    create(input: CreateShardTypeInput): Promise<ShardType>;
    /**
     * Find shard type by ID
     * NO CACHING - always fetch from database
     */
    findById(id: string, tenantId: string): Promise<ShardType | null>;
    /**
     * Find shard type by name
     */
    findByName(name: string, tenantId: string): Promise<ShardType | null>;
    /**
     * Get shard type with resolved schema (includes parent inheritance)
     */
    findByIdWithInheritance(id: string, tenantId: string): Promise<ResolvedShardType | null>;
    /**
     * Resolve schema inheritance by merging parent schemas
     */
    private resolveInheritance;
    /**
     * Update shard type (creates new version)
     */
    update(id: string, tenantId: string, input: UpdateShardTypeInput): Promise<ShardType | null>;
    /**
     * Soft delete shard type
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * List shard types with filtering and pagination
     */
    list(options: ShardTypeListOptions): Promise<ShardTypeListResult>;
    getGlobalShardTypes(): Promise<ShardType[]>;
    checkCircularInheritance(shardTypeId: string, parentShardTypeId: string, tenantId: string): Promise<boolean>;
    validateSchemaCompatibility(parentSchema: JSONSchema, childSchema: JSONSchema): boolean;
    getShardTypeUsageCount(shardTypeId: string, tenantId?: string): Promise<number>;
    checkShardTypeInUse(shardTypeId: string, tenantId?: string): Promise<boolean>;
    getChildTypes(shardTypeId: string, tenantId?: string): Promise<ShardType[]>;
    /**
     * Get all child types of a parent
     */
    findChildren(parentId: string, tenantId: string): Promise<ShardType[]>;
    /**
     * Get tenant-specific ShardTypes (excludes global types)
     */
    getTenantShardTypes(tenantId: string): Promise<ShardType[]>;
    /**
     * Get cloneable ShardTypes (where isTemplate = true)
     */
    getCloneableShardTypes(includeGlobalOnly?: boolean): Promise<ShardType[]>;
    /**
     * Clone a ShardType with customizations
     */
    cloneShardType(sourceId: string, targetTenantId: string, customizations: {
        name?: string;
        displayName?: string;
        fields?: any;
        enrichment?: any;
        validationRules?: any;
        fieldGroups?: any;
    }, userId: string): Promise<ShardType>;
    /**
     * Get ShardType by ID with relationships resolved
     * Returns the ShardType with target ShardTypes populated in relationships
     */
    getByIdWithRelationships(id: string, tenantId: string): Promise<ShardType & {
        resolvedRelationships?: any[];
    } | null>;
    /**
     * Check if container is healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Update embedding template for a shard type
     */
    updateEmbeddingTemplate(shardTypeId: string, tenantId: string, template: any): Promise<ShardType>;
    /**
     * Get embedding template for a shard type
     * Returns the custom template or null if using default
     */
    getEmbeddingTemplate(shardTypeId: string, tenantId: string): Promise<any | null>;
    /**
     * List all shard types with custom embedding templates
     */
    listWithEmbeddingTemplates(tenantId: string): Promise<ShardType[]>;
}
//# sourceMappingURL=shard-type.repository.d.ts.map