/**
 * GraphQL Context and Types
 * TypeScript types for GraphQL resolvers and context
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MercuriusContext } from 'mercurius';
import type { Shard, ShardStatus, PermissionLevel } from '../types/shard.types.js';
import type { ShardType } from '../types/shard-type.types.js';
import type { Revision, ChangeType as RevisionOperation } from '../types/revision.types.js';
import type { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ShardCacheService } from '../services/shard-cache.service.js';
import type { ACLCacheService } from '../services/acl-cache.service.js';
import type { VectorSearchCacheService } from '../services/vector-search-cache.service.js';
interface DataLoader<K, V> {
    load(key: K): Promise<V>;
    loadMany(keys: K[]): Promise<(V | Error)[]>;
    clear(key: K): DataLoader<K, V>;
    clearAll(): DataLoader<K, V>;
}
/**
 * Authenticated user from JWT
 */
export interface GraphQLUser {
    userId: string;
    tenantId: string;
    roles: string[];
    email?: string;
}
/**
 * GraphQL Context - available in all resolvers
 */
export interface GraphQLContext extends MercuriusContext {
    request: FastifyRequest;
    reply: FastifyReply;
    user?: GraphQLUser;
    cosmosContainer: Container;
    redisClient?: Redis;
    monitoring?: IMonitoringProvider;
    shardCache?: ShardCacheService;
    aclCache?: ACLCacheService;
    vectorSearchCache?: VectorSearchCacheService;
    loaders: {
        shardLoader: DataLoader<ShardLoaderKey, Shard | null>;
        shardTypeLoader: DataLoader<ShardTypeLoaderKey, ShardType | null>;
        revisionLoader: DataLoader<RevisionLoaderKey, Revision | null>;
        aclLoader: DataLoader<ACLLoaderKey, PermissionLevel[]>;
        shardsByTypeLoader: DataLoader<ShardsByTypeKey, Shard[]>;
    };
}
/**
 * DataLoader keys
 */
export interface ShardLoaderKey {
    tenantId: string;
    shardId: string;
}
export interface ShardTypeLoaderKey {
    tenantId: string;
    shardTypeId: string;
}
export interface RevisionLoaderKey {
    tenantId: string;
    revisionId: string;
}
export interface ACLLoaderKey {
    tenantId: string;
    userId: string;
    shardId: string;
}
export interface ShardsByTypeKey {
    tenantId: string;
    shardTypeId: string;
    status?: ShardStatus;
}
/**
 * Filter inputs from GraphQL schema
 */
export interface ShardFilterInput {
    tenantId: string;
    shardTypeId?: string;
    status?: ShardStatus;
    tags?: string[];
    category?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
    searchQuery?: string;
}
export interface ShardTypeFilterInput {
    tenantId: string;
    isActive?: boolean;
    isSystem?: boolean;
    name?: string;
}
export interface RevisionFilterInput {
    tenantId: string;
    shardId?: string;
    shardTypeId?: string;
    operation?: RevisionOperation;
    changedBy?: string;
    changedAfter?: Date;
    changedBefore?: Date;
}
/**
 * Sort input
 */
export interface SortInput {
    field: string;
    direction: 'ASC' | 'DESC';
}
/**
 * Pagination types
 */
export interface PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
}
export interface Edge<T> {
    cursor: string;
    node: T;
}
export interface Connection<T> {
    edges: Edge<T>[];
    pageInfo: PageInfo;
    totalCount: number;
}
/**
 * Create/Update inputs
 */
export interface CreateShardInput {
    tenantId: string;
    shardTypeId: string;
    structuredData: Record<string, any>;
    unstructuredData?: string;
    tags?: string[];
    category?: string;
}
export interface UpdateShardInput {
    structuredData?: Record<string, any>;
    unstructuredData?: string;
    status?: ShardStatus;
    tags?: string[];
    category?: string;
}
export interface CreateShardTypeInput {
    tenantId: string;
    name: string;
    displayName: string;
    description?: string;
    schema: Record<string, any>;
}
export interface UpdateShardTypeInput {
    displayName?: string;
    description?: string;
    schema?: Record<string, any>;
    isActive?: boolean;
}
/**
 * Vector search inputs
 */
export interface VectorSearchInput {
    query: string;
    tenantId: string;
    shardTypeId?: string;
    topK?: number;
    minScore?: number;
    filters?: ShardFilterInput;
}
export interface HybridSearchInput {
    query: string;
    keywords: string[];
    tenantId: string;
    shardTypeId?: string;
    topK?: number;
    vectorWeight?: number;
    keywordWeight?: number;
    filters?: ShardFilterInput;
}
/**
 * Vector search result
 */
export interface VectorSearchResult {
    shard: Shard;
    score: number;
    matchType: 'SEMANTIC' | 'HYBRID';
}
export interface VectorSearchResults {
    results: VectorSearchResult[];
    totalCount: number;
    executionTimeMs: number;
}
/**
 * Subscription payload types
 */
export interface ShardCreatedPayload {
    shardCreated: Shard;
}
export interface ShardUpdatedPayload {
    shardUpdated: Shard;
}
export interface ShardDeletedPayload {
    shardDeleted: string;
}
/**
 * Cursor encoding/decoding helpers
 */
export declare const encodeCursor: (value: string) => string;
export declare const decodeCursor: (cursor: string) => string;
/**
 * Pagination helpers
 */
export interface PaginationArgs {
    first?: number;
    after?: string;
}
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const validatePaginationArgs: (args: PaginationArgs) => {
    limit: number;
    offset: number;
};
/**
 * Query complexity calculation
 */
export interface QueryComplexityConfig {
    maxComplexity: number;
    defaultFieldComplexity: number;
    scalarCost: number;
    objectCost: number;
    listMultiplier: number;
}
export declare const DEFAULT_COMPLEXITY_CONFIG: QueryComplexityConfig;
export {};
//# sourceMappingURL=types.d.ts.map