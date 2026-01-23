/**
 * Hybrid Retrieval Service
 * Combines vector similarity search with graph-based relationship traversal
 * Uses Reciprocal Rank Fusion (RRF) to merge results from multiple retrieval methods
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
export interface RetrievalRequest {
    tenantId: string;
    query: string;
    queryEmbedding?: number[];
    focusShardIds?: string[];
    vectorWeight?: number;
    graphWeight?: number;
    keywordWeight?: number;
    topK?: number;
    vectorTopK?: number;
    graphDepth?: number;
    graphTopK?: number;
    shardTypeIds?: string[];
    tags?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    rrfK?: number;
}
export interface RetrievedChunk {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    content: string;
    finalScore: number;
    vectorScore?: number;
    graphScore?: number;
    keywordScore?: number;
    rrfRank: number;
    retrievalSource: 'vector' | 'graph' | 'keyword' | 'hybrid';
    graphPath?: string[];
    relationshipType?: string;
    highlight?: string;
    relevantFields?: Record<string, unknown>;
}
export interface RetrievalResult {
    chunks: RetrievedChunk[];
    totalCandidates: number;
    retrievalTimeMs: number;
    sources: {
        vector: number;
        graph: number;
        keyword: number;
    };
}
export interface GraphNode {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    depth: number;
    path: string[];
    relationshipType: string;
    score: number;
}
export declare class HybridRetrievalService {
    private readonly shardRepository;
    private readonly relationshipService;
    private readonly vectorSearch;
    private readonly monitoring;
    private readonly DEFAULT_RRF_K;
    private readonly DEFAULT_TOP_K;
    private readonly DEFAULT_VECTOR_TOP_K;
    private readonly DEFAULT_GRAPH_DEPTH;
    private readonly DEFAULT_GRAPH_TOP_K;
    constructor(shardRepository: ShardRepository, relationshipService: ShardRelationshipService, vectorSearch: {
        search: (tenantId: string, embedding: number[], options?: any) => Promise<any[]>;
    } | null, monitoring: IMonitoringProvider);
    /**
     * Perform hybrid retrieval combining vector, graph, and keyword search
     */
    retrieve(request: RetrievalRequest): Promise<RetrievalResult>;
    private vectorRetrieval;
    private graphRetrieval;
    private keywordRetrieval;
    private reciprocalRankFusion;
    private enrichChunks;
    private buildContent;
    private extractKeywords;
}
export declare function createHybridRetrievalService(shardRepository: ShardRepository, relationshipService: ShardRelationshipService, vectorSearch: {
    search: (tenantId: string, embedding: number[], options?: any) => Promise<any[]>;
} | null, monitoring: IMonitoringProvider): HybridRetrievalService;
//# sourceMappingURL=hybrid-retrieval.service.d.ts.map