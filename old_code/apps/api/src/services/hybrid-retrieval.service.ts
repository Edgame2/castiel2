/**
 * Hybrid Retrieval Service
 * Combines vector similarity search with graph-based relationship traversal
 * Uses Reciprocal Rank Fusion (RRF) to merge results from multiple retrieval methods
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ShardRelationshipService,
} from '@castiel/api-core';

// ============================================
// Types
// ============================================

export interface RetrievalRequest {
  tenantId: string;
  query: string;
  queryEmbedding?: number[];
  
  // Focus shards (starting points for graph traversal)
  focusShardIds?: string[];
  
  // Retrieval configuration
  vectorWeight?: number;      // 0-1, default 0.5
  graphWeight?: number;       // 0-1, default 0.3
  keywordWeight?: number;     // 0-1, default 0.2
  
  // Limits
  topK?: number;              // Max results to return
  vectorTopK?: number;        // Max vector search results
  graphDepth?: number;        // Max relationship hops
  graphTopK?: number;         // Max graph results per hop
  
  // Filters
  shardTypeIds?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  
  // RRF parameter
  rrfK?: number;              // RRF constant, default 60
}

export interface RetrievedChunk {
  shardId: string;
  shardName: string;
  shardTypeId: string;
  content: string;
  
  // Scoring
  finalScore: number;
  vectorScore?: number;
  graphScore?: number;
  keywordScore?: number;
  rrfRank: number;
  
  // Source info
  retrievalSource: 'vector' | 'graph' | 'keyword' | 'hybrid';
  graphPath?: string[];       // Path from focus shard
  relationshipType?: string;
  
  // Metadata
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

// ============================================
// Service
// ============================================

export class HybridRetrievalService {
  private readonly DEFAULT_RRF_K = 60;
  private readonly DEFAULT_TOP_K = 20;
  private readonly DEFAULT_VECTOR_TOP_K = 50;
  private readonly DEFAULT_GRAPH_DEPTH = 2;
  private readonly DEFAULT_GRAPH_TOP_K = 10;

  constructor(
    private readonly shardRepository: ShardRepository,
    private readonly relationshipService: ShardRelationshipService,
    private readonly vectorSearch: {
      search: (tenantId: string, embedding: number[], options?: any) => Promise<any[]>;
    } | null,
    private readonly monitoring: IMonitoringProvider
  ) {}

  // ============================================
  // Main Retrieval Method
  // ============================================

  /**
   * Perform hybrid retrieval combining vector, graph, and keyword search
   */
  async retrieve(request: RetrievalRequest): Promise<RetrievalResult> {
    const startTime = Date.now();
    const rrfK = request.rrfK || this.DEFAULT_RRF_K;
    const topK = request.topK || this.DEFAULT_TOP_K;

    // Normalize weights
    const totalWeight = (request.vectorWeight || 0.5) + 
                       (request.graphWeight || 0.3) + 
                       (request.keywordWeight || 0.2);
    const vectorWeight = (request.vectorWeight || 0.5) / totalWeight;
    const graphWeight = (request.graphWeight || 0.3) / totalWeight;
    const keywordWeight = (request.keywordWeight || 0.2) / totalWeight;

    // Run retrievals in parallel
    const [vectorResults, graphResults, keywordResults] = await Promise.all([
      this.vectorRetrieval(request),
      this.graphRetrieval(request),
      this.keywordRetrieval(request),
    ]);

    // Apply RRF fusion
    const fusedResults = this.reciprocalRankFusion(
      [
        { results: vectorResults, weight: vectorWeight, source: 'vector' as const },
        { results: graphResults, weight: graphWeight, source: 'graph' as const },
        { results: keywordResults, weight: keywordWeight, source: 'keyword' as const },
      ],
      rrfK
    );

    // Take top K results
    const topResults = fusedResults.slice(0, topK);

    // Enrich with content
    const enrichedChunks = await this.enrichChunks(request.tenantId, topResults);

    const retrievalTimeMs = Date.now() - startTime;

    this.monitoring.trackEvent('hybrid-retrieval.complete', {
      tenantId: request.tenantId,
      vectorCount: vectorResults.length,
      graphCount: graphResults.length,
      keywordCount: keywordResults.length,
      resultCount: enrichedChunks.length,
      retrievalTimeMs,
    });

    return {
      chunks: enrichedChunks,
      totalCandidates: vectorResults.length + graphResults.length + keywordResults.length,
      retrievalTimeMs,
      sources: {
        vector: vectorResults.length,
        graph: graphResults.length,
        keyword: keywordResults.length,
      },
    };
  }

  // ============================================
  // Vector Retrieval
  // ============================================

  private async vectorRetrieval(request: RetrievalRequest): Promise<ScoredResult[]> {
    if (!this.vectorSearch || !request.queryEmbedding) {
      return [];
    }

    try {
      const results = await this.vectorSearch.search(
        request.tenantId,
        request.queryEmbedding,
        {
          topK: request.vectorTopK || this.DEFAULT_VECTOR_TOP_K,
          filter: {
            shardTypeIds: request.shardTypeIds,
            tags: request.tags,
          },
        }
      );

      return results.map((r: any, index: number) => ({
        shardId: r.id || r.shardId,
        score: r.score || r.similarity || 1 - (index * 0.01),
        source: 'vector' as const,
        metadata: r.metadata || {},
      }));
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'hybrid-retrieval.vector',
      });
      return [];
    }
  }

  // ============================================
  // Graph Retrieval
  // ============================================

  private async graphRetrieval(request: RetrievalRequest): Promise<ScoredResult[]> {
    if (!request.focusShardIds || request.focusShardIds.length === 0) {
      return [];
    }

    const maxDepth = request.graphDepth || this.DEFAULT_GRAPH_DEPTH;
    const topKPerHop = request.graphTopK || this.DEFAULT_GRAPH_TOP_K;
    const results: Map<string, GraphNode> = new Map();

    try {
      // BFS traversal from focus shards
      let currentLevel = request.focusShardIds.map((id) => ({
        shardId: id,
        depth: 0,
        path: [id],
        relationshipType: 'focus',
      }));

      for (let depth = 1; depth <= maxDepth; depth++) {
        const nextLevel: typeof currentLevel = [];

        for (const node of currentLevel) {
          // Get related shards
          const related = await this.relationshipService.getRelatedShards(
            request.tenantId,
            node.shardId,
            'both',
            {
              limit: topKPerHop,
            }
          );

          for (const rel of related) {
            const shard = rel.shard;
            if (!results.has(shard.id) && !request.focusShardIds.includes(shard.id)) {
              // Apply filters
              if (request.shardTypeIds && !request.shardTypeIds.includes(shard.shardTypeId)) {
                continue;
              }

              // Score based on depth and relationship strength
              const depthPenalty = 1 / (depth + 1);
              const score = depthPenalty * (rel.edge.weight || 1);

              const graphNode: GraphNode = {
                shardId: shard.id,
                shardName: (shard.structuredData as any)?.name || shard.id,
                shardTypeId: shard.shardTypeId,
                depth,
                path: [...node.path, shard.id],
                relationshipType: rel.edge.relationshipType || 'related',
                score,
              };

              results.set(shard.id, graphNode);
              nextLevel.push({
                shardId: shard.id,
                depth,
                path: graphNode.path,
                relationshipType: graphNode.relationshipType,
              });
            }
          }
        }

        currentLevel = nextLevel;
        if (currentLevel.length === 0) {break;}
      }

      // Convert to scored results
      return Array.from(results.values())
        .sort((a, b) => b.score - a.score)
        .map((node) => ({
          shardId: node.shardId,
          score: node.score,
          source: 'graph' as const,
          metadata: {
            depth: node.depth,
            path: node.path,
            relationshipType: node.relationshipType,
          },
        }));
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'hybrid-retrieval.graph',
      });
      return [];
    }
  }

  // ============================================
  // Keyword Retrieval
  // ============================================

  private async keywordRetrieval(request: RetrievalRequest): Promise<ScoredResult[]> {
    if (!request.query) {
      return [];
    }

    try {
      // Extract keywords from query
      const keywords = this.extractKeywords(request.query);
      if (keywords.length === 0) {return [];}

      // Search for shards matching keywords
      // This is a simplified implementation - in production, use full-text search
      const results = await this.shardRepository.list({
        filter: {
          tenantId: request.tenantId,
          shardTypeId: request.shardTypeIds?.[0], // Simplified filter
        },
        limit: 50,
      });

      const scored = results.shards
        .map((shard) => {
          const name = (shard.structuredData as any)?.name || '';
          const description = (shard.structuredData as any)?.description || '';
          const text = `${name} ${description} ${
            JSON.stringify(shard.structuredData || {})
          }`.toLowerCase();

          // Calculate keyword match score
          let matchCount = 0;
          for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
              matchCount++;
            }
          }

          const score = matchCount / keywords.length;
          return {
            shardId: shard.id,
            score,
            source: 'keyword' as const,
            metadata: { matchedKeywords: matchCount },
          };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

      return scored;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'hybrid-retrieval.keyword',
      });
      return [];
    }
  }

  // ============================================
  // Reciprocal Rank Fusion
  // ============================================

  private reciprocalRankFusion(
    rankedLists: Array<{
      results: ScoredResult[];
      weight: number;
      source: 'vector' | 'graph' | 'keyword';
    }>,
    k: number
  ): FusedResult[] {
    const scores = new Map<string, FusedResult>();

    for (const list of rankedLists) {
      // Sort by score descending to get ranks
      const sorted = [...list.results].sort((a, b) => b.score - a.score);

      for (let rank = 0; rank < sorted.length; rank++) {
        const item = sorted[rank];
        const rrfScore = list.weight / (k + rank + 1);

        if (!scores.has(item.shardId)) {
          scores.set(item.shardId, {
            shardId: item.shardId,
            finalScore: 0,
            vectorScore: undefined,
            graphScore: undefined,
            keywordScore: undefined,
            rrfRank: 0,
            sources: [],
            metadata: {},
          });
        }

        const existing = scores.get(item.shardId)!;
        existing.finalScore += rrfScore;
        existing.sources.push(list.source);

        // Track individual scores
        switch (list.source) {
          case 'vector':
            existing.vectorScore = item.score;
            break;
          case 'graph':
            existing.graphScore = item.score;
            existing.metadata = { ...existing.metadata, ...item.metadata };
            break;
          case 'keyword':
            existing.keywordScore = item.score;
            break;
        }
      }
    }

    // Sort by final RRF score
    const results = Array.from(scores.values()).sort(
      (a, b) => b.finalScore - a.finalScore
    );

    // Assign final ranks
    results.forEach((r, index) => {
      r.rrfRank = index + 1;
    });

    return results;
  }

  // ============================================
  // Enrichment
  // ============================================

  private async enrichChunks(
    tenantId: string,
    fusedResults: FusedResult[]
  ): Promise<RetrievedChunk[]> {
    const chunks: RetrievedChunk[] = [];

    for (const result of fusedResults) {
      try {
        const shard = await this.shardRepository.findById(result.shardId, tenantId);
        if (!shard) {continue;}

        // Build content from shard
        const content = this.buildContent(shard);

        // Determine retrieval source
        let source: 'vector' | 'graph' | 'keyword' | 'hybrid' = 'hybrid';
        if (result.sources.length === 1) {
          source = result.sources[0];
        }

        chunks.push({
          shardId: shard.id,
          shardName: (shard.structuredData as any)?.name || shard.id,
          shardTypeId: shard.shardTypeId,
          content,
          finalScore: result.finalScore,
          vectorScore: result.vectorScore,
          graphScore: result.graphScore,
          keywordScore: result.keywordScore,
          rrfRank: result.rrfRank,
          retrievalSource: source,
          graphPath: result.metadata?.path as string[] | undefined,
          relationshipType: result.metadata?.relationshipType as string | undefined,
          relevantFields: shard.structuredData as Record<string, unknown>,
        });
      } catch {
        // Skip shards that can't be enriched
      }
    }

    return chunks;
  }

  private buildContent(shard: any): string {
    const parts: string[] = [];

    // Add name
    parts.push(`# ${shard.name}`);

    // Add description
    if (shard.description) {
      parts.push(shard.description);
    }

    // Add structured data summary
    if (shard.structuredData && typeof shard.structuredData === 'object') {
      const data = shard.structuredData as Record<string, unknown>;
      const relevantFields = Object.entries(data)
        .filter(([key, value]) => {
          // Filter out internal fields and complex objects
          if (key.startsWith('_')) {return false;}
          if (typeof value === 'object' && value !== null) {return false;}
          return true;
        })
        .slice(0, 10); // Limit to 10 fields

      if (relevantFields.length > 0) {
        parts.push(
          '\n## Details',
          ...relevantFields.map(([key, value]) => `- **${key}**: ${value}`)
        );
      }
    }

    return parts.join('\n');
  }

  // ============================================
  // Helpers
  // ============================================

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once',
      'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
      'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
      'if', 'or', 'because', 'until', 'while', 'about', 'what', 'which',
      'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }
}

// ============================================
// Internal Types
// ============================================

interface ScoredResult {
  shardId: string;
  score: number;
  source: 'vector' | 'graph' | 'keyword';
  metadata?: Record<string, unknown>;
}

interface FusedResult {
  shardId: string;
  finalScore: number;
  vectorScore?: number;
  graphScore?: number;
  keywordScore?: number;
  rrfRank: number;
  sources: Array<'vector' | 'graph' | 'keyword'>;
  metadata: Record<string, unknown>;
}

// ============================================
// Factory
// ============================================

export function createHybridRetrievalService(
  shardRepository: ShardRepository,
  relationshipService: ShardRelationshipService,
  vectorSearch: { search: (tenantId: string, embedding: number[], options?: any) => Promise<any[]> } | null,
  monitoring: IMonitoringProvider
): HybridRetrievalService {
  return new HybridRetrievalService(
    shardRepository,
    relationshipService,
    vectorSearch,
    monitoring
  );
}











