/**
 * Project Context Service
 * Optimized service for assembling project-scoped chat context
 * with efficient shard retrieval and caching
 */
import { ShardRepository } from '../../repositories/shard.repository.js';
import { ShardTypeRepository } from '../../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../shard-relationship.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Shard } from '../../types/shard.types.js';
import type { ContextChunk, RAGChunk } from '../../types/ai-insights.types.js';
interface IVectorSearchProvider {
    semanticSearch(request: {
        query: string;
        filter?: {
            tenantId: string;
        };
        topK?: number;
        minScore?: number;
    }, userId: string): Promise<{
        results: Array<{
            shard: Shard;
            score: number;
        }>;
    }>;
}
export interface ProjectContextOptions {
    maxTokens?: number;
    minRelevance?: number;
    includeUnlinked?: boolean;
    unlinkedFraction?: number;
    shardTypeFilter?: string[];
    maxRelatedShards?: number;
}
export interface ProjectContextResult {
    projectChunk: ContextChunk | null;
    relatedChunks: ContextChunk[];
    ragChunks: RAGChunk[];
    totalTokens: number;
    metadata: {
        projectId: string;
        relatedShardCount: number;
        ragChunkCount: number;
        linkedRagCount: number;
        unlinkedRagCount: number;
    };
}
/**
 * Service for optimized project context assembly
 */
export declare class ProjectContextService {
    private readonly shardRepository;
    private readonly shardTypeRepository;
    private readonly relationshipService;
    private readonly monitoring;
    private readonly vectorSearch?;
    private relationshipCache;
    private readonly CACHE_TTL;
    constructor(shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, relationshipService: ShardRelationshipService, monitoring: IMonitoringProvider, vectorSearch?: IVectorSearchProvider | undefined);
    /**
     * Assemble optimized project context for chat
     */
    assembleProjectContext(tenantId: string, projectId: string, query: string, options?: ProjectContextOptions): Promise<ProjectContextResult>;
    /**
     * Get project-related shards with optimized batch retrieval
     */
    private getProjectRelatedShards;
    /**
     * Get RAG chunks with project-aware filtering
     */
    private getProjectRAGChunks;
    /**
     * Truncate chunks to fit within token limit
     */
    private truncateToTokenLimit;
    /**
     * Estimate token count (rough approximation: 1 token ≈ 4 characters)
     */
    private estimateTokens;
    /**
     * Invalidate cache for a project
     */
    invalidateCache(tenantId: string, projectId: string): void;
    /**
     * Clear all caches
     */
    clearCache(): void;
}
export {};
//# sourceMappingURL=project-context.service.d.ts.map