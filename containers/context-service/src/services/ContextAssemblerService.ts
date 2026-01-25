/**
 * Context Assembler Service
 * Handles dynamic context assembly with token budgeting, compression, topic extraction, and quality scoring
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { ServiceClient, generateServiceToken } from '@coder/shared';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContextService } from './ContextService';
import { loadConfig } from '../config';
import { log } from '@coder/shared/utils/logger';
import { FastifyInstance } from 'fastify';
import {
  ContextAssembly,
  ContextAssemblyRequest,
  AssembleContextInput,
  ContextType,
  ContextScope,
} from '../types/context.types';
import {
  ContextAssemblyRequest as AIContextAssemblyRequest,
  ContextAssemblyResponse,
  AssembledContext,
  ExtractedTopic,
  TopicCluster,
  ContextSourceItem,
  ContextSourceType,
  ContextQualityLevel,
  TopicExtractionRequest,
  TopicExtractionResponse,
  ExpandedQuery,
  TopicCategory,
} from '../types/ai-context.types';

export class ContextAssemblerService {
  private containerName = 'context_assemblies';
  private contextService: ContextService;
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private searchServiceClient: ServiceClient;
  private embeddingsClient: ServiceClient;
  private aiServiceClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(contextService: ContextService, app?: FastifyInstance) {
    this.contextService = contextService;
    this.app = app || null;
    this.config = loadConfig();

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.searchServiceClient = new ServiceClient({
      baseURL: this.config.services.search_service?.url || '',
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

    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'context-service',
      serviceName: 'context-service',
      tenantId,
    });
  }

  /**
   * Assemble context for a task
   */
  async assemble(
    input: AssembleContextInput,
    tenantId: string,
    userId: string
  ): Promise<ContextAssembly> {
    if (!input.task || !input.scope) {
      throw new BadRequestError('task and scope are required');
    }

    const maxTokens = input.maxTokens || 100000; // Default token budget
    const maxFiles = input.maxFiles || 50;
    const relevanceThreshold = input.relevanceThreshold || 0.3;

    // Get relevant contexts
    const contexts = await this.findRelevantContexts(
      input,
      tenantId,
      maxFiles,
      relevanceThreshold
    );

    // Score and rank contexts
    const scoredContexts = await this.scoreContexts(contexts, input.task, tenantId);

    // Select contexts within token budget
    const selectedContexts = this.selectContexts(
      scoredContexts,
      maxTokens,
      input.compression
    );

    // Create assembly record
    const assembly: ContextAssembly = {
      id: uuidv4(),
      tenantId,
      requestId: uuidv4(), // In a real implementation, this would track the request
      contexts: selectedContexts.map((ctx) => ({
        contextId: ctx.id,
        type: ctx.type,
        path: ctx.path,
        name: ctx.name,
        relevanceScore: ctx.relevanceScore || 0,
        tokenCount: ctx.tokenCount || 0,
        snippet: this.extractSnippet(ctx.content),
      })),
      totalTokens: selectedContexts.reduce((sum, ctx) => sum + (ctx.tokenCount || 0), 0),
      assembledAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour cache
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(assembly, {
        partitionKey: tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create context assembly');
      }

      return resource as ContextAssembly;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Find relevant contexts
   */
  private async findRelevantContexts(
    input: AssembleContextInput,
    tenantId: string,
    maxFiles: number,
    relevanceThreshold: number
  ): Promise<any[]> {
    const filters: any = {
      scope: input.scope,
      limit: maxFiles,
    };

    if (input.includeTypes && input.includeTypes.length > 0) {
      // Filter by type if specified
      // In a real implementation, we'd query by type
    }

    if (input.targetPath) {
      filters.path = input.targetPath;
    }

    const { items } = await this.contextService.list(tenantId, filters);

    // Include dependencies if requested
    if (input.includeDependencies) {
      const contextsWithDeps = await Promise.all(
        items.map(async (ctx) => {
          if (ctx.dependencies && ctx.dependencies.length > 0) {
            const deps = await Promise.all(
              ctx.dependencies.map((depId) =>
                this.contextService.getById(depId, tenantId).catch(() => null)
              )
            );
            return [...items, ...deps.filter(Boolean)];
          }
          return items;
        })
      );
      return contextsWithDeps.flat();
    }

    return items;
  }

  /**
   * Score contexts for relevance
   */
  private async scoreContexts(
    contexts: any[],
    task: string,
    tenantId: string
  ): Promise<Array<any & { relevanceScore: number }>> {
    // Placeholder scoring logic
    // In a real implementation, this would use embeddings and semantic similarity
    return contexts.map((ctx) => ({
      ...ctx,
      relevanceScore: this.calculateRelevanceScore(ctx, task),
    }));
  }

  /**
   * Calculate relevance score (placeholder)
   */
  private calculateRelevanceScore(context: any, task: string): number {
    // Placeholder: simple keyword matching
    const taskLower = task.toLowerCase();
    const contextName = (context.name || '').toLowerCase();
    const contextPath = (context.path || '').toLowerCase();

    let score = 0.5; // Base score

    if (contextName.includes(taskLower) || taskLower.includes(contextName)) {
      score += 0.3;
    }

    if (contextPath.includes(taskLower) || taskLower.includes(contextPath)) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Select contexts within token budget
   */
  private selectContexts(
    scoredContexts: Array<any & { relevanceScore: number }>,
    maxTokens: number,
    compression?: boolean
  ): any[] {
    // Sort by relevance score (descending)
    const sorted = scoredContexts.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const selected: any[] = [];
    let totalTokens = 0;

    for (const ctx of sorted) {
      const ctxTokens = ctx.tokenCount || 0;
      if (totalTokens + ctxTokens <= maxTokens) {
        selected.push(ctx);
        totalTokens += ctxTokens;
      } else {
        // Try to fit compressed version if compression is enabled
        if (compression && ctxTokens > 0) {
          const compressedTokens = Math.floor(ctxTokens * 0.5); // 50% compression
          if (totalTokens + compressedTokens <= maxTokens) {
            selected.push({
              ...ctx,
              tokenCount: compressedTokens,
              compressed: true,
            });
            totalTokens += compressedTokens;
          }
        }
      }
    }

    return selected;
  }

  /**
   * Extract relevant snippet from content
   */
  private extractSnippet(content?: string, maxLength: number = 500): string | undefined {
    if (!content) return undefined;

    if (content.length <= maxLength) {
      return content;
    }

    // Extract first and last parts
    const start = content.substring(0, maxLength / 2);
    const end = content.substring(content.length - maxLength / 2);
    return `${start}...${end}`;
  }

  /**
   * Get assembly by ID
   */
  async getById(assemblyId: string, tenantId: string): Promise<ContextAssembly> {
    if (!assemblyId || !tenantId) {
      throw new BadRequestError('assemblyId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(assemblyId, tenantId).read<ContextAssembly>();

      if (!resource) {
        throw new NotFoundError(`Context assembly ${assemblyId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Context assembly ${assemblyId} not found`);
      }
      throw error;
    }
  }

  /**
   * Assemble context for AI query (enhanced version with topic extraction)
   */
  async assembleContextForAI(
    tenantId: string,
    request: AIContextAssemblyRequest
  ): Promise<ContextAssemblyResponse> {
    const startTime = Date.now();
    const warnings: ContextAssemblyWarning[] = [];

    try {
      // 1. Extract topics from query
      const queryTopics = await this.extractTopics(tenantId, {
        content: request.query,
        maxTopics: 5,
        minRelevance: 0.4,
      });

      // 2. Expand query
      const expandedQuery = await this.expandQuery(tenantId, request.query);

      // 3. Retrieve relevant sources
      const sources = await this.retrieveRelevantSources(
        tenantId,
        request,
        expandedQuery,
        request.maxTokens || 4000,
        request.minRelevance ?? 0.5
      );

      // 4. Extract topics from sources
      const sourceTopics = await this.extractTopicsFromSources(tenantId, sources);

      // 5. Cluster topics
      const clusters = await this.clusterTopics(
        [...queryTopics, ...sourceTopics],
        request.focusTopics
      );

      // 6. Rank and select sources
      const rankedSources = await this.rankSources(
        sources,
        [...queryTopics, ...sourceTopics],
        clusters,
        request.maxTokens || 4000
      );

      // 7. Calculate quality metrics
      const qualityScore = this.calculateQualityScore(rankedSources, queryTopics);
      const qualityLevel = this.determineQualityLevel(qualityScore);

      // 8. Build assembled context
      const context: AssembledContext = {
        id: uuidv4(),
        tenantId,
        projectId: request.projectId,
        userId: request.userId,
        query: request.query,
        queryTopics,
        sources: rankedSources,
        clusters,
        selectedShards: rankedSources
          .filter((s) => s.sourceType === ContextSourceType.SHARD)
          .map((s) => s.sourceId),
        selectedActivities: rankedSources
          .filter((s) => s.sourceType === ContextSourceType.ACTIVITY_LOG)
          .map((s) => s.sourceId),
        summary: this.generateSummary(rankedSources, queryTopics),
        contextLength: rankedSources.reduce((sum, s) => sum + s.estimatedTokens, 0),
        contextLengthPercentage:
          (rankedSources.reduce((sum, s) => sum + s.estimatedTokens, 0) /
            (request.maxTokens || 4000)) *
          100,
        qualityLevel,
        relevanceScore: qualityScore,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1800000), // 30 minutes
      };

      // Store context
      const container = getContainer(this.containerName);
      await container.items.create(context, { partitionKey: tenantId });

      return {
        context,
        executionTimeMs: Date.now() - startTime,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      log.error('Failed to assemble context for AI', error, {
        service: 'context-service',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Extract topics from text
   */
  async extractTopics(
    tenantId: string,
    request: TopicExtractionRequest
  ): Promise<ExtractedTopic[]> {
    try {
      // Simple keyword extraction (can be enhanced with AI service)
      const keywords = this.extractKeywords(request.content, request.maxTopics || 10);
      const topics: ExtractedTopic[] = keywords.map((keyword, index) => ({
        id: uuidv4(),
        name: keyword,
        category: this.categorizeTopic(keyword),
        keywords: [keyword],
        relevanceScore: 1.0 - index * 0.1,
        frequency: this.countKeywordFrequency(request.content, keyword),
      }));

      return topics.filter((t) => t.relevanceScore >= (request.minRelevance ?? 0.3));
    } catch (error: any) {
      log.error('Failed to extract topics', error, { service: 'context-service' });
      return [];
    }
  }

  /**
   * Extract topics from sources
   */
  private async extractTopicsFromSources(
    tenantId: string,
    sources: ContextSourceItem[]
  ): Promise<ExtractedTopic[]> {
    const allTopics: ExtractedTopic[] = [];

    for (const source of sources) {
      const topics = await this.extractTopics(tenantId, {
        content: source.content,
        maxTopics: 3,
        minRelevance: 0.3,
      });
      allTopics.push(...topics);
    }

    // Deduplicate and merge
    const topicMap = new Map<string, ExtractedTopic>();
    for (const topic of allTopics) {
      const existing = topicMap.get(topic.name.toLowerCase());
      if (existing) {
        existing.frequency += topic.frequency;
        existing.relevanceScore = Math.max(existing.relevanceScore, topic.relevanceScore);
      } else {
        topicMap.set(topic.name.toLowerCase(), topic);
      }
    }

    return Array.from(topicMap.values());
  }

  /**
   * Expand query with synonyms and related terms
   */
  private async expandQuery(tenantId: string, query: string): Promise<ExpandedQuery> {
    try {
      const terms = query.split(/\s+/).filter((t) => t.length > 2);
      const synonyms: string[] = [];
      const relatedTerms: string[] = [];

      // Simple expansion (can be enhanced with AI service)
      for (const term of terms) {
        synonyms.push(...this.generateSynonyms(term));
        relatedTerms.push(...this.generateRelatedTerms(term));
      }

      const expandedQuery = [query, ...synonyms, ...relatedTerms].join(' ');

      return {
        original: query,
        expanded: expandedQuery,
        synonyms: [...new Set(synonyms)],
        relatedTerms: [...new Set(relatedTerms)],
        entities: this.extractEntities(query),
      };
    } catch (error: any) {
      log.error('Failed to expand query', error, { service: 'context-service' });
      return {
        original: query,
        expanded: query,
        synonyms: [],
        relatedTerms: [],
        entities: [],
      };
    }
  }

  /**
   * Retrieve relevant sources
   */
  private async retrieveRelevantSources(
    tenantId: string,
    request: AIContextAssemblyRequest,
    expandedQuery: ExpandedQuery,
    maxTokens: number,
    minRelevance: number
  ): Promise<ContextSourceItem[]> {
    const sources: ContextSourceItem[] = [];
    let tokenCount = 0;

    try {
      const token = this.getServiceToken(tenantId);

      // Vector search for relevant shards
      if (!request.excludeSourceTypes?.includes(ContextSourceType.SHARD)) {
        const searchResponse = await this.searchServiceClient.post<any>(
          '/api/v1/search/vector',
          {
            query: expandedQuery.expanded,
            tenantId,
            projectId: request.projectId,
            limit: request.maxSourcesPerType || 10,
            minScore: minRelevance,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        for (const result of searchResponse.results || []) {
          const tokens = Math.ceil((result.content?.length || 0) / 4);
          if (tokenCount + tokens <= maxTokens) {
            sources.push({
              id: uuidv4(),
              sourceType: ContextSourceType.SHARD,
              sourceId: result.shardId || result.id,
              sourceName: result.name || result.shardId || result.id,
              content: result.content || result.name || '',
              relevanceScore: result.score || 0.5,
              estimatedTokens: tokens,
              createdAt: new Date(),
            });
            tokenCount += tokens;
          }
        }
      }
    } catch (error: any) {
      log.warn('Failed to retrieve sources from search service', error, {
        service: 'context-service',
      });
    }

    return sources;
  }

  /**
   * Cluster topics
   */
  private async clusterTopics(
    topics: ExtractedTopic[],
    focusTopics?: string[]
  ): Promise<TopicCluster[]> {
    // Simple clustering by category
    const clustersByCategory = new Map<TopicCategory, ExtractedTopic[]>();

    for (const topic of topics) {
      const existing = clustersByCategory.get(topic.category) || [];
      existing.push(topic);
      clustersByCategory.set(topic.category, existing);
    }

    const clusters: TopicCluster[] = [];
    for (const [category, clusterTopics] of clustersByCategory.entries()) {
      clusters.push({
        id: uuidv4(),
        name: `${category} Topics`,
        topics: clusterTopics,
        coherenceScore: 0.7,
        summary: `Topics related to ${category.toLowerCase()}`,
      });
    }

    return clusters;
  }

  /**
   * Rank sources by relevance
   */
  private async rankSources(
    sources: ContextSourceItem[],
    topics: ExtractedTopic[],
    clusters: TopicCluster[],
    maxTokens: number
  ): Promise<ContextSourceItem[]> {
    // Sort by relevance score
    const ranked = sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Select within token budget
    const selected: ContextSourceItem[] = [];
    let totalTokens = 0;

    for (const source of ranked) {
      if (totalTokens + source.estimatedTokens <= maxTokens) {
        selected.push(source);
        totalTokens += source.estimatedTokens;
      }
    }

    return selected;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(
    sources: ContextSourceItem[],
    topics: ExtractedTopic[]
  ): number {
    if (sources.length === 0) {
      return 0;
    }

    const avgRelevance =
      sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;
    const topicCoverage = Math.min(1.0, sources.length / Math.max(1, topics.length));

    return (avgRelevance * 0.7 + topicCoverage * 0.3);
  }

  /**
   * Determine quality level
   */
  private determineQualityLevel(score: number): ContextQualityLevel {
    if (score >= 0.8) return ContextQualityLevel.HIGH;
    if (score >= 0.5) return ContextQualityLevel.MEDIUM;
    if (score >= 0.2) return ContextQualityLevel.LOW;
    return ContextQualityLevel.MINIMAL;
  }

  /**
   * Generate summary
   */
  private generateSummary(sources: ContextSourceItem[], topics: ExtractedTopic[]): string {
    const topTopics = topics.slice(0, 3).map((t) => t.name).join(', ');
    return `Context assembled from ${sources.length} sources covering: ${topTopics}`;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string, maxKeywords: number): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Categorize topic
   */
  private categorizeTopic(keyword: string): TopicCategory {
    const lower = keyword.toLowerCase();
    if (lower.includes('code') || lower.includes('function') || lower.includes('class')) {
      return TopicCategory.TECHNICAL;
    }
    if (lower.includes('business') || lower.includes('revenue') || lower.includes('customer')) {
      return TopicCategory.BUSINESS;
    }
    if (lower.includes('process') || lower.includes('workflow')) {
      return TopicCategory.PROCESS;
    }
    return TopicCategory.OTHER;
  }

  /**
   * Count keyword frequency
   */
  private countKeywordFrequency(text: string, keyword: string): number {
    const regex = new RegExp(keyword, 'gi');
    return (text.match(regex) || []).length;
  }

  /**
   * Generate synonyms (placeholder)
   */
  private generateSynonyms(term: string): string[] {
    // Placeholder - would use thesaurus/NLP service
    return [];
  }

  /**
   * Generate related terms (placeholder)
   */
  private generateRelatedTerms(term: string): string[] {
    // Placeholder - would use NLP service
    return [];
  }

  /**
   * Extract entities (placeholder)
   */
  private extractEntities(text: string): string[] {
    // Placeholder - would use NER service
    return [];
  }
}

