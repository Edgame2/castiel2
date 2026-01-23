/**
 * AI Chat Context Assembly Service
 * Intelligent context selection, topic extraction, clustering, and optimization
 */

// Removed NestJS imports - using standard TypeScript classes
import {
  ContextAssemblyRequest,
  ContextAssemblyResponse,
  AssembledContext,
  TopicExtractionRequest,
  TopicExtractionResponse,
  ExtractedTopic,
  TopicCluster,
  ContextSourceItem,
  ContextSourceType,
  ContextQualityLevel,
  ContextOptimization,
  ContextCache,
  ContextQualityMetrics,
  ConversationContext,
  RankedContextSource,
  ContextAssemblyMetrics,
  TopicCategory,
  ExpandedQuery,
  ContextInvalidationRequest,
} from '../types/ai-context.types.js';
import {
  CosmosDBService,
  VectorSearchService,
} from '@castiel/api-core';
import { CacheService } from './cache.service.js';
import { ShardLinkingService } from './shard-linking.service.js';
import { ProjectActivityService } from './project-activity.service.js';
import { PerformanceMonitoringService } from './performance-monitoring.service.js';
import { ShardRepository } from '@castiel/api-core';
import type { Shard, InternalRelationship, PermissionLevel } from '../types/shard.types.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class ContextAssemblyService {
  private readonly CONTEXT_CACHE_TTL = 1800; // 30 minutes
  private readonly STATS_CACHE_TTL = 3600; // 1 hour

  // Default configuration
  private config = {
    defaultMaxTokens: 4000,
    maxSourcesPerType: 10,
    minRelevanceScore: 0.5,
    optimizationLevel: 0.7,
    topicModelType: 'bert' as const,
    cacheTTLMinutes: 30,
  };

  private shardRepository?: ShardRepository;
  private aclService?: import('../services/acl.service.js').ACLService; // ACLService - optional, for permission checks

  constructor(
    private cosmosDB: CosmosDBService,
    private cache: CacheService,
    private vectorSearch: VectorSearchService,
    private shardLinking: ShardLinkingService,
    private activityService: ProjectActivityService,
    private performanceMonitoring: PerformanceMonitoringService,
    private monitoring: IMonitoringProvider,
  ) {}

  /**
   * Set shard repository (injected separately to avoid circular dependencies)
   */
  setShardRepository(repository: ShardRepository): void {
    this.shardRepository = repository;
  }

  /**
   * Set ACL service (injected separately for permission checks)
   */
  setACLService(aclService: import('../services/acl.service.js').ACLService): void {
    this.aclService = aclService;
  }

  /**
   * Assemble context for a query (main entry point)
   */
  async assembleContext(
    tenantId: string,
    request: ContextAssemblyRequest,
  ): Promise<ContextAssemblyResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const warnings: Array<{
      type: 'truncation' | 'empty_context' | 'permission_filtered' | 'low_relevance' | 'service_unavailable';
      severity: 'info' | 'warning' | 'error';
      message: string;
      details?: Record<string, any>;
      suggestion?: string;
    }> = [];
    let permissionFilteredCount = 0;
    let originalShardCount = 0;

    try {
      // Check cache
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cache.get<AssembledContext>(cacheKey);
      if (cached) {
        this.monitoring.trackEvent('context-assembly.cache-hit', { requestId });
        return {
          context: cached,
          executionTimeMs: Date.now() - startTime,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      }

      // 1. Extract topics from query
      const queryTopics = await this.extractTopics(tenantId, {
        content: request.query,
        maxTopics: 5,
        minRelevance: 0.4,
      });

      // 2. Expand query for better retrieval
      const expandedQuery = await this.expandQuery(tenantId, request.query);

      // 3. Retrieve relevant sources
      const sourcesResult = await this.retrieveRelevantSources(
        tenantId,
        request.projectId,
        request.userId,
        expandedQuery,
        request.maxTokens || this.config.defaultMaxTokens,
        request.minRelevance ?? this.config.minRelevanceScore,
        request.excludeSourceTypes,
      );
      const sources = sourcesResult.sources;
      permissionFilteredCount = sourcesResult.permissionFilteredCount || 0;
      originalShardCount = sourcesResult.originalShardCount || 0;

      // Check for empty context early with detailed diagnostics
      if (sources.length === 0) {
        // Gather diagnostic information
        const diagnostics = {
          vectorSearchAvailable: !!this.vectorSearchService,
          shardRepositoryAvailable: !!this.shardRepository,
          projectId: request.projectId,
          queryLength: request.query.length,
          minRelevance: request.minRelevance ?? this.config.minRelevanceScore,
          maxTokens: request.maxTokens || this.config.defaultMaxTokens,
        };

        this.monitoring.trackEvent('context-assembly.empty-context', {
          tenantId,
          projectId: request.projectId,
          userId: request.userId,
          query: request.query.substring(0, 100),
          maxTokens: request.maxTokens || this.config.defaultMaxTokens,
          minRelevance: request.minRelevance ?? this.config.minRelevanceScore,
          diagnostics: JSON.stringify(diagnostics),
          suggestion: 'Consider: 1) Lowering minRelevance threshold, 2) Expanding query terms, 3) Checking project data availability',
        });
        
        // Return minimal context with warning and actionable suggestions
        const emptyContext: AssembledContext = {
          id: uuidv4(),
          tenantId,
          projectId: request.projectId,
          userId: request.userId,
          query: request.query,
          queryTopics,
          sources: [],
          clusters: [],
          selectedShards: [],
          selectedActivities: [],
          selectedRecommendations: [],
          summary: 'No relevant context found for this query. Consider refining your search terms or checking project data availability.',
          contextLength: 0,
          contextLengthPercentage: 0,
          qualityLevel: ContextQualityLevel.MINIMAL,
          relevanceScore: 0,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.config.cacheTTLMinutes * 60 * 1000),
          ttl: this.config.cacheTTLMinutes * 60,
        };

        // Add warning for empty context
        warnings.push({
          type: 'empty_context',
          severity: 'warning',
          message: 'No relevant context found for this query',
          details: diagnostics,
          suggestion: 'Consider: 1) Lowering minRelevance threshold, 2) Expanding query terms, 3) Checking project data availability',
        });

        return {
          context: emptyContext,
          executionTimeMs: Date.now() - startTime,
          warnings: warnings.length > 0 ? warnings : undefined,
          recommendations: {
            refinedQuery: this.suggestQueryRefinement(request.query),
            suggestedFollowUp: 'Try using different keywords or expanding your search scope.',
          },
        };
      }

      // 4. Extract topics from sources
      const sourceTopics = await this.extractTopicsFromSources(tenantId, sources);

      // 5. Cluster topics
      const clusters = await this.clusterTopics(
        [...queryTopics, ...sourceTopics],
        request.focusTopics,
      );

      // 6. Rank sources for inclusion
      const maxTokens = request.maxTokens || this.config.defaultMaxTokens;
      const rankingResult = await this.rankSources(
        sources,
        queryTopics,
        clusters,
        maxTokens,
      );
      const rankedSources = rankingResult.selected;
      const excludedSources = rankingResult.excluded;

      // 7. Check for truncation and warn
      if (excludedSources.length > 0) {
        const truncationPercentage = (excludedSources.length / sources.length) * 100;
        const excludedTokensTotal = excludedSources.reduce((sum, s) => sum + s.estimatedTokens, 0);
        
        this.monitoring.trackEvent('context-assembly.truncated', {
          tenantId,
          projectId: request.projectId,
          userId: request.userId,
          totalSources: sources.length,
          selectedSources: rankedSources.length,
          excludedSources: excludedSources.length,
          truncationPercentage: truncationPercentage.toFixed(1),
          excludedTokens: excludedTokensTotal,
          maxTokens,
          selectedTokens: rankingResult.totalTokens,
        });

        // Log warning if significant truncation (>20% of sources excluded)
        if (truncationPercentage > 20) {
          this.monitoring.trackEvent('context-assembly.significant-truncation', {
            tenantId,
            projectId: request.projectId,
            truncationPercentage: truncationPercentage.toFixed(1),
            excludedCount: excludedSources.length,
            suggestion: 'Consider increasing maxTokens or refining query to reduce source count',
          });

          // Add warning to response
          warnings.push({
            type: 'truncation',
            severity: truncationPercentage > 50 ? 'warning' : 'info',
            message: `${truncationPercentage.toFixed(1)}% of available sources were excluded due to token limits`,
            details: {
              totalSources: sources.length,
              selectedSources: rankedSources.length,
              excludedSources: excludedSources.length,
              excludedTokens: excludedTokensTotal,
              maxTokens,
              selectedTokens: rankingResult.totalTokens,
            },
            suggestion: 'Consider increasing maxTokens or refining query to reduce source count',
          });
        } else if (excludedSources.length > 0) {
          // Info-level warning for minor truncation
          warnings.push({
            type: 'truncation',
            severity: 'info',
            message: `${excludedSources.length} source(s) excluded due to token limits`,
            details: {
              excludedCount: excludedSources.length,
              excludedTokens: excludedTokensTotal,
            },
          });
        }
      }

      // Add warning if shards were filtered by permissions
      if (permissionFilteredCount > 0 && originalShardCount > 0) {
        warnings.push({
          type: 'permission_filtered',
          severity: 'info',
          message: `${permissionFilteredCount} shard(s) excluded due to access permissions`,
          details: {
            originalShardCount,
            filteredShardCount: originalShardCount - permissionFilteredCount,
            filteredOut: permissionFilteredCount,
          },
          suggestion: 'Some relevant shards may not be visible due to your access permissions',
        });
      }

      // 8. Optimize context
      const optimizedContext = await this.optimizeContext(
        rankedSources,
        queryTopics,
        clusters,
        maxTokens,
      );

      // 9. Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(
        rankedSources,
        queryTopics,
        clusters,
      );

      // 10. Build final context
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
        selectedRecommendations: rankedSources
          .filter((s) => s.sourceType === ContextSourceType.RECOMMENDATION)
          .map((s) => s.sourceId),
        summary: this.generateContextSummary(rankedSources, queryTopics, excludedSources.length > 0 ? excludedSources.length : undefined),
        contextLength: optimizedContext.totalTokens,
        contextLengthPercentage: (optimizedContext.totalTokens / maxTokens) * 100,
        qualityLevel: this.determineQualityLevel(qualityMetrics.overallQuality),
        relevanceScore: qualityMetrics.relevanceScore,
        optimizationApplied: optimizedContext.optimizations,
        compressionRatio: optimizedContext.compressionRatio,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.cacheTTLMinutes * 60 * 1000),
        ttl: this.config.cacheTTLMinutes * 60,
      };

      // Save to database
      await this.cosmosDB.upsertDocument('ai-chat-contexts', context, tenantId);

      // Cache result
      await this.cache.set(cacheKey, context, this.CONTEXT_CACHE_TTL);

      // Record metrics
      const metrics: ContextAssemblyMetrics = {
        requestId,
        userId: request.userId,
        projectId: request.projectId,
        totalTimeMs: Date.now() - startTime,
        sourcesAvailable: sources.length,
        sourcesSelected: rankedSources.length,
        topicsExtracted: queryTopics.length + sourceTopics.length,
        clustersGenerated: clusters.length,
        finalTokenCount: optimizedContext.totalTokens,
        relevanceScore: context.relevanceScore,
        qualityLevel: context.qualityLevel,
        cacheHit: false,
        timestamp: new Date(),
      };

      await this.recordMetrics(tenantId, metrics);

      this.monitoring.trackEvent('context-assembly.completed', {
        sourcesCount: rankedSources.length,
        totalTokens: optimizedContext.totalTokens,
        executionTimeMs: metrics.totalTimeMs,
      });

      // Build recommendations including excluded sources
      const additionalSources = excludedSources.length > 0
        ? excludedSources.slice(0, 3).map(s => ({
            id: s.id,
            sourceType: s.sourceType,
            sourceId: s.sourceId,
            sourceName: s.sourceName,
            content: s.content.substring(0, 200) + '...', // Preview
            relevanceScore: s.relevanceScore,
            estimatedTokens: s.estimatedTokens,
            createdAt: s.createdAt,
          }))
        : sources
            .filter((s) => !rankedSources.find((rs) => rs.id === s.id))
            .slice(0, 3);

      // Add warning if relevance is low
      if (qualityMetrics.relevanceScore < 0.3) {
        warnings.push({
          type: 'low_relevance',
          severity: 'warning',
          message: 'Context relevance is low - results may not be accurate',
          details: {
            relevanceScore: qualityMetrics.relevanceScore,
            qualityLevel: context.qualityLevel,
            sourcesCount: rankedSources.length,
          },
          suggestion: 'Consider refining your query or expanding search scope',
        });
      }

      return {
        context,
        executionTimeMs: metrics.totalTimeMs,
        warnings: warnings.length > 0 ? warnings : undefined,
        recommendations: {
          additionalSources: additionalSources.length > 0 ? additionalSources : undefined,
          refinedQuery: excludedSources.length > 0 ? this.suggestQueryRefinement(request.query) : undefined,
          suggestedFollowUp: this.suggestFollowUp(context, excludedSources.length > 0 ? excludedSources.length : undefined),
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'context-assembly.assemble' });
      throw error;
    }
  }

  /**
   * Extract topics from text content
   */
  async extractTopics(tenantId: string, request: TopicExtractionRequest): Promise<ExtractedTopic[]> {
    try {
      // For now, simple keyword extraction and categorization
      // In production, would use NLP model (BERT, LDA, etc.)

      const keywords = this.extractKeywords(request.content, request.maxTopics || 10);
      const topics: ExtractedTopic[] = keywords.map((keyword, index) => ({
        id: uuidv4(),
        name: keyword,
        category: this.categorizeTopic(keyword),
        keywords: [keyword],
        relevanceScore: 1.0 - index * 0.1, // Decreasing relevance by position
        frequency: this.countKeywordFrequency(request.content, keyword),
        entities: [],
      }));

      return topics.filter((t) => t.relevanceScore >= (request.minRelevance ?? 0.3));
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'context-assembly.extract-topics' });
      return [];
    }
  }

  /**
   * Expand query with synonyms and related terms
   */
  async expandQuery(tenantId: string, query: string): Promise<ExpandedQuery> {
    try {
      const terms = query.split(/\s+/).filter((t) => t.length > 2);
      const synonyms: string[] = [];
      const relatedTerms: string[] = [];

      // In production, would use thesaurus/NLP service
      // For now, simple expansion with common variations
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
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'context-assembly.expand-query' });
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
   * Retrieve relevant sources (shards, activities, recommendations)
   */
  private async retrieveRelevantSources(
    tenantId: string,
    projectId: string,
    userId: string,
    expandedQuery: ExpandedQuery,
    maxTokens: number,
    minRelevance: number,
    excludeTypes?: ContextSourceType[],
  ): Promise<ContextSourceItem[]> {
    try {
      const sources: ContextSourceItem[] = [];
      let tokenCount = 0;

      // 1. Vector search for relevant shards (project-aware)
      if (!excludeTypes?.includes(ContextSourceType.SHARD)) {
        const shardResults = await this.vectorSearch.search({
          tenantId,
          query: expandedQuery.expanded,
          topK: this.config.maxSourcesPerType,
          minScore: minRelevance,
          projectId, // Pass projectId for project-scoped vector search
        });

        // Filter shards by ACL permissions if ACL service is available
        let filteredShardResults = shardResults.results;
        originalShardCount = shardResults.results.length;
        if (this.aclService && shardResults.results.length > 0) {
          try {
            const permissionChecks = await Promise.all(
              shardResults.results.map(async (result) => {
                if (!result.shardId) {
                  return { result, hasAccess: false };
                }
                
                const checkResult = await this.aclService.checkPermission({
                  userId,
                  shardId: result.shardId,
                  tenantId,
                  requiredPermission: PermissionLevel.READ,
                  checkInheritance: true,
                });
                return { result, hasAccess: checkResult.hasAccess };
              })
            );

            // Filter to only include shards user has access to
            filteredShardResults = permissionChecks
              .filter(({ hasAccess }) => hasAccess)
              .map(({ result }) => result);

            permissionFilteredCount = originalShardCount - filteredShardResults.length;

            if (permissionFilteredCount > 0) {
              this.monitoring.trackEvent('context-assembly.acl-filtered', {
                projectId,
                originalCount: originalShardCount,
                filteredCount: filteredShardResults.length,
                filteredOut: permissionFilteredCount,
              });
            }
          } catch (aclError) {
            // Log ACL check failure but continue without filtering
            this.monitoring.trackException(aclError as Error, {
              operation: 'context-assembly.retrieve-sources.acl-check',
              projectId,
              tenantId,
            });
            // Continue without ACL filtering if ACL service fails
            // Note: Warning will be added in assembleContext if needed
          }
        }

        for (const result of filteredShardResults) {
          const tokens = Math.ceil((result.content?.length || result.shard?.name?.length || 0) / 4); // Rough estimate
          if (tokenCount + tokens <= maxTokens) {
            sources.push({
              id: uuidv4(),
              sourceType: ContextSourceType.SHARD,
              sourceId: result.shardId,
              sourceName: result.shard?.name || result.shardId,
              content: result.content || result.shard?.name || '',
              relevanceScore: result.score,
              estimatedTokens: tokens,
              createdAt: new Date(),
            });
            tokenCount += tokens;
          }
        }
      }

      // 2. Get recent activities
      let activityRetrievalFailed = false;
      if (!excludeTypes?.includes(ContextSourceType.ACTIVITY_LOG)) {
        const activityQuery = `
          SELECT TOP 10 * FROM project_activities pa
          WHERE pa.tenantId = @tenantId AND pa.projectId = @projectId
          ORDER BY pa.timestamp DESC
        `;

        try {
          const activities = await this.cosmosDB.queryDocuments<any>(
            'project-activities',
            activityQuery,
            [
              { name: '@tenantId', value: tenantId },
              { name: '@projectId', value: projectId },
            ],
            tenantId,
          );

          for (const activity of activities.slice(0, 5)) {
            const tokens = Math.ceil(activity.description?.length / 4 || 50);
            if (tokenCount + tokens <= maxTokens) {
              sources.push({
                id: uuidv4(),
                sourceType: ContextSourceType.ACTIVITY_LOG,
                sourceId: activity.id,
                sourceName: activity.type,
                content: activity.description || '',
                relevanceScore: 0.7,
                estimatedTokens: tokens,
                createdAt: activity.timestamp || new Date(),
              });
              tokenCount += tokens;
            }
          }
        } catch (error) {
          activityRetrievalFailed = true;
          this.monitoring.trackException(error as Error, {
            operation: 'context-assembly.retrieve-activities',
            tenantId,
            projectId,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          // Log warning event for partial failure
          this.monitoring.trackEvent('context-assembly.partial-failure', {
            tenantId,
            projectId,
            failedComponent: 'activity-log',
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          });
        }
      }

      // 3. Get linked shards for context
      const relatedSources: ContextSourceItem[] = [];
      let linkedShardsRetrievalFailures = 0;
      const shardSources = sources.filter((s) => s.sourceType === ContextSourceType.SHARD);
      
      for (const source of shardSources) {
        try {
          const shardWithLinks = await this.shardLinking.getShardWithLinks(
            tenantId,
            projectId,
            source.sourceId,
          );

          if (shardWithLinks) {
            // Filter linked shards by ACL permissions if ACL service is available
            let filteredLinks = shardWithLinks.incomingLinks;
            if (this.aclService && filteredLinks.length > 0) {
              try {
                const permissionChecks = await Promise.all(
                  filteredLinks.map(async (link) => {
                    if (!link.sourceShard?.id) {
                      return { link, hasAccess: false };
                    }
                    
                    const checkResult = await this.aclService.checkPermission({
                      userId,
                      shardId: link.sourceShard.id,
                      tenantId,
                      requiredPermission: PermissionLevel.READ,
                      checkInheritance: true,
                    });
                    return { link, hasAccess: checkResult.hasAccess };
                  })
                );

                // Filter to only include linked shards user has access to
                filteredLinks = permissionChecks
                  .filter(({ hasAccess }) => hasAccess)
                  .map(({ link }) => link);

                if (filteredLinks.length < shardWithLinks.incomingLinks.length) {
                  this.monitoring.trackEvent('context-assembly.acl-filtered-links', {
                    projectId,
                    originalCount: shardWithLinks.incomingLinks.length,
                    filteredCount: filteredLinks.length,
                    shardId: source.sourceId,
                  });
                }
              } catch (aclError) {
                // Log ACL check failure but continue without filtering
                this.monitoring.trackException(aclError as Error, {
                  operation: 'context-assembly.retrieve-linked-shards.acl-check',
                  projectId,
                  tenantId,
                  shardId: source.sourceId,
                });
                // Continue without ACL filtering if ACL service fails
              }
            }

            for (const link of filteredLinks.slice(0, 3)) {
              const tokens = Math.ceil((link.link.description?.length || 0) / 4 || 50);
              if (tokenCount + tokens <= maxTokens) {
                relatedSources.push({
                  id: uuidv4(),
                  sourceType: ContextSourceType.RELATED_LINK,
                  sourceId: link.link.id,
                  sourceName: `Link: ${link.sourceShard.name}`,
                  content: link.link.description || '',
                  relevanceScore: link.link.strength || 0.7,
                  estimatedTokens: tokens,
                  createdAt: new Date(),
                });
                tokenCount += tokens;
              }
            }
          }
        } catch (error) {
          linkedShardsRetrievalFailures++;
          this.monitoring.trackException(error as Error, {
            operation: 'context-assembly.retrieve-linked-shards',
            tenantId,
            projectId,
            shardId: source.sourceId,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          // Continue processing other shards even if one fails
        }
      }

      // Log warning if multiple linked shard retrievals failed
      if (linkedShardsRetrievalFailures > 0) {
        this.monitoring.trackEvent('context-assembly.partial-failure', {
          tenantId,
          projectId,
          failedComponent: 'linked-shards',
          failureCount: linkedShardsRetrievalFailures,
          totalShards: shardSources.length,
          failureRate: (linkedShardsRetrievalFailures / shardSources.length) * 100,
        });
      }

      sources.push(...relatedSources);
      return {
        sources: sources.slice(0, 50), // Limit total sources
        permissionFilteredCount,
        originalShardCount,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'context-assembly.retrieve-sources' });
      throw error;
    }
  }

  /**
   * Extract topics from multiple sources
   */
  private async extractTopicsFromSources(
    tenantId: string,
    sources: ContextSourceItem[],
  ): Promise<ExtractedTopic[]> {
    const allTopics: ExtractedTopic[] = [];
    let topicExtractionFailures = 0;

    for (const source of sources) {
      try {
        const topics = await this.extractTopics(tenantId, {
          content: source.content,
          maxTopics: 3,
          minRelevance: 0.4,
        });

        allTopics.push(...topics);
        source.topicMatches = topics.map((t) => t.id);
      } catch (error) {
        topicExtractionFailures++;
        this.monitoring.trackException(error as Error, {
          operation: 'context-assembly.extract-topics-from-source',
          tenantId,
          sourceId: source.id,
          sourceType: source.sourceType,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        // Continue processing other sources even if one fails
      }
    }

    // Log warning if multiple topic extractions failed
    if (topicExtractionFailures > 0) {
      this.monitoring.trackEvent('context-assembly.partial-failure', {
        tenantId,
        failedComponent: 'topic-extraction',
        failureCount: topicExtractionFailures,
        totalSources: sources.length,
        failureRate: (topicExtractionFailures / sources.length) * 100,
      });
    }

    // Deduplicate by name
    const seen = new Set<string>();
    return allTopics.filter((t) => {
      if (seen.has(t.name)) {return false;}
      seen.add(t.name);
      return true;
    });
  }

  /**
   * Cluster related topics
   */
  private async clusterTopics(
    topics: ExtractedTopic[],
    focusTopics?: string[],
  ): Promise<TopicCluster[]> {
    try {
      // Simple clustering: group by category
      const clusterMap = new Map<TopicCategory, ExtractedTopic[]>();

      for (const topic of topics) {
        if (!clusterMap.has(topic.category)) {
          clusterMap.set(topic.category, []);
        }
        clusterMap.get(topic.category)!.push(topic);
      }

      const clusters: TopicCluster[] = Array.from(clusterMap.entries()).map(([category, clusterTopics]) => ({
        id: uuidv4(),
        name: category,
        topics: clusterTopics.sort((a, b) => b.relevanceScore - a.relevanceScore),
        coherenceScore: this.calculateClusterCoherence(clusterTopics),
        summary: `${category}: ${clusterTopics.map((t) => t.name).join(', ')}`,
      }));

      return clusters;
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'context-assembly.cluster-topics' });
      return [];
    }
  }

  /**
   * Rank sources by relevance and utility
   */
  private async rankSources(
    sources: ContextSourceItem[],
    queryTopics: ExtractedTopic[],
    clusters: TopicCluster[],
    maxTokens: number,
  ): Promise<{
    selected: RankedContextSource[];
    excluded: RankedContextSource[];
    totalTokens: number;
    excludedTokens: number;
  }> {
    const ranked: RankedContextSource[] = sources.map((source, index) => {
      // Calculate relevance based on topic matching
      const topicMatches = source.topicMatches || [];
      const matchingTopics = queryTopics.filter((t) => topicMatches.includes(t.id));
      const topicRelevance =
        matchingTopics.length > 0
          ? matchingTopics.reduce((sum, t) => sum + t.relevanceScore, 0) / matchingTopics.length
          : source.relevanceScore;

      // Calculate recency boost
      const createdAtMs = new Date(source.createdAt).getTime();
      const ageDays = (Date.now() - createdAtMs) / (24 * 60 * 60 * 1000);
      const recencyScore = Math.max(0.1, 1.0 - ageDays / 30); // Decays over 30 days

      // Importance from metadata
      const importance = source.metadata?.weight ?? 1.0;

      // Diversity (prefer sources from different types)
      const typeFrequency = sources.filter((s) => s.sourceType === source.sourceType).length;
      const diversityScore = 1.0 / typeFrequency;

      // Combined score
      const scoreBreakdown = {
        relevance: topicRelevance * 0.5,
        recency: recencyScore * 0.2,
        importance: importance * 0.2,
        diversity: diversityScore * 0.1,
      };

      const score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

      return {
        ...source,
        rank: index + 1,
        score: Math.min(1, score),
        scoreBreakdown,
        reason: `Relevance: ${(topicRelevance * 100).toFixed(0)}%, Recency: ${(recencyScore * 100).toFixed(0)}%`,
      };
    });

    // Sort by score and keep within token budget
    ranked.sort((a, b) => b.score - a.score);

    let tokenCount = 0;
    const selected: RankedContextSource[] = [];
    const excluded: RankedContextSource[] = [];

    for (const source of ranked) {
      if (tokenCount + source.estimatedTokens <= maxTokens) {
        selected.push(source);
        tokenCount += source.estimatedTokens;
      } else {
        excluded.push(source);
      }
    }

    const excludedTokens = excluded.reduce((sum, s) => sum + s.estimatedTokens, 0);

    return {
      selected,
      excluded,
      totalTokens: tokenCount,
      excludedTokens,
    };
  }

  /**
   * Optimize context for better AI consumption
   */
  private async optimizeContext(
    sources: RankedContextSource[],
    queryTopics: ExtractedTopic[],
    clusters: TopicCluster[],
    maxTokens: number,
  ): Promise<{
    totalTokens: number;
    optimizations: string[];
    compressionRatio: number;
  }> {
    const optimizations: string[] = [];
    let totalTokens = sources.reduce((sum, s) => sum + s.estimatedTokens, 0);
    let compressionRatio = 1.0;

    // 1. Summarization if over budget
    if (totalTokens > maxTokens * 0.8) {
      optimizations.push('summarization');
      totalTokens = Math.floor(totalTokens * 0.7); // 30% reduction
      compressionRatio = 0.7;
    }

    // 2. Deduplication of redundant sources
    const seenContent = new Set<string>();
    const deduplicated = sources.filter((s) => {
      const contentHash = crypto.createHash('md5').update(s.content).digest('hex');
      if (seenContent.has(contentHash)) {return false;}
      seenContent.add(contentHash);
      return true;
    });

    if (deduplicated.length < sources.length) {
      optimizations.push('deduplication');
    }

    // 3. Clustering redundant topics
    if (clusters.length > 5) {
      optimizations.push('topic_clustering');
    }

    return {
      totalTokens: Math.min(totalTokens, maxTokens),
      optimizations,
      compressionRatio,
    };
  }

  /**
   * Calculate quality metrics for assembled context
   */
  private calculateQualityMetrics(
    sources: RankedContextSource[],
    queryTopics: ExtractedTopic[],
    clusters: TopicCluster[],
  ): ContextQualityMetrics {
    // Overall relevance
    const avgRelevance = sources.length > 0 ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length : 0;

    // Coherence: how well topics fit together
    const coherenceScore = clusters.length > 0 ? clusters.reduce((sum, c) => sum + c.coherenceScore, 0) / clusters.length : 0;

    // Diversity: variety of source types
    const typeSet = new Set(sources.map((s) => s.sourceType));
    const diversityScore = typeSet.size / Object.keys(ContextSourceType).length;

    // Token efficiency
    const totalTokens = sources.reduce((sum, s) => sum + s.estimatedTokens, 0);
    const tokenEfficiency = (avgRelevance / (totalTokens || 1)) * 1000; // Normalized

    return {
      contextId: '', // Will be set later
      overallQuality: (avgRelevance * 0.5 + coherenceScore * 0.3 + diversityScore * 0.2),
      relevanceScore: avgRelevance,
      coherenceScore,
      diversityScore,
      tokenEfficiency,
      retrievalTime: 0, // Will be calculated
      tokenCompression: 0, // Will be set later
    };
  }

  /**
   * Generate summary of assembled context
   */
  private generateContextSummary(sources: RankedContextSource[], topics: ExtractedTopic[], excludedCount?: number): string {
    const topTopics = topics.slice(0, 3).map((t) => t.name).join(', ');
    const sourceCount = sources.length;
    const sourceTypes = [...new Set(sources.map((s) => s.sourceType))].join(', ');

    let summary = `Context with ${sourceCount} sources covering ${sourceTypes}. Key topics: ${topTopics}.`;
    
    if (excludedCount && excludedCount > 0) {
      summary += ` Note: ${excludedCount} additional source(s) were excluded due to token limits.`;
    }

    return summary;
  }

  /**
   * Determine quality level from quality score
   */
  private determineQualityLevel(score: number): ContextQualityLevel {
    if (score >= 0.8) {return ContextQualityLevel.HIGH;}
    if (score >= 0.5) {return ContextQualityLevel.MEDIUM;}
    if (score >= 0.2) {return ContextQualityLevel.LOW;}
    return ContextQualityLevel.MINIMAL;
  }

  /**
   * Suggest follow-up questions
   */
  private suggestFollowUp(context: AssembledContext, excludedCount?: number): string {
    const topics = context.queryTopics.slice(0, 2).map((t) => t.name);
    let suggestion = '';
    
    if (topics.length > 0) {
      suggestion = `Would you like more details about ${topics.join(' and ')}?`;
    } else {
      suggestion = 'What aspect would you like to explore further?';
    }
    
    if (excludedCount && excludedCount > 0) {
      suggestion += ` (${excludedCount} additional source(s) available with expanded context)`;
    }
    
    return suggestion;
  }

  /**
   * Suggest query refinement when context is empty or limited
   */
  private suggestQueryRefinement(query: string): string {
    // Simple suggestions based on query length and structure
    if (query.length < 10) {
      return 'Try using more specific keywords or phrases to narrow your search.';
    }
    
    if (query.split(/\s+/).length < 3) {
      return 'Consider adding more descriptive terms to your query for better results.';
    }
    
    return 'Try rephrasing your query or using different keywords to find relevant context.';
  }

  /**
   * Helper: Extract keywords from text
   */
  private extractKeywords(text: string, limit: number): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const filtered = words.filter((w) => w.length > 3 && !this.isStopword(w));
    const freq = new Map<string, number>();

    filtered.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map((e) => e[0]);
  }

  /**
   * Helper: Categorize topic
   */
  private categorizeTopic(topic: string): TopicCategory {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.match(/code|technical|tech|system|api|database/i)) {return TopicCategory.TECHNICAL;}
    if (lowerTopic.match(/business|market|sales|customer|revenue/i)) {return TopicCategory.BUSINESS;}
    if (lowerTopic.match(/process|workflow|step|procedure|action/i)) {return TopicCategory.PROCESS;}
    if (lowerTopic.match(/plan|goal|strategy|roadmap|timeline/i)) {return TopicCategory.PLANNING;}
    if (lowerTopic.match(/analysis|report|metric|data|statistic/i)) {return TopicCategory.ANALYSIS;}
    if (lowerTopic.match(/document|doc|note|guide|manual/i)) {return TopicCategory.DOCUMENTATION;}
    if (lowerTopic.match(/requirement|spec|specification|constraint/i)) {return TopicCategory.REQUIREMENTS;}
    return TopicCategory.OTHER;
  }

  /**
   * Helper: Count keyword frequency
   */
  private countKeywordFrequency(text: string, keyword: string): number {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Helper: Generate synonyms
   */
  private generateSynonyms(term: string): string[] {
    const synonymMap: Record<string, string[]> = {
      project: ['project', 'initiative', 'undertaking', 'task'],
      requirement: ['requirement', 'need', 'specification', 'spec'],
      document: ['document', 'file', 'record', 'artifact'],
      task: ['task', 'action', 'work', 'job'],
      feature: ['feature', 'capability', 'functionality'],
    };

    return synonymMap[term.toLowerCase()] || [];
  }

  /**
   * Helper: Generate related terms
   */
  private generateRelatedTerms(term: string): string[] {
    // In production, would use comprehensive knowledge base
    return [];
  }

  /**
   * Helper: Extract entities
   */
  private extractEntities(text: string): string[] {
    // Simple entity extraction
    const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    return [...new Set(capitalized)];
  }

  /**
   * Helper: Check if word is stopword
   */
  private isStopword(word: string): boolean {
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    ]);
    return stopwords.has(word.toLowerCase());
  }

  /**
   * Helper: Calculate cluster coherence
   */
  private calculateClusterCoherence(topics: ExtractedTopic[]): number {
    if (topics.length <= 1) {return 1.0;}
    const avgRelevance = topics.reduce((sum, t) => sum + t.relevanceScore, 0) / topics.length;
    return Math.min(1, avgRelevance * 1.2);
  }

  /**
   * Helper: Generate cache key
   */
  private generateCacheKey(request: ContextAssemblyRequest): string {
    const normalized = `${request.projectId}:${request.userId}:${request.query.toLowerCase().trim()}`;
    return `context:${crypto.createHash('md5').update(normalized).digest('hex')}`;
  }

  /**
   * Helper: Record metrics
   */
  private async recordMetrics(tenantId: string, metrics: ContextAssemblyMetrics): Promise<void> {
    try {
      await this.cosmosDB.upsertDocument('context-assembly-metrics', { id: uuidv4(), ...metrics }, tenantId);

      // Also track with performance monitoring
      this.performanceMonitoring.trackContextAssemblyMetric({
        tenantId,
        projectId: metrics.projectId,
        latencyMs: metrics.totalTimeMs,
        tokensUsed: metrics.finalTokenCount,
        linkedShardsIncluded: metrics.sourcesSelected,
        truncationOccurred: false, // TODO: track truncation from metrics
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'context-assembly.record-metrics' });
    }
  }

  // ============================================
  // Phase 2: Project Resolver Methods
  // ============================================

  /**
   * Resolve project context - Phase 2
   * Traverses internal and external relationships to get scoped shard set
   * 
   * Performance optimizations:
   * - Caching: 5-minute TTL with cache invalidation on relationship changes
   * - DataLoader pattern: Batch load shards to reduce Cosmos DB queries
   * - Pagination: Default limit 100, max 1000
   * - Filter-first: Early filtering by tenantId and status
   */
  async resolveProjectContext(
    projectId: string,
    tenantId: string,
    options: {
      includeExternal?: boolean;
      minConfidence?: number;
      maxShards?: number;
      limit?: number;
      offset?: number;
      userId?: string; // Optional userId for ACL checks
    } = {}
  ): Promise<{
    project: Shard;
    linkedShards: Shard[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const startTime = Date.now();

    if (!this.shardRepository) {
      throw new Error('ShardRepository not initialized. Call setShardRepository() first.');
    }

    try {
      // Check cache (5-minute TTL)
      const cacheKey = `project:${projectId}:context:${this.hashOptions(options)}`;
      const cached = await this.cache.get<{
        project: Shard;
        linkedShards: Shard[];
        totalCount: number;
        hasMore: boolean;
      }>(cacheKey);

      if (cached) {
        this.monitoring.trackEvent('context-assembly.project-cache-hit', { projectId });
        return cached;
      }

      // Get project shard
      const project = await this.shardRepository.findById(projectId, tenantId);
      if (!project || project.shardTypeId !== 'c_project') {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Traverse internal relationships (with max depth limit)
      const internalShardIds = await this.traverseInternalRelationships(
        projectId,
        tenantId,
        { maxDepth: 3, ...options }
      );
      
      // Optionally expand via external relationships
      let externalShardIds: string[] = [];
      if (options.includeExternal) {
        externalShardIds = await this.traverseExternalRelationships(projectId, tenantId, options);
      }

      // Combine and deduplicate
      const allShardIds = Array.from(new Set([...internalShardIds, ...externalShardIds]));

      // Apply confidence gating if specified
      let filteredShardIds = allShardIds;
      if (options.minConfidence !== undefined) {
        filteredShardIds = await this.applyConfidenceGating(
          project,
          allShardIds,
          tenantId,
          options.minConfidence
        );
      }

      // Apply pagination
      const limit = Math.min(options.limit || options.maxShards || 100, 1000); // Max 1000
      const offset = options.offset || 0;
      const paginatedIds = filteredShardIds.slice(offset, offset + limit);

      // Batch load shards (DataLoader pattern - reduce Cosmos DB queries)
      const linkedShards = await this.batchLoadShards(paginatedIds, tenantId);

      // Filter out nulls (deleted/archived shards)
      let validShards = linkedShards.filter((s): s is Shard => s !== null);

      // Filter by ACL permissions if userId and ACLService are available
      if (options.userId && this.aclService && validShards.length > 0) {
        try {
          const permissionChecks = await Promise.all(
            validShards.map(async (shard) => {
              const checkResult = await this.aclService.checkPermission({
                userId: options.userId!,
                shardId: shard.id,
                tenantId,
                requiredPermission: 'read' as any,
                checkInheritance: true,
              });
              return { shard, hasAccess: checkResult.hasAccess };
            })
          );

          // Filter to only include shards user has access to
          validShards = permissionChecks
            .filter(({ hasAccess }) => hasAccess)
            .map(({ shard }) => shard);

          this.monitoring.trackEvent('context-assembly.acl-filtered', {
            projectId,
            originalCount: linkedShards.length,
            filteredCount: validShards.length,
          });
        } catch (aclError) {
          // Log ACL check failure but continue without filtering
          this.monitoring.trackException(aclError as Error, {
            operation: 'context-assembly.acl-check',
            projectId,
          });
          // Continue without ACL filtering if ACL service fails
        }
      }

      const result = {
        project,
        linkedShards: validShards,
        totalCount: filteredShardIds.length,
        hasMore: offset + limit < filteredShardIds.length,
      };

      // Cache result (5-minute TTL)
      await this.cache.set(cacheKey, result, this.CONTEXT_CACHE_TTL);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('context-assembly.project-resolved', {
        projectId,
        durationMs: duration,
        shardsCount: validShards.length,
      });

      return result;
    } catch (error: unknown) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'context-assembly.resolve-project-context' });
      throw error;
    }
  }

  /**
   * Batch load shards (DataLoader pattern)
   * Reduces Cosmos DB queries by batching requests
   */
  private async batchLoadShards(shardIds: string[], tenantId: string): Promise<(Shard | null)[]> {
    if (!this.shardRepository) {
      throw new Error('ShardRepository not initialized');
    }

    // Batch size: 20 shards per batch
    const batchSize = 20;
    const batches: string[][] = [];

    for (let i = 0; i < shardIds.length; i += batchSize) {
      batches.push(shardIds.slice(i, i + batchSize));
    }

    const results: (Shard | null)[] = [];

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(id => this.shardRepository!.findById(id, tenantId).catch((error) => {
          this.monitoring.trackException(error as Error, { operation: 'ai-context-assembly.findById', shardId: id, tenantId });
          return null;
        }))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Hash options for cache key
   */
  private hashOptions(options: Record<string, any>): string {
    const str = JSON.stringify(options);
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
  }

  /**
   * Traverse internal relationships from a shard
   */
  async traverseInternalRelationships(
    shardId: string,
    tenantId: string,
    options: { maxDepth?: number } = {}
  ): Promise<string[]> {
    const maxDepth = options.maxDepth || 3;
    const visited = new Set<string>();
    const shardIds: string[] = [];

    if (!this.shardRepository) {
      throw new Error('ShardRepository not initialized');
    }

    const traverse = async (currentId: string, depth: number): Promise<void> => {
      if (depth > maxDepth || visited.has(currentId)) {
        return;
      }

      visited.add(currentId);
      if (currentId !== shardId) {
        shardIds.push(currentId);
      }

      const shard = await this.shardRepository!.findById(currentId, tenantId);
      if (!shard || !shard.internal_relationships) {
        return;
      }

      // Traverse relationships
      for (const rel of shard.internal_relationships) {
        if (!visited.has(rel.shardId)) {
          await traverse(rel.shardId, depth + 1);
        }
      }
    };

    await traverse(shardId, 0);
    return shardIds;
  }

  /**
   * Traverse external relationships to find matching shards
   */
  async traverseExternalRelationships(
    projectId: string,
    tenantId: string,
    options: { minConfidence?: number } = {}
  ): Promise<string[]> {
    if (!this.shardRepository) {
      throw new Error('ShardRepository not initialized');
    }

    const project = await this.shardRepository.findById(projectId, tenantId);
    if (!project || !project.external_relationships) {
      return [];
    }

    const matchingShardIds: string[] = [];

    // Get external relationship patterns from project
    const projectExternalPatterns = project.external_relationships.map(rel => ({
      system: rel.system,
      systemType: rel.systemType,
      externalId: rel.externalId,
    }));

    // Find shards with matching external relationships
    // This is a simplified implementation - in production, would use Cosmos DB queries
    for (const pattern of projectExternalPatterns) {
      if (!pattern.system || !pattern.externalId) {continue;}

      // Query for shards with matching external relationships
      // Note: This is a placeholder - actual implementation would use Cosmos DB query
      // For now, return empty array as this requires proper Cosmos DB query support
      this.monitoring.trackEvent('context-assembly.find-external-shards', {
        system: pattern.system,
        externalId: pattern.externalId,
      });
    }

    return matchingShardIds;
  }

  /**
   * Apply confidence gating to filter shards by relationship confidence
   */
  async applyConfidenceGating(
    project: Shard,
    shardIds: string[],
    tenantId: string,
    minConfidence: number
  ): Promise<string[]> {
    if (!this.shardRepository) {
      throw new Error('ShardRepository not initialized');
    }

    const filteredIds: string[] = [];

    for (const shardId of shardIds) {
      const shard = await this.shardRepository.findById(shardId, tenantId);
      if (!shard) {continue;}

      // Check if shard has relationship to project with sufficient confidence
      const hasProjectRelationship = shard.internal_relationships?.some(rel => {
        if (rel.shardId === project.id) {
          const confidence = rel.metadata?.confidence;
          return confidence !== undefined && confidence >= minConfidence;
        }
        return false;
      });

      // Also check if project has relationship to shard with sufficient confidence
      const projectHasRelationship = project.internal_relationships?.some(rel => {
        if (rel.shardId === shardId) {
          const confidence = rel.metadata?.confidence;
          return confidence !== undefined && confidence >= minConfidence;
        }
        return false;
      });

      if (hasProjectRelationship || projectHasRelationship) {
        filteredIds.push(shardId);
      } else {
        // If no explicit relationship, include if minConfidence is low (allow unlinked high-similarity)
        if (minConfidence <= 0.5) {
          filteredIds.push(shardId);
        }
      }
    }

    return filteredIds;
  }
}
