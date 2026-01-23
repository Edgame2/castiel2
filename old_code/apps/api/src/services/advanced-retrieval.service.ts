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
import {
  AzureOpenAIService,
  ShardRepository,
} from '@castiel/api-core';
import type { Shard } from '../types/shard.types.js';

// ============================================
// Types
// ============================================

export interface AdvancedRetrievalRequest {
  tenantId: string;
  query: string;
  
  // Advanced techniques configuration
  useHyDE?: boolean;              // Use Hypothetical Document Embeddings
  useParentDocumentRetrieval?: boolean;  // Retrieve parent documents from chunks
  useCrossEncoderReranking?: boolean;     // Rerank results with cross-encoder
  useQueryExpansion?: boolean;            // Expand query with related terms
  
  // Limits
  topK?: number;                  // Final number of results to return
  initialTopK?: number;           // Initial retrieval before reranking (default: topK * 3)
  parentDocumentLimit?: number;   // Max parent documents to retrieve
  
  // Filters
  shardTypeIds?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  
  // Model configuration
  embeddingModel?: string;
  llmModel?: string;             // For HyDE and query expansion
  crossEncoderModel?: string;    // For reranking (default: 'cross-encoder/ms-marco-MiniLM-L-6-v2')
}

export interface RetrievedDocument {
  shardId: string;
  shardName: string;
  shardTypeId: string;
  content: string;
  score: number;
  isParentDocument?: boolean;    // True if this is a parent document
  originalChunkIds?: string[];   // If parent, which chunks led to it
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

// ============================================
// Service
// ============================================

export class AdvancedRetrievalService {
  private readonly DEFAULT_TOP_K = 10;
  private readonly DEFAULT_INITIAL_TOP_K_MULTIPLIER = 3;
  private readonly DEFAULT_CROSS_ENCODER_MODEL = 'cross-encoder/ms-marco-MiniLM-L-6-v2';
  
  constructor(
    private readonly azureOpenAI: AzureOpenAIService,
    private readonly shardRepository: ShardRepository,
    private readonly monitoring: IMonitoringProvider
  ) {}

  /**
   * Perform advanced retrieval with optional techniques
   */
  async retrieve(
    request: AdvancedRetrievalRequest,
    baseRetrievalFn: (query: string, embedding: number[], topK: number) => Promise<RetrievedDocument[]>
  ): Promise<AdvancedRetrievalResult> {
    const startTime = Date.now();
    const techniquesUsed: string[] = [];
    const metadata: AdvancedRetrievalResult['metadata'] = {};
    
    let query = request.query;
    let queryEmbedding: number[];
    
    // Step 1: Query Expansion (if enabled)
    if (request.useQueryExpansion) {
      const expanded = await this.expandQuery(query, request.tenantId, request.llmModel);
      query = expanded.expandedQuery;
      metadata.queryExpanded = expanded.relatedTerms;
      techniquesUsed.push('query-expansion');
    }
    
    // Step 2: HyDE - Generate hypothetical document (if enabled)
    if (request.useHyDE) {
      const hypotheticalDoc = await this.generateHypotheticalDocument(query, request.llmModel);
      queryEmbedding = await this.embedText(hypotheticalDoc, request.embeddingModel);
      metadata.hydeGenerated = true;
      techniquesUsed.push('hyde');
    } else {
      // Standard query embedding
      queryEmbedding = await this.embedText(query, request.embeddingModel);
    }
    
    // Step 3: Initial retrieval (retrieve more than needed for reranking)
    const initialTopK = request.initialTopK || 
                       (request.topK || this.DEFAULT_TOP_K) * this.DEFAULT_INITIAL_TOP_K_MULTIPLIER;
    
    let documents = await baseRetrievalFn(query, queryEmbedding, initialTopK);
    
    // Step 4: Parent Document Retrieval (if enabled)
    if (request.useParentDocumentRetrieval && documents.length > 0) {
      const parentDocs = await this.retrieveParentDocuments(
        documents,
        request.tenantId,
        request.parentDocumentLimit || 5
      );
      documents = [...documents, ...parentDocs];
      metadata.parentDocumentsRetrieved = parentDocs.length;
      techniquesUsed.push('parent-document-retrieval');
    }
    
    // Step 5: Cross-Encoder Reranking (if enabled)
    if (request.useCrossEncoderReranking && documents.length > 0) {
      documents = await this.rerankWithCrossEncoder(
        query,
        documents,
        request.crossEncoderModel
      );
      metadata.reranked = true;
      techniquesUsed.push('cross-encoder-reranking');
    }
    
    // Step 6: Take final top K
    const finalTopK = request.topK || this.DEFAULT_TOP_K;
    const finalDocuments = documents.slice(0, finalTopK);
    
    const retrievalTimeMs = Date.now() - startTime;
    
    this.monitoring.trackEvent('advanced-retrieval.complete', {
      tenantId: request.tenantId,
      techniquesUsed: techniquesUsed.join(','),
      initialCount: documents.length,
      finalCount: finalDocuments.length,
      retrievalTimeMs,
    });
    
    return {
      documents: finalDocuments,
      totalRetrieved: documents.length,
      retrievalTimeMs,
      techniquesUsed,
      metadata,
    };
  }

