/**
 * Shard Linking Service
 * Manages shard relationships with enhanced linking, validation, and bulk operations
 */

import { CosmosClient, RetryOptions } from '@azure/cosmos';
import type { Container, Database, ConnectionPolicy } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import { config } from '../config/env.js';
import type { Redis } from 'ioredis';
import {
  ShardLink,
  CreateLinkInput,
  UpdateLinkInput,
  BulkLinkInput,
  BulkLinkResult,
  MultiProjectBulkLinkInput,
  ShardWithLinks,
  LinkFilterOptions,
  LinkQueryParams,
  LinkPage,
  LinkStatistics,
  LinkValidationResult,
  LinkSuggestion,
  ShardLinkContext,
  LinkOperationAudit,
  LinkImpactAnalysis,
  RelationshipType,
} from '../types/shard-linking.types.js';
import { ProjectActivity, ProjectActivityType, ActivitySeverity, CreateActivityInput } from '../types/project-activity.types.js';
import { v4 as uuidv4 } from 'uuid';

export class ShardLinkingService {
  private readonly LINK_CACHE_TTL = 300; // 5 minutes
  private readonly LINKS_CACHE_TTL = 600; // 10 minutes
  private readonly STATS_CACHE_TTL = 3600; // 1 hour
  private client: CosmosClient;
  private database: Database;
  private linksContainer: Container;
  private monitoring: IMonitoringProvider;
  private shardRepository: ShardRepository;
  private redis?: Redis;
  private logger: {
    log: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };

  constructor(
    shardRepository: ShardRepository,
    monitoring: IMonitoringProvider,
    redis?: Redis
  ) {
    this.shardRepository = shardRepository;
    this.monitoring = monitoring;
    this.redis = redis;
    this.logger = {
      log: (message: string) => monitoring.trackEvent('shard-linking.log', { message }),
      error: (message: string) => monitoring.trackException(new Error(message), { operation: 'shard-linking' }),
      warn: (message: string) => monitoring.trackEvent('shard-linking.warn', { message }),
    };

    // Initialize Cosmos client with optimized connection policy
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: ('Direct' as any) as ConnectionPolicy['connectionMode'], // Best performance - Azure SDK type compatibility
      requestTimeout: 30000, // 30 seconds
      enableEndpointDiscovery: true, // For multi-region
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0, // Exponential backoff
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.linksContainer = this.database.container('project-shard-links');
  }

  /**
   * Helper: Query documents using Cosmos container
   */
  private async queryDocuments<T>(
    query: string,
    parameters: Array<{ name: string; value: any }>,
  ): Promise<T[]> {
    const { resources } = await this.linksContainer.items
      .query<T>({ query, parameters })
      .fetchAll();
    return resources;
  }

