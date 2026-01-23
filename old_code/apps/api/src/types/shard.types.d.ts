/**
 * Shard types for Cosmos DB
 * Shards are the core data entities in the system
 */
import type { EnrichmentResults } from './enrichment.types.js';
/**
 * Permission level for ACL entries
 */
export declare enum PermissionLevel {
    READ = "read",
    WRITE = "write",
    DELETE = "delete",
    ADMIN = "admin"
}
/**
 * ACL entry for shard access control
 */
export interface ACLEntry {
    userId?: string;
    roleId?: string;
    permissions: PermissionLevel[];
    grantedBy: string;
    grantedAt: Date;
}
/**
 * Enrichment configuration for AI processing
 */
export interface EnrichmentConfig {
    enabled: boolean;
    providers?: string[];
    autoEnrich?: boolean;
    enrichmentTypes?: string[];
}
/**
 * Enrichment metadata
 */
export interface Enrichment {
    config: EnrichmentConfig;
    lastEnrichedAt?: Date;
    enrichmentData?: Record<string, any>;
    error?: string;
}
/**
 * Vector embedding for semantic search
 */
export interface VectorEmbedding {
    id: string;
    field: string;
    model: string;
    dimensions: number;
    embedding: number[];
    createdAt: Date;
}
/**
 * Shard status
 */
export declare enum ShardStatus {
    ACTIVE = "active",
    ARCHIVED = "archived",
    DELETED = "deleted",
    DRAFT = "draft"
}
/**
 * Source of shard creation
 */
export declare enum ShardSource {
    UI = "ui",
    API = "api",
    IMPORT = "import",
    INTEGRATION = "integration",
    SYSTEM = "system"
}
/**
 * Source details for tracking origin
 */
export interface ShardSourceDetails {
    integrationName?: string;
    importJobId?: string;
    originalId?: string;
    syncedAt?: Date;
}
/**
 * Structured data (cacheable)
 * This is a flexible object that conforms to the ShardType's JSON Schema
 */
export type StructuredData = Record<string, any>;
/**
 * Unstructured data (not cached)
 * Can contain large text, files, etc.
 */
export interface UnstructuredData {
    text?: string;
    files?: Array<{
        id: string;
        name: string;
        url: string;
        mimeType: string;
        size: number;
    }>;
    rawData?: any;
}
/**
 * Redaction metadata (Phase 2)
 */
export interface RedactionMetadata {
    redacted: boolean;
    redactedFields?: string[];
    redactedAt?: Date;
    redactedBy?: string;
    redactionConfigId?: string;
}
/**
 * Shard metadata
 */
export interface ShardMetadata {
    tags?: string[];
    category?: string;
    priority?: number;
    customFields?: Record<string, any>;
    enrichment?: EnrichmentResults;
    redaction?: RedactionMetadata;
}
export interface InternalRelationship {
    shardId: string;
    shardTypeId: string;
    shardTypeName?: string;
    shardName: string;
    createdAt: Date;
    metadata?: {
        confidence?: number;
        source?: 'crm' | 'llm' | 'messaging' | 'manual';
        extractionMethod?: string;
        extractedAt?: Date;
        verified?: boolean;
        verifiedBy?: string;
        verifiedAt?: Date;
        [key: string]: any;
    };
}
/**
 * Sync status for external relationships
 */
export declare enum SyncStatus {
    SYNCED = "synced",
    PENDING = "pending",
    FAILED = "failed",
    STALE = "stale"
}
/**
 * Sync direction for external relationships
 */
export declare enum SyncDirection {
    INBOUND = "inbound",
    OUTBOUND = "outbound",
    BIDIRECTIONAL = "bidirectional"
}
/**
 * Type guard to check if a string is a valid SyncStatus
 */
export declare function isValidSyncStatus(value: string): value is SyncStatus;
/**
 * Type guard to check if a string is a valid SyncDirection
 */
export declare function isValidSyncDirection(value: string): value is SyncDirection;
/**
 * External relationship linking shards to external systems
 * Phase 2 enhanced structure with backward compatibility
 */
export interface ExternalRelationship {
    id?: string;
    system?: string;
    systemType?: string;
    label?: string;
    syncStatus?: SyncStatus;
    syncDirection?: SyncDirection;
    lastSyncedAt?: Date;
    metadata?: Record<string, any>;
    createdBy?: string;
    externalId: string;
    integrationConnectionId?: string;
    createdAt: Date;
}
/**
 * Shard document stored in Cosmos DB
 */
export interface Shard {
    id: string;
    tenantId: string;
    userId: string;
    shardTypeId: string;
    shardTypeName?: string;
    parentShardId?: string;
    schemaVersion?: number;
    structuredData: StructuredData;
    unstructuredData?: UnstructuredData;
    metadata?: ShardMetadata;
    internal_relationships?: InternalRelationship[];
    external_relationships?: ExternalRelationship[];
    acl: ACLEntry[];
    enrichment?: Enrichment;
    lastEnrichedAt?: Date;
    vectors?: VectorEmbedding[];
    revisionId: string;
    revisionNumber: number;
    status: ShardStatus;
    source: ShardSource;
    sourceDetails?: ShardSourceDetails;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    archivedAt?: Date;
    lastActivityAt?: Date;
    _rid?: string;
    _self?: string;
    _etag?: string;
    _attachments?: string;
    _ts?: number;
}
/**
 * Shard creation input
 */
export interface CreateShardInput {
    tenantId: string;
    userId?: string;
    createdBy?: string;
    shardTypeId: string;
    shardTypeName?: string;
    structuredData: StructuredData;
    unstructuredData?: UnstructuredData;
    metadata?: ShardMetadata;
    internal_relationships?: InternalRelationship[];
    external_relationships?: ExternalRelationship[];
    parentShardId?: string;
    acl?: ACLEntry[];
    enrichment?: EnrichmentConfig;
    status?: ShardStatus;
    source?: ShardSource;
    sourceDetails?: ShardSourceDetails;
    skipEnqueueing?: boolean;
}
/**
 * Shard update input
 */
export interface UpdateShardInput {
    structuredData?: StructuredData;
    unstructuredData?: UnstructuredData;
    metadata?: ShardMetadata;
    internal_relationships?: InternalRelationship[];
    external_relationships?: ExternalRelationship[];
    acl?: ACLEntry[];
    enrichment?: Enrichment;
    status?: ShardStatus;
    schemaVersion?: number;
}
/**
 * Shard query filters
 */
export interface ShardQueryFilter {
    tenantId: string;
    userId?: string;
    shardTypeId?: string;
    parentShardId?: string;
    status?: ShardStatus;
    category?: string;
    priority?: number;
    tags?: string[];
    source?: ShardSource;
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
    lastActivityAfter?: Date;
    lastActivityBefore?: Date;
    archivedAfter?: Date;
    archivedBefore?: Date;
    managerId?: string;
    teamMemberId?: string;
    structuredDataFilters?: Record<string, any>;
}
/**
 * Shard list options
 */
export interface ShardListOptions {
    filter?: ShardQueryFilter;
    limit?: number;
    continuationToken?: string;
    orderBy?: 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
}
/**
 * Shard list result
 */
export interface ShardListResult {
    shards: Shard[];
    continuationToken?: string;
    count: number;
}
/**
 * Permission check result
 */
export interface PermissionCheckResult {
    hasAccess: boolean;
    permissions: PermissionLevel[];
}
//# sourceMappingURL=shard.types.d.ts.map