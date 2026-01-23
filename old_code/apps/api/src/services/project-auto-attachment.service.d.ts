/**
 * Project Auto-Attachment Service (Phase 2)
 *
 * Automatically links shards to projects based on overlap rules:
 * - Entity overlap: Same company, contact, account IDs
 * - Actor overlap: Same user IDs, team members
 * - Time windows: Shards created within 30 days of project activity
 * - Explicit references: Shard content mentions project name/ID
 *
 * Trigger: Service Bus events (shard-created) or Change Feed
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Shard } from '../types/shard.types.js';
interface AutoAttachmentConfig {
}
export declare class ProjectAutoAttachmentService {
    private shardRepository;
    private monitoring;
    private config;
    private readonly ACTIVITY_TIME_WINDOW_DAYS;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, config?: AutoAttachmentConfig);
    /**
     * Process shard creation event and auto-attach to projects
     */
    processShardCreated(shard: Shard): Promise<void>;
    /**
     * Find candidate projects for auto-attachment
     */
    private findCandidateProjects;
    /**
     * Evaluate overlap rules between shard and project
     */
    private evaluateOverlapRules;
    /**
     * Check entity overlap (same company, contact, account IDs)
     */
    private checkEntityOverlap;
    /**
     * Check actor overlap (same user IDs, team members)
     */
    private checkActorOverlap;
    /**
     * Check time window overlap (shards created within 30 days of project activity)
     */
    private checkTimeWindowOverlap;
    /**
     * Check explicit references (shard content mentions project name/ID)
     */
    private checkExplicitReferences;
    /**
     * Attach shard to project with relationship metadata
     */
    private attachShardToProject;
    /**
     * Manual link/unlink via API
     */
    linkShardToProject(shardId: string, projectId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * Unlink shard from project
     */
    unlinkShardFromProject(shardId: string, projectId: string, tenantId: string): Promise<void>;
}
export {};
//# sourceMappingURL=project-auto-attachment.service.d.ts.map