  /**
   * Helper: Get cache service wrapper
   */
  private get cache() {
    return {
      get: async <T>(key: string): Promise<T | null> => {
        if (!this.redis) return null;
        try {
          const value = await this.redis.get(key);
          if (!value) return null;
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      },
      set: async (key: string, value: any, ttl: number): Promise<void> => {
        if (!this.redis) return;
        try {
          await this.redis.setex(key, ttl, JSON.stringify(value));
        } catch (error) {
          this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'shard-linking.cache.set',
            key,
          });
        }
      },
      delete: async (key: string): Promise<void> => {
        if (!this.redis) return;
        try {
          await this.redis.del(key);
        } catch (error) {
          this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'shard-linking.cache.delete',
            key,
          });
        }
      },
    };
  }

  /**
   * Helper: Get cosmosDB service wrapper
   */
  private get cosmosDB() {
    return {
      queryDocuments: async <T>(
        container: string,
        query: string,
        parameters: Array<{ name: string; value: any }>,
        tenantId: string,
      ): Promise<T[]> => {
        return this.queryDocuments<T>(query, parameters);
      },
      upsertDocument: async <T>(
        container: string,
        document: T,
        tenantId: string,
      ): Promise<T> => {
        await this.linksContainer.items.upsert(document);
        return document;
      },
    };
  }

  /**
   * Create a single link between two shards
   */
  async createLink(
    tenantId: string,
    projectId: string,
    input: CreateLinkInput,
    createdByUserId: string,
  ): Promise<ShardLink> {
    try {
      // Validate input
      const validation = await this.validateLink(tenantId, projectId, input);
      if (!validation.isValid) {
        throw new Error(
          `Link validation failed: ${validation.errors.map((e: { message: string }) => e.message).join(', ')}`,
        );
      }

      // Check shards exist (simplified - in real implementation would fetch from shard service)
      // For now, assume they exist - in production would call ShardService

      const link: ShardLink = {
        id: uuidv4(),
        tenantId,
        projectId,
        fromShardId: input.fromShardId,
        toShardId: input.toShardId,
        relationshipType: input.relationshipType,
        customLabel: input.customLabel,
        description: input.description,
        strength: input.strength ?? 1.0,
        createdBy: createdByUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: createdByUserId,
        isActive: true,
        isBidirectional: input.isBidirectional ?? false,
        priority: input.priority,
        tags: input.tags,
        metadata: {
          accessCount: 0,
          userRating: undefined,
          aiSuggestable: true,
        },
      };

      // Save link
      await this.linksContainer.items.upsert(link);

      // Create reverse link if bidirectional
      if (link.isBidirectional) {
        const reverseLink: ShardLink = {
          ...link,
          id: uuidv4(),
          fromShardId: input.toShardId,
          toShardId: input.fromShardId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.linksContainer.items.upsert(reverseLink);
      }

      // Invalidate caches
      await this.invalidateLinkCaches(tenantId, projectId);

      // Log activity
      await this.logActivity(tenantId, projectId, {
        type: ProjectActivityType.SHARD_LINKED,
        actorUserId: createdByUserId,
        actorDisplayName: '', // Would be populated from user service
        description: `Linked shard ${input.fromShardId} to ${input.toShardId} (${input.relationshipType})`,
        severity: ActivitySeverity.LOW,
        details: {
          shardId: input.fromShardId,
          linkedToShardId: input.toShardId,
          relationshipType: input.relationshipType,
        },
      });

      this.monitoring.trackEvent('shard-link.created', {
        linkId: link.id,
        fromShardId: input.fromShardId,
        toShardId: input.toShardId,
        relationshipType: input.relationshipType,
      });

      return link;
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'shard-linking.createLink' });
      throw error;
    }
  }

  /**
   * Update an existing link
   */
  async updateLink(
    tenantId: string,
    projectId: string,
    linkId: string,
    input: UpdateLinkInput,
    updatedByUserId: string,
  ): Promise<ShardLink> {
    try {
      const link = await this.getLink(tenantId, projectId, linkId);
      if (!link) {
        throw new Error(`Link ${linkId} not found`);
      }

      // Update fields
      if (input.relationshipType) {link.relationshipType = input.relationshipType;}
      if (input.customLabel !== undefined) {link.customLabel = input.customLabel;}
      if (input.description !== undefined) {link.description = input.description;}
      if (input.strength !== undefined) {link.strength = input.strength;}
      if (input.priority !== undefined) {link.priority = input.priority;}
      if (input.tags !== undefined) {link.tags = input.tags;}
      if (input.isBidirectional !== undefined) {link.isBidirectional = input.isBidirectional;}

      link.updatedAt = new Date();
      link.updatedBy = updatedByUserId;

      await this.linksContainer.items.upsert(link);
      await this.invalidateLinkCaches(tenantId, projectId);

      this.monitoring.trackEvent('shard-link.updated', { linkId });
      return link;
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'shard-linking.updateLink' });
      throw error;
    }
  }

  /**
   * Delete a link with impact analysis
   */
  async deleteLink(
    tenantId: string,
    projectId: string,
    linkId: string,
    deletedByUserId: string,
  ): Promise<void> {
    try {
      const link = await this.getLink(tenantId, projectId, linkId);
      if (!link) {
        throw new Error(`Link ${linkId} not found`);
      }

      // Mark as inactive (soft delete)
      link.isActive = false;
      await this.linksContainer.items.upsert(link);

      // If bidirectional, also deactivate reverse link
      if (link.isBidirectional) {
        const reverseQuery = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.projectId = @projectId AND c.fromShardId = @toShardId AND c.toShardId = @fromShardId AND c.isActive = true`;
        const { resources: reverseLinks } = await this.linksContainer.items.query<ShardLink>({
          query: reverseQuery,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@projectId', value: projectId },
            { name: '@toShardId', value: link.toShardId },
            { name: '@fromShardId', value: link.fromShardId },
          ],
        }).fetchAll();

        if (reverseLinks.length > 0) {
          const reverseLink = reverseLinks[0];
          reverseLink.isActive = false;
          await this.linksContainer.items.upsert(reverseLink);
        }
      }

      await this.invalidateLinkCaches(tenantId, projectId);

      this.monitoring.trackEvent('shard-link.deleted', { linkId });
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'shard-linking.deleteLink' });
      throw error;
    }
  }

  /**
   * Create multiple links in bulk
   */
  async bulkCreateLinks(
    tenantId: string,
    input: BulkLinkInput,
    createdByUserId: string,
  ): Promise<BulkLinkResult> {
    try {
      const linkIds: string[] = [];
      const failures: BulkLinkResult['failures'] = [];

      for (let i = 0; i < input.links.length; i++) {
        try {
          const link = await this.createLink(
            tenantId,
            input.projectId,
            input.links[i],
            createdByUserId,
          );
          linkIds.push(link.id);
        } catch (error) {
          failures.push({
            index: i,
            fromShardId: input.links[i].fromShardId,
            toShardId: input.links[i].toShardId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const result: BulkLinkResult = {
        createdCount: linkIds.length,
        failureCount: failures.length,
        linkIds,
        failures,
        timestamp: new Date(),
      };

      // Log bulk operation
      await this.logActivity(tenantId, input.projectId, {
        type: ProjectActivityType.SHARD_LINKED,
        actorUserId: createdByUserId,
        actorDisplayName: '',
        description: `Bulk linked ${linkIds.length} shard relationships`,
        severity: ActivitySeverity.MEDIUM,
        details: {
          bulkLinkCount: linkIds.length,
        },
      });

      this.logger.log(`Bulk link operation: ${linkIds.length} created, ${failures.length} failed`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to bulk create links: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create links across multiple projects
   */
  async bulkCreateLinksMultiProject(
    tenantId: string,
    input: MultiProjectBulkLinkInput,
    createdByUserId: string,
  ): Promise<BulkLinkResult> {
    try {
      // Group links by project
      const linksByProject = new Map<string, CreateLinkInput[]>();

      for (const link of input.links) {
        if (!linksByProject.has(link.projectId)) {
          linksByProject.set(link.projectId, []);
        }
        linksByProject.get(link.projectId)!.push({
          fromShardId: link.fromShardId,
          toShardId: link.toShardId,
          relationshipType: link.relationshipType,
          customLabel: link.customLabel,
          description: link.description,
          strength: link.strength,
          isBidirectional: link.isBidirectional,
          priority: link.priority,
          tags: link.tags,
        });
      }

      // Process each project
      let totalCreated = 0;
      let totalFailed = 0;
      const allFailures: BulkLinkResult['failures'] = [];

      for (const [projectId, links] of linksByProject.entries()) {
        try {
          const result = await this.bulkCreateLinks(
            tenantId,
            {
              projectId,
              links,
              autoCreateReverse: input.autoCreateReverse,
            },
            createdByUserId,
          );

          totalCreated += result.createdCount;
          totalFailed += result.failureCount;
          allFailures.push(...result.failures);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to bulk link project ${projectId}: ${errorMessage}`);
          totalFailed += links.length;
        }
      }

      return {
        createdCount: totalCreated,
        failureCount: totalFailed,
        linkIds: [], // Not tracking individual IDs for multi-project
        failures: allFailures,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to bulk create multi-project links: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get single link by ID
   */
  async getLink(tenantId: string, projectId: string, linkId: string): Promise<ShardLink | null> {
    try {
      const cacheKey = `link:${linkId}`;
      // Try cache if Redis is available
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as ShardLink;
        }
      }

      const { resource: link } = await this.linksContainer.item(linkId, tenantId).read<ShardLink>();
      if (link && link.isActive) {
        // Cache if Redis is available
        if (this.redis) {
          try {
            await this.redis.setex(cacheKey, this.LINK_CACHE_TTL, JSON.stringify(link));
          } catch (redisError) {
            // Redis error - log but don't fail the request
            this.monitoring.trackException(redisError instanceof Error ? redisError : new Error(String(redisError)), {
              operation: 'shard-linking.redis-setex',
              linkId,
            });
          }
        }
        return link;
      }

      return null;
    } catch (error) {
      this.monitoring.trackException(error as Error, { operation: 'shard-linking.getLink' });
      return null;
    }
  }

  /**
   * Query links with filtering and pagination
   */
  async getLinks(
    tenantId: string,
    projectId: string,
    params: LinkQueryParams = {},
  ): Promise<LinkPage> {
    try {
      let query = `
        SELECT * FROM project_shard_links l
        WHERE l.tenantId = @tenantId AND l.projectId = @projectId AND l.isActive = true
      `;

      const parameters: Array<{ name: string; value: any }> = [
        { name: '@tenantId', value: tenantId },
        { name: '@projectId', value: projectId },
      ];

      // Apply filters
      if (params.relationshipTypes && params.relationshipTypes.length > 0) {
        query += ` AND l.relationshipType IN (${params.relationshipTypes.map((_: RelationshipType, i: number) => `@rel${i}`).join(',')})`;
        params.relationshipTypes.forEach((type: RelationshipType, i: number) => {
          parameters.push({ name: `@rel${i}`, value: type });
        });
      }

      if (params.fromShardId) {
        query += ` AND l.fromShardId = @fromShardId`;
        parameters.push({ name: '@fromShardId', value: params.fromShardId });
      }

      if (params.toShardId) {
        query += ` AND l.toShardId = @toShardId`;
        parameters.push({ name: '@toShardId', value: params.toShardId });
      }

      if (params.onlyBidirectional) {
        query += ` AND l.isBidirectional = true`;
      }

      if (params.onlyFromRecommendations) {
        query += ` AND l.fromRecommendation = true`;
      }

      if (params.createdAfter) {
        query += ` AND l.createdAt >= @createdAfter`;
        parameters.push({ name: '@createdAfter', value: new Date(params.createdAfter) });
      }

      if (params.createdBefore) {
        query += ` AND l.createdAt <= @createdBefore`;
        parameters.push({ name: '@createdBefore', value: new Date(params.createdBefore) });
      }

      // Apply sorting
      const sortBy = params.sortBy || 'createdAt';
      const sortDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
      const sortField = sortBy === 'strength' ? 'l.strength' : sortBy === 'priority' ? 'l.priority' : sortBy === 'accessCount' ? 'l.metadata.accessCount' : 'l.createdAt';

      query += ` ORDER BY ${sortField} ${sortDir}`;

      // Get total count
      const totalActivities = await this.cosmosDB.queryDocuments<ShardLink>(
        'project-shard-links',
        query + ` OFFSET 0 LIMIT 999999`,
        parameters,
        tenantId,
      );

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;

      const paginatedQuery = query + ` OFFSET @offset LIMIT @limit`;
      parameters.push(
        { name: '@offset', value: offset },
        { name: '@limit', value: limit },
      );

      const links = await this.cosmosDB.queryDocuments<ShardLink>(
        'project-shard-links',
        paginatedQuery,
        parameters,
        tenantId,
      );

      const totalCount = totalActivities.length;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: links,
        totalCount,
        pageNumber: page,
        totalPages,
        pageSize: limit,
        hasMore: page < totalPages,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get links: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get a shard with all its links (incoming and outgoing)
   */
  async getShardWithLinks(
    tenantId: string,
    projectId: string,
    shardId: string,
  ): Promise<ShardWithLinks | null> {
    try {
      const cacheKey = `shard-with-links:${shardId}`;
      const cached = await this.cache.get<ShardWithLinks>(cacheKey);
      if (cached) {return cached;}

      // Get outgoing links
      const outgoingQuery = `
        SELECT * FROM project_shard_links l
        WHERE l.tenantId = @tenantId AND l.projectId = @projectId
        AND l.fromShardId = @shardId AND l.isActive = true
        ORDER BY l.priority ASC, l.createdAt DESC
      `;

      const outgoingLinks = await this.cosmosDB.queryDocuments<ShardLink>(
        'project-shard-links',
        outgoingQuery,
        [
          { name: '@tenantId', value: tenantId },
          { name: '@projectId', value: projectId },
          { name: '@shardId', value: shardId },
        ],
        tenantId,
      );

      // Get incoming links
      const incomingQuery = `
        SELECT * FROM project_shard_links l
        WHERE l.tenantId = @tenantId AND l.projectId = @projectId
        AND l.toShardId = @shardId AND l.isActive = true
        ORDER BY l.priority ASC, l.createdAt DESC
      `;

      const incomingLinks = await this.cosmosDB.queryDocuments<ShardLink>(
        'project-shard-links',
        incomingQuery,
        [
          { name: '@tenantId', value: tenantId },
          { name: '@projectId', value: projectId },
          { name: '@shardId', value: shardId },
        ],
        tenantId,
      );

      // Build related shards with distances
      const relatedShards = new Map<
        string,
        { distance: number; relationshipTypes: RelationshipType[] }
      >();

      outgoingLinks.forEach((link: ShardLink) => {
        const key = link.toShardId;
        const existing = relatedShards.get(key);
        if (existing) {
          existing.relationshipTypes.push(link.relationshipType);
          existing.distance = Math.min(existing.distance, 1);
        } else {
          relatedShards.set(key, {
            distance: 1,
            relationshipTypes: [link.relationshipType],
          });
        }
      });

      incomingLinks.forEach((link: ShardLink) => {
        const key = link.fromShardId;
        const existing = relatedShards.get(key);
        if (existing) {
          existing.relationshipTypes.push(link.relationshipType);
        } else {
          relatedShards.set(key, {
            distance: 1,
            relationshipTypes: [link.relationshipType],
          });
        }
      });

      const result: ShardWithLinks = {
        shardId,
        shardName: '', // Would be fetched from shard service
        shardType: '', // Would be fetched from shard service
        outgoingLinks: outgoingLinks.map((link: ShardLink) => ({
          link,
          targetShard: {
            id: link.toShardId,
            name: link.toShardName || 'Unknown',
            type: link.toShardType || 'Unknown',
          },
        })),
        incomingLinks: incomingLinks.map((link: ShardLink) => ({
          link,
          sourceShard: {
            id: link.fromShardId,
            name: link.fromShardName || 'Unknown',
            type: link.fromShardType || 'Unknown',
          },
        })),
        linkCount: outgoingLinks.length + incomingLinks.length,
        relatedShards: Array.from(relatedShards.entries()).map(([shardId, data]) => ({
          shardId,
          shardName: '', // Would be fetched
          relationshipTypes: [...new Set(data.relationshipTypes)],
          distance: data.distance,
        })),
      };

      await this.cache.set(cacheKey, result, this.LINKS_CACHE_TTL);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get shard with links: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get link statistics for a project
   */
  async getLinkStatistics(tenantId: string, projectId: string): Promise<LinkStatistics> {
    try {
      const cacheKey = `link-stats:${projectId}`;
      const cached = await this.cache.get<LinkStatistics>(cacheKey);
      if (cached) {return cached;}

      // Get all active links
      const page = await this.getLinks(tenantId, projectId, { limit: 999999 });
      const links = page.items;

      // Calculate statistics
      const byRelationshipType: Record<RelationshipType, number> = {} as any;
      const shardLinkCounts = new Map<string, { in: number; out: number }>();

      Object.values(RelationshipType).forEach((type) => {
        byRelationshipType[type as RelationshipType] = 0;
      });

      let bidirectionalCount = 0;
      let totalStrength = 0;
      let recommendationCount = 0;

      links.forEach((link: ShardLink) => {
        byRelationshipType[link.relationshipType]++;

        if (link.isBidirectional) {bidirectionalCount++;}
        totalStrength += link.strength;
        if (link.fromRecommendation) {recommendationCount++;}

        // Track shard link counts
        const fromStats = shardLinkCounts.get(link.fromShardId) || { in: 0, out: 0 };
        fromStats.out++;
        shardLinkCounts.set(link.fromShardId, fromStats);

        const toStats = shardLinkCounts.get(link.toShardId) || { in: 0, out: 0 };
        toStats.in++;
        shardLinkCounts.set(link.toShardId, toStats);
      });

      const mostLinkedShards = Array.from(shardLinkCounts.entries())
        .map(([shardId, stats]) => ({
          shardId,
          shardName: '', // Would be fetched
          linkCount: stats.in + stats.out,
          direction: (stats.in > 0 && stats.out > 0 ? 'both' : stats.in > 0 ? 'in' : 'out') as any,
        }))
        .sort((a, b) => b.linkCount - a.linkCount)
        .slice(0, 10);

      const stats: LinkStatistics = {
        totalLinks: links.length,
        byRelationshipType,
        bidirectionalCount,
        unidirectionalCount: links.length - bidirectionalCount,
        averageStrength: links.length > 0 ? totalStrength / links.length : 0,
        mostLinkedShards,
        recommendationLinksCount: recommendationCount,
        manualLinksCount: links.length - recommendationCount,
        qualityScore: links.length > 0 ? Math.min(100, (recommendationCount / links.length) * 50 + 50) : 0,
      };

      await this.cache.set(cacheKey, stats, this.STATS_CACHE_TTL);
      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get link statistics: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Validate a link before creation
   */
  async validateLink(
    tenantId: string,
    projectId: string,
    input: CreateLinkInput,
  ): Promise<LinkValidationResult> {
    const errors = [];
    const warnings = [];

    // Validate shards exist
    if (!input.fromShardId || !input.toShardId) {
      errors.push({ field: 'shards', message: 'Both fromShardId and toShardId are required' });
    }

    if (input.fromShardId === input.toShardId) {
      errors.push({ field: 'shards', message: 'Cannot link a shard to itself' });
    }

    // Validate relationship type
    if (!input.relationshipType) {
      errors.push({ field: 'relationshipType', message: 'Relationship type is required' });
    }

    // Validate custom label if relationship is CUSTOM
    if (input.relationshipType === RelationshipType.CUSTOM && !input.customLabel) {
      errors.push({ field: 'customLabel', message: 'Custom label required for CUSTOM relationship type' });
    }

    // Validate strength
    if (input.strength !== undefined && (input.strength < 0 || input.strength > 1)) {
      errors.push({ field: 'strength', message: 'Strength must be between 0 and 1' });
    }

    // Check for duplicate link
    if (input.fromShardId && input.toShardId) {
      const existingQuery = `
        SELECT * FROM project_shard_links l
        WHERE l.tenantId = @tenantId AND l.projectId = @projectId
        AND l.fromShardId = @fromShardId AND l.toShardId = @toShardId
        AND l.isActive = true
      `;

      try {
        const existing = await this.cosmosDB.queryDocuments<ShardLink>(
          'project-shard-links',
          existingQuery,
          [
            { name: '@tenantId', value: tenantId },
            { name: '@projectId', value: projectId },
            { name: '@fromShardId', value: input.fromShardId },
            { name: '@toShardId', value: input.toShardId },
          ],
          tenantId,
        );

        if (existing.length > 0) {
          warnings.push({
            field: 'duplicate',
            message: 'A link between these shards already exists',
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to check for duplicate links: ${errorMessage}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestedRelationshipTypes: errors.length > 0 ? undefined : [RelationshipType.ASSOCIATED_WITH],
    };
  }

  /**
   * Analyze impact of removing a link
   */
  async analyzeLinkImpact(
    tenantId: string,
    projectId: string,
    linkId: string,
  ): Promise<LinkImpactAnalysis> {
    try {
      const link = await this.getLink(tenantId, projectId, linkId);
      if (!link) {
        return {
          affectedShards: [],
          dependentOperations: [],
          riskLevel: 'low',
          recommendations: [],
        };
      }

      // Get reverse/related links
      const relatedQuery = `
        SELECT * FROM project_shard_links l
        WHERE l.tenantId = @tenantId AND l.projectId = @projectId
        AND l.isActive = true
        AND (l.fromShardId = @fromShardId OR l.toShardId = @fromShardId
             OR l.fromShardId = @toShardId OR l.toShardId = @toShardId)
      `;

      const relatedLinks = await this.cosmosDB.queryDocuments<ShardLink>(
        'project-shard-links',
        relatedQuery,
        [
          { name: '@tenantId', value: tenantId },
          { name: '@projectId', value: projectId },
          { name: '@fromShardId', value: link.fromShardId },
          { name: '@toShardId', value: link.toShardId },
        ],
        tenantId,
      );

      // Determine risk level based on relationship type
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (link.relationshipType === RelationshipType.BLOCKING_TASK) {riskLevel = 'critical';}
      else if (link.relationshipType === RelationshipType.DEPENDS_ON) {riskLevel = 'high';}
      else if (link.relationshipType === RelationshipType.PARENT_OF) {riskLevel = 'high';}
      else if (link.relationshipType === RelationshipType.RELATED_CONTEXT) {riskLevel = 'low';}

      const analysis: LinkImpactAnalysis = {
        affectedShards: [link.fromShardId, link.toShardId],
        dependentOperations: relatedLinks
          .filter((l: ShardLink) => l.id !== linkId)
          .map((l: ShardLink) => ({
            type: 'link',
            id: l.id,
            description: `${l.relationshipType} relationship`,
          })),
        riskLevel,
        recommendations: [
          'Review linked shards before deletion',
          riskLevel === 'critical' ? 'This is a critical link, consider impact on project workflow' : '',
          relatedLinks.length > 0 ? `This link has ${relatedLinks.length} related links` : '',
        ].filter((r) => r),
        alternatives: relatedLinks.length > 0 ? relatedLinks.slice(0, 3) : undefined,
      };

      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to analyze link impact: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Track link access/usage
   */
  async recordLinkAccess(tenantId: string, projectId: string, linkId: string): Promise<void> {
    try {
      const link = await this.getLink(tenantId, projectId, linkId);
      if (!link) {return;}

      if (!link.metadata) {link.metadata = {};}
      link.metadata.accessCount = (link.metadata.accessCount || 0) + 1;
      link.metadata.lastAccessedAt = new Date();

      await this.linksContainer.items.upsert(link);
      await this.cache.delete(`link:${linkId}`); // Invalidate cache
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to record link access: ${errorMessage}`);
    }
  }

  /**
   * Rate a link
   */
  async rateLink(
    tenantId: string,
    projectId: string,
    linkId: string,
    rating: number,
  ): Promise<void> {
    try {
      if (rating < 0 || rating > 5) {
        throw new Error('Rating must be between 0 and 5');
      }

      const link = await this.getLink(tenantId, projectId, linkId);
      if (!link) {
        throw new Error(`Link ${linkId} not found`);
      }

      if (!link.metadata) {link.metadata = {};}
      link.metadata.userRating = rating;

      await this.linksContainer.items.upsert(link);
      await this.cache.delete(`link:${linkId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to rate link: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Helper: Invalidate link-related caches
   */
  private async invalidateLinkCaches(tenantId: string, projectId: string): Promise<void> {
    const keysToDelete = [
      `links:${projectId}:*`,
      `shard-with-links:*`,
      `link-stats:${projectId}`,
    ];

    for (const key of keysToDelete) {
      await this.cache.delete(key);
    }
  }

  /**
   * Helper: Log activity
   */
  private async logActivity(
    tenantId: string,
    projectId: string,
    input: Partial<CreateActivityInput>,
  ): Promise<void> {
    try {
      const activity: ProjectActivity = {
        id: uuidv4(),
        tenantId,
        projectId,
        type: input.type!,
        actorUserId: input.actorUserId!,
        actorDisplayName: input.actorDisplayName!,
        description: input.description!,
        severity: input.severity!,
        details: input.details || {},
        timestamp: new Date(),
        ttl: 7776000, // 90 days
      };

      await this.cosmosDB.upsertDocument('project-activities', activity, tenantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to log activity: ${errorMessage}`);
    }
  }
}
