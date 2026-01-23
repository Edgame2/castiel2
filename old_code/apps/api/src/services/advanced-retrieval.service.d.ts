/**
 * Advanced Retrieval Service
 *
 * Implements advanced embedding and retrieval techniques:
 * - HyDE (Hypothetical Document Embeddings)
 * - Parent Document Retrieval
 * - Cross-Encoder Reranking
 * - Query Expansion
 *
 * This service wraps around existing retrieval services to enhance results
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { AzureOpenAIService } from './azure-openai.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
export interface AdvancedRetrievalRequest {
    tenantId: string;
    query: string;
    useHyDE?: boolean;
    useParentDocumentRetrieval?: boolean;
    useCrossEncoderReranking?: boolean;
    useQueryExpansion?: boolean;
    topK?: number;
    initialTopK?: number;
    parentDocumentLimit?: number;
    shardTypeIds?: string[];
    tags?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    embeddingModel?: string;
    llmModel?: string;
    crossEncoderModel?: string;
}
export interface RetrievedDocument {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    content: string;
    score: number;
    isParentDocument?: boolean;
    originalChunkIds?: string[];
    metadata?: Record<string, unknown>;
}
export interface AdvancedRetrievalResult {
    documents: RetrievedDocument[];
    totalRetrieved: number;
    retrievalTimeMs: number;
    techniquesUsed: string[];
    metadata: {
        hydeGenerated?: boolean;
        queryExpanded?: string[];
        reranked?: boolean;
        parentDocumentsRetrieved?: number;
    };
}
export declare class AdvancedRetrievalService {
    private readonly azureOpenAI;
    private readonly shardRepository;
    private readonly monitoring;
    private readonly DEFAULT_TOP_K;
    private readonly DEFAULT_INITIAL_TOP_K_MULTIPLIER;
    private readonly DEFAULT_CROSS_ENCODER_MODEL;
    constructor(azureOpenAI: AzureOpenAIService, shardRepository: ShardRepository, monitoring: IMonitoringProvider);
    /**
     * Perform advanced retrieval with optional techniques
     */
    retrieve(request: AdvancedRetrievalRequest, baseRetrievalFn: (query: string, embedding: number[], topK: number) => Promise<RetrievedDocument[]>): Promise<AdvancedRetrievalResult>;
    /**
     * HyDE: Generate a hypothetical document that answers the query
     */
    private generateHypotheticalDocument;
    /**
     * Query Expansion: Expand query with related terms
     */
    private expandQuery;
    /**
     * Parent Document Retrieval: Retrieve parent documents from chunks
     */
    private retrieveParentDocuments;
    /**
     * Cross-Encoder Reranking: Rerank results using a cross-encoder model
     * Note: This is a simplified implementation. In production, you'd use a proper
     * cross-encoder library or API (e.g., sentence-transformers, Cohere rerank API)
     */
    private rerankWithCrossEncoder;
    /**
     * Embed text using Azure OpenAI
     */
    private embedText;
    /**
     * Extract content from a shard
     */
    private extractShardContent;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
}
//# sourceMappingURL=advanced-retrieval.service.d.ts.map