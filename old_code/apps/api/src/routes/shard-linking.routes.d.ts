/**
 * Shard Linking Routes
 * API endpoints for shard relationship management
 */
import { ShardLinkingService } from '../services/shard-linking.service';
import { ShardLink, CreateLinkInput, UpdateLinkInput, BulkLinkInput, BulkLinkResult, MultiProjectBulkLinkInput, ShardWithLinks, LinkQueryParams, LinkPage, LinkStatistics, LinkValidationResult, LinkImpactAnalysis } from '../types/shard-linking.types';
import { UserJWT } from '../types/auth.types';
export declare class ShardLinkingController {
    private shardLinkingService;
    constructor(shardLinkingService: ShardLinkingService);
    /**
     * POST /api/v1/shards/links
     * Create a single link between two shards
     */
    createLink(input: CreateLinkInput, tenantId: string, user: UserJWT): Promise<ShardLink>;
    /**
     * POST /api/v1/shards/links/bulk
     * Create multiple links in bulk
     */
    bulkCreateLinks(input: BulkLinkInput, tenantId: string, user: UserJWT): Promise<BulkLinkResult>;
    /**
     * POST /api/v1/shards/links/bulk-multi-project
     * Create links across multiple projects in bulk
     */
    bulkCreateLinksMultiProject(input: MultiProjectBulkLinkInput, tenantId: string, user: UserJWT): Promise<BulkLinkResult>;
    /**
     * GET /api/v1/shards/links/validate
     * Validate a link before creation
     */
    validateLink(projectId: string, fromShardId: string, toShardId: string, relationshipType: string, tenantId: string): Promise<LinkValidationResult>;
    /**
     * GET /api/v1/shards/links/:linkId
     * Get a specific link by ID
     */
    getLink(linkId: string, projectId: string, tenantId: string): Promise<ShardLink | null>;
    /**
     * GET /api/v1/shards/links
     * Query links with filtering and pagination
     */
    getLinks(params: LinkQueryParams & {
        projectId: string;
    }, tenantId: string): Promise<LinkPage>;
    /**
     * GET /api/v1/shards/:shardId/with-links
     * Get a shard with all its incoming and outgoing links
     */
    getShardWithLinks(shardId: string, projectId: string, tenantId: string): Promise<ShardWithLinks | null>;
    /**
     * GET /api/v1/shards/links/statistics
     * Get link statistics for a project
     */
    getLinkStatistics(projectId: string, tenantId: string): Promise<LinkStatistics>;
    /**
     * GET /api/v1/shards/links/:linkId/impact
     * Analyze impact of deleting a link
     */
    analyzeLinkImpact(linkId: string, projectId: string, tenantId: string): Promise<LinkImpactAnalysis>;
    /**
     * PATCH /api/v1/shards/links/:linkId
     * Update an existing link
     */
    updateLink(linkId: string, input: UpdateLinkInput, projectId: string, tenantId: string, user: UserJWT): Promise<ShardLink>;
    /**
     * POST /api/v1/shards/links/:linkId/access
     * Record link access/usage
     */
    recordLinkAccess(linkId: string, projectId: string, tenantId: string): Promise<void>;
    /**
     * POST /api/v1/shards/links/:linkId/rate
     * Rate a link
     */
    rateLink(linkId: string, projectId: string, rating: number, tenantId: string): Promise<void>;
    /**
     * DELETE /api/v1/shards/links/:linkId
     * Delete a link
     */
    deleteLink(linkId: string, projectId: string, tenantId: string, user: UserJWT): Promise<void>;
}
/**
 * Admin Routes for Shard Linking (super admin only)
 */
export declare class AdminShardLinkingController {
    private shardLinkingService;
    constructor(shardLinkingService: ShardLinkingService);
    /**
     * GET /api/v1/admin/shards/links/export
     * Export all links for a project (CSV/JSON)
     */
    exportLinks(projectId: string, format: "csv" | "json" | undefined, tenantId: string): Promise<any>;
    /**
     * POST /api/v1/admin/shards/links/cleanup
     * Clean up orphaned or invalid links
     */
    cleanupOrphanedLinks(projectId: string, tenantId: string, user: UserJWT): Promise<{
        cleanedUp: number;
        errors: string[];
    }>;
    /**
     * PATCH /api/v1/admin/shards/links/:linkId/force-update
     * Force update a link bypassing normal validation
     */
    forceUpdateLink(linkId: string, input: Partial<ShardLink>, projectId: string, tenantId: string, user: UserJWT): Promise<ShardLink>;
}
//# sourceMappingURL=shard-linking.routes.d.ts.map