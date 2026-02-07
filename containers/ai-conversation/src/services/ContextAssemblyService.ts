/**
 * Context Assembly Service
 * Intelligent context selection, topic extraction, clustering, and optimization
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ContextAssemblyRequest {
  query: string;
  projectId?: string;
  userId?: string;
  maxTokens?: number;
  minRelevance?: number;
  excludeSourceTypes?: string[];
  focusTopics?: string[];
  shardIds?: string[];
}

export interface AssembledContext {
  id: string;
  tenantId: string;
  query: string;
  sources: ContextSource[];
  topics: ExtractedTopic[];
  clusters: TopicCluster[];
  qualityScore: number;
  qualityLevel: 'high' | 'medium' | 'low';
  tokenCount: number;
  createdAt: Date | string;
}

export interface ContextSource {
  id: string;
  shardId: string;
  shardTypeId: string;
  shardName: string;
  content: string;
  relevanceScore: number;
  tokenCount: number;
}

export interface ExtractedTopic {
  id: string;
  text: string;
  category: string;
  relevance: number;
}

export interface TopicCluster {
  id: string;
  topics: string[];
  label: string;
  relevance: number;
}

export class ContextAssemblyService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private embeddingsClient: ServiceClient;
  private contextServiceClient: ServiceClient;
  private aiServiceClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.contextServiceClient = new ServiceClient({
      baseURL: this.config.services.context_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'ai-conversation',
      serviceName: 'ai-conversation',
      tenantId,
    });
  }

  /**
   * Assemble context for a query
   */
  async assembleContext(tenantId: string, request: ContextAssemblyRequest): Promise<AssembledContext> {
    try {
      log.info('Assembling context', {
        tenantId,
        query: request.query,
        service: 'ai-conversation',
      });

      // 1. Extract topics from query
      const topics = await this.extractTopics(tenantId, request.query);

      // 2. Expand query for better retrieval
      const expandedQuery = await this.expandQuery(tenantId, request.query);

      // 3. Retrieve relevant sources via context-service
      const sources = await this.retrieveRelevantSources(tenantId, request, expandedQuery);

      // 4. Extract topics from sources
      const sourceTopics = await this.extractTopicsFromSources(tenantId, sources);

      // 5. Cluster topics
      const clusters = await this.clusterTopics([...topics, ...sourceTopics], request.focusTopics);

      // 6. Rank sources
      const rankedSources = await this.rankSources(sources, [...topics, ...sourceTopics], clusters, request.maxTokens || 4000);

      // 7. Calculate quality metrics
      const qualityScore = this.calculateQualityScore(rankedSources, topics);
      const qualityLevel = this.determineQualityLevel(qualityScore);

      // 8. Build assembled context
      const context: AssembledContext = {
        id: uuidv4(),
        tenantId,
        query: request.query,
        sources: rankedSources,
        topics: [...topics, ...sourceTopics],
        clusters,
        qualityScore,
        qualityLevel,
        tokenCount: rankedSources.reduce((sum, s) => sum + s.tokenCount, 0),
        createdAt: new Date(),
      };

      // Store context
      const container = getContainer('conversation_contexts');
      await container.items.create(context, { partitionKey: tenantId } as any);

      return context;
    } catch (error: any) {
      log.error('Failed to assemble context', error, {
        tenantId,
        query: request.query,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Extract topics from text
   */
  private async extractTopics(tenantId: string, text: string): Promise<ExtractedTopic[]> {
    try {
      const token = this.getServiceToken(tenantId);
      
      // Use embeddings service to get text embedding
      const embeddingResponse = await this.embeddingsClient.post<any>(
        '/api/v1/embeddings',
        {
          text,
          model: 'text-embedding-ada-002',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!embeddingResponse.embedding) {
        return [];
      }

      // Extract key phrases from text (simple keyword extraction)
      const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const wordFreq = new Map<string, number>();
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });

      // Get top keywords as topics
      const sortedWords = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return sortedWords.map(([word, frequency], index) => ({
        id: uuidv4(),
        text: word,
        category: 'keyword',
        relevance: frequency / words.length,
      }));
    } catch (error: any) {
      log.warn('Topic extraction failed', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Expand query with synonyms and related terms
   */
  private async expandQuery(tenantId: string, query: string): Promise<string> {
    try {
      // Simple query expansion: add common synonyms and related terms
      const synonyms: Record<string, string[]> = {
        'how': ['what', 'why', 'when', 'where'],
        'create': ['make', 'build', 'generate', 'produce'],
        'update': ['modify', 'change', 'edit', 'alter'],
        'delete': ['remove', 'erase', 'clear'],
        'get': ['fetch', 'retrieve', 'obtain', 'find'],
      };

      const words = query.toLowerCase().split(/\s+/);
      const expandedWords = new Set(words);

      for (const word of words) {
        if (synonyms[word]) {
          synonyms[word].forEach(syn => expandedWords.add(syn));
        }
      }

      // Return original query with expanded terms appended
      const expandedTerms = Array.from(expandedWords).slice(words.length).join(' ');
      return expandedTerms ? `${query} ${expandedTerms}` : query;
    } catch (error: any) {
      log.warn('Query expansion failed', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
      return query;
    }
  }

  /**
   * Retrieve relevant sources
   */
  private async retrieveRelevantSources(
    tenantId: string,
    request: ContextAssemblyRequest,
    expandedQuery: string
  ): Promise<ContextSource[]> {
    try {
      const token = this.getServiceToken(tenantId);
      
      // Call context-service API for source retrieval
      const response = await this.contextServiceClient.post<any>(
        '/api/v1/context/assemble',
        {
          query: expandedQuery,
          shardIds: request.shardIds || [],
          maxTokens: request.maxTokens || 4000,
          focusTopics: request.focusTopics || [],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (response.sources && Array.isArray(response.sources)) {
        return response.sources.map((source: any) => ({
          id: source.id || uuidv4(),
          shardId: source.shardId,
          shardTypeId: source.shardTypeId || source.shardType || '',
          shardName: source.shardName || source.shardId,
          content: source.content || '',
          tokenCount: source.tokenCount || 0,
          relevanceScore: source.relevanceScore || 0.5,
        }));
      }

      // Fallback: query shard-manager directly if context-service unavailable
      if (request.shardIds && request.shardIds.length > 0) {
        const sources: ContextSource[] = [];
        for (const shardId of request.shardIds.slice(0, 10)) {
          try {
            const shardResponse = await this.shardManagerClient.get<any>(
              `/api/v1/shards/${shardId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Tenant-ID': tenantId,
                },
              }
            );

            if (shardResponse) {
              const content = JSON.stringify(shardResponse.structuredData || {});
              sources.push({
                id: uuidv4(),
                shardId,
                shardTypeId: shardResponse.shardTypeId || shardResponse.shardType || 'unknown',
                shardName: shardResponse.name || shardId,
                content,
                tokenCount: Math.ceil(content.length / 4), // Rough token estimate
                relevanceScore: 0.7,
              });
            }
          } catch (error) {
            // Skip failed shards
            continue;
          }
        }
        return sources;
      }

      return [];
    } catch (error: any) {
      log.warn('Source retrieval failed', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Extract topics from sources
   */
  private async extractTopicsFromSources(tenantId: string, sources: ContextSource[]): Promise<ExtractedTopic[]> {
    try {
      const topics: ExtractedTopic[] = [];
      const topicMap = new Map<string, number>();

      // Extract keywords from source content
      for (const source of sources) {
        const words = (source.content || '').toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 4 && !['the', 'that', 'this', 'with', 'from'].includes(w));

        words.forEach(word => {
          topicMap.set(word, (topicMap.get(word) || 0) + 1);
        });
      }

      // Convert to ExtractedTopic array
      const sortedTopics = Array.from(topicMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      for (const [text, frequency] of sortedTopics) {
        topics.push({
          id: uuidv4(),
          text,
          category: 'extracted',
          relevance: frequency / sources.length,
        });
      }

      return topics;
    } catch (error: any) {
      log.warn('Topic extraction from sources failed', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Cluster related topics
   */
  private async clusterTopics(topics: ExtractedTopic[], focusTopics?: string[]): Promise<TopicCluster[]> {
    try {
      const clusters: TopicCluster[] = [];
      const focusSet = new Set((focusTopics || []).map(t => t.toLowerCase()));

      // Group topics by category
      const categoryMap = new Map<string, ExtractedTopic[]>();
      topics.forEach(topic => {
        const category = topic.category || 'general';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(topic);
      });

      // Create clusters from categories
      for (const [category, categoryTopics] of categoryMap.entries()) {
        const isFocused = categoryTopics.some(t => focusSet.has(t.text.toLowerCase()));
        clusters.push({
          id: uuidv4(),
          label: category,
          topics: categoryTopics.map(t => t.text),
          relevance: isFocused ? 0.9 : 0.6,
        });
      }

      // If no categories, create a single cluster
      if (clusters.length === 0 && topics.length > 0) {
        clusters.push({
          id: uuidv4(),
          label: 'general',
          topics: topics.map(t => t.text),
          relevance: 0.5,
        });
      }

      return clusters.sort((a, b) => b.relevance - a.relevance);
    } catch (error: any) {
      log.warn('Topic clustering failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Rank sources by relevance
   */
  private async rankSources(
    sources: ContextSource[],
    topics: ExtractedTopic[],
    clusters: TopicCluster[],
    maxTokens: number
  ): Promise<ContextSource[]> {
    // Boost relevance based on topic matches
    const topicTexts = new Set(topics.map(t => t.text.toLowerCase()));
    const ranked = sources.map(source => {
      const contentLower = source.content.toLowerCase();
      const topicMatches = Array.from(topicTexts).filter(topic => contentLower.includes(topic)).length;
      const boostedScore = source.relevanceScore + (topicMatches * 0.1);
      return { ...source, relevanceScore: Math.min(1, boostedScore) };
    });

    // Sort by relevance score and limit by token count
    return ranked
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .reduce((acc, source) => {
        const currentTokens = acc.reduce((sum, s) => sum + s.tokenCount, 0);
        if (currentTokens + source.tokenCount <= maxTokens) {
          acc.push(source);
        }
        return acc;
      }, [] as ContextSource[]);
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(sources: ContextSource[], topics: ExtractedTopic[]): number {
    if (sources.length === 0) return 0;
    const avgRelevance = sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;
    const topicCoverage = Math.min(topics.length / 5, 1); // Normalize to 0-1
    return (avgRelevance * 0.7 + topicCoverage * 0.3) * 100;
  }

  /**
   * Determine quality level
   */
  private determineQualityLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
}