  /**
   * HyDE: Generate a hypothetical document that answers the query
   */
  private async generateHypotheticalDocument(
    query: string,
    model?: string
  ): Promise<string> {
    try {
      const prompt = `Given the following question, write a concise hypothetical document that would answer it. The document should be informative and directly address the question.

Question: ${query}

Hypothetical Document:`;

      const hypotheticalDoc = await this.azureOpenAI.complete(prompt, {
        deploymentName: model || 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 200,
      });
      
      this.monitoring.trackEvent('advanced-retrieval.hyde-generated', {
        queryLength: query.length,
        docLength: hypotheticalDoc.length,
      });
      
      return hypotheticalDoc;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'advanced-retrieval.hyde',
      });
      // Fallback to original query if HyDE fails
      return query;
    }
  }

  /**
   * Query Expansion: Expand query with related terms
   */
  private async expandQuery(
    query: string,
    _tenantId: string,
    model?: string
  ): Promise<{ expandedQuery: string; relatedTerms: string[] }> {
    try {
      const prompt = `Given the following search query, generate 3-5 related terms or synonyms that would help find relevant documents. Return only the terms, separated by commas.

Query: ${query}

Related terms:`;

      const response = await this.azureOpenAI.complete(prompt, {
        deploymentName: model || 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 100,
      });

      const relatedTerms = response
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 5);
      
      // Combine original query with expanded terms
      const expandedQuery = [query, ...relatedTerms].join(' ');
      
      this.monitoring.trackEvent('advanced-retrieval.query-expanded', {
        originalQuery: query,
        expandedTerms: relatedTerms.length,
      });
      
      return {
        expandedQuery,
        relatedTerms,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'advanced-retrieval.query-expansion',
      });
      // Fallback to original query if expansion fails
      return {
        expandedQuery: query,
        relatedTerms: [],
      };
    }
  }

  /**
   * Parent Document Retrieval: Retrieve parent documents from chunks
   */
  private async retrieveParentDocuments(
    chunks: RetrievedDocument[],
    tenantId: string,
    limit: number
  ): Promise<RetrievedDocument[]> {
    const parentShardIds = new Set<string>();
    
    // Extract parent shard IDs from chunk metadata
    for (const chunk of chunks) {
      // Check if chunk has parent reference in metadata
      const parentId = chunk.metadata?.parentShardId as string | undefined;
      if (parentId && parentId !== chunk.shardId) {
        parentShardIds.add(parentId);
      }
      
      // Also check if chunk is part of a larger document (via relationships)
      // This would require checking shard relationships
    }
    
    if (parentShardIds.size === 0) {
      return [];
    }
    
    // Retrieve parent shards
    const parentShards: Shard[] = [];
    const parentIdsArray = Array.from(parentShardIds).slice(0, limit);
    
    for (const parentId of parentIdsArray) {
      try {
        const shard = await this.shardRepository.findById(parentId, tenantId);
        if (shard) {
          parentShards.push(shard);
        }
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'advanced-retrieval.parent-document',
          shardId: parentId,
        });
      }
    }
    
    // Convert to RetrievedDocument format
    const parentDocuments: RetrievedDocument[] = parentShards.map(shard => {
      const data = shard.structuredData || {};
      const shardName = data.name || data.title || shard.shardTypeName || shard.id;
      
      return {
        shardId: shard.id,
        shardName,
        shardTypeId: shard.shardTypeId,
        content: this.extractShardContent(shard),
        score: 0.8, // Lower score for parent documents
        isParentDocument: true,
        originalChunkIds: chunks
          .filter(c => c.metadata?.parentShardId === shard.id)
          .map(c => c.shardId),
        metadata: {
          ...shard.structuredData,
          parentShardId: shard.id,
        },
      };
    });
    
    this.monitoring.trackEvent('advanced-retrieval.parent-documents-retrieved', {
      chunkCount: chunks.length,
      parentCount: parentDocuments.length,
    });
    
    return parentDocuments;
  }

  /**
   * Cross-Encoder Reranking: Rerank results using a cross-encoder model
   * Note: This is a simplified implementation. In production, you'd use a proper
   * cross-encoder library or API (e.g., sentence-transformers, Cohere rerank API)
   */
  private async rerankWithCrossEncoder(
    query: string,
    documents: RetrievedDocument[],
    model?: string
  ): Promise<RetrievedDocument[]> {
    try {
      // For now, we'll use a simple semantic similarity approach
      // In production, you'd use a proper cross-encoder model via API
      // or a local model like sentence-transformers
      
      // Generate query embedding
      const queryEmbedding = await this.embedText(query);
      
      // Score each document by semantic similarity
      const scoredDocs = await Promise.all(
        documents.map(async (doc) => {
          const docEmbedding = await this.embedText(doc.content);
          const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
          
          // Combine original score with cross-encoder similarity
          const rerankedScore = (doc.score * 0.3) + (similarity * 0.7);
          
          return {
            ...doc,
            score: rerankedScore,
            originalScore: doc.score,
            crossEncoderScore: similarity,
          };
        })
      );
      
      // Sort by reranked score
      scoredDocs.sort((a, b) => b.score - a.score);
      
      this.monitoring.trackEvent('advanced-retrieval.reranked', {
        documentCount: documents.length,
        model: model || this.DEFAULT_CROSS_ENCODER_MODEL,
      });
      
      return scoredDocs;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'advanced-retrieval.cross-encoder',
      });
      // Fallback to original order if reranking fails
      return documents;
    }
  }

  /**
   * Embed text using Azure OpenAI
   */
  private async embedText(
    text: string,
    model?: string
  ): Promise<number[]> {
    const response = await this.azureOpenAI.generateEmbedding({
      text,
      model,
    });
    return response.embedding;
  }

  /**
   * Extract content from a shard
   */
  private extractShardContent(shard: Shard): string {
    // Extract text from structured data
    if (shard.structuredData) {
      const textFields = Object.entries(shard.structuredData)
        .filter(([_, value]) => typeof value === 'string')
        .map(([_, value]) => value as string)
        .join(' ');
      
      if (textFields.length > 0) {
        return textFields;
      }
    }
    
    // Fallback to structured data name or shard ID
    const data = shard.structuredData || {};
    return data.name || data.title || shard.shardTypeName || shard.id;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }
    
    return dotProduct / denominator;
  }
}

