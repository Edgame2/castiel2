/**
 * Shard Linking Service
 * Manages shard relationships with enhanced linking, validation, and bulk operations
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Redis } from 'ioredis';
import { ShardLink, CreateLinkInput, UpdateLinkInput, BulkLinkInput, BulkLinkResult, MultiProjectBulkLinkInput, ShardWithLinks, LinkQueryParams, LinkPage, LinkStatistics, LinkValidationResult, LinkImpactAnalysis } from '../types/shard-linking.types';
export declare class ShardLinkingService {
    private readonly LINK_CACHE_TTL;
    private readonly LINKS_CACHE_TTL;
    private readonly STATS_CACHE_TTL;
    private client;
    private database;
    private linksContainer;
    private monitoring;
    private shardRepository;
    private redis?;
    private logger;
    constructor(shardRepository: ShardRepository, monitoring: IMonitoringProvider, redis?: Redis);
    /**
     * Helper: Query documents using Cosmos container
     */
    private queryDocuments;
    /**
     * Helper: Get cache service wrapper
     */
    private get cache();
    /**
     * Helper: Get cosmosDB service wrapper
     */
    private get cosmosDB();
    /**
     * Create a single link between two shards
     */
    createLink(tenantId: string, projectId: string, input: CreateLinkInput, createdByUserId: string): Promise<ShardLink>;
    /**
     * Update an existing link
     */
    updateLink(tenantId: string, projectId: string, linkId: string, input: UpdateLinkInput, updatedByUserId: string): Promise<ShardLink>;
    /**
     * Delete a link with impact analysis
     */
    deleteLink(tenantId: string, projectId: string, linkId: string, deletedByUserId: string): Promise<void>;
    /**
     * Create multiple links in bulk
     */
    bulkCreateLinks(tenantId: string, input: BulkLinkInput, createdByUserId: string): Promise<BulkLinkResult>;
    /**
     * Create links across multiple projects
     */
    bulkCreateLinksMultiProject(tenantId: string, input: MultiProjectBulkLinkInput, createdByUserId: string): Promise<BulkLinkResult>;
    /**
     * Get single link by ID
     */
    getLink(tenantId: string, projectId: string, linkId: string): Promise<ShardLink | null>;
    /**
     * Query links with filtering and pagination
     */
    getLinks(tenantId: string, projectId: string, params?: LinkQueryParams): Promise<LinkPage>;
    /**
     * Get a shard with all its links (incoming and outgoing)
     */
    getShardWithLinks(tenantId: string, projectId: string, shardId: string): Promise<ShardWithLinks | null>;
    /**
     * Get link statistics for a project
     */
    getLinkStatistics(tenantId: string, projectId: string): Promise<LinkStatistics>;
    /**
     * Validate a link before creation
     */
    validateLink(tenantId: string, projectId: string, input: CreateLinkInput): Promise<LinkValidationResult>;
    /**
     * Analyze impact of removing a link
     */
    analyzeLinkImpact(tenantId: string, projectId: string, linkId: string): Promise<LinkImpactAnalysis>;
    /**
     * Track link access/usage
     */
    recordLinkAccess(tenantId: string, projectId: string, linkId: string): Promise<void>;
    /**
     * Rate a link
     */
    rateLink(tenantId: string, projectId: string, linkId: string, rating: number): Promise<void>;
    /**
     * Helper: Invalidate link-related caches
     */
    private invalidateLinkCaches;
    /**
     * Helper: Log activity
     */
    private logActivity;
}
//# sourceMappingURL=shard-linking.service.d.ts.map