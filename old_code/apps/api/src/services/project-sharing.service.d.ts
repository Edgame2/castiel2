/**
 * Project Sharing Service
 * Manages project ownership, collaboration, bulk sharing, and notifications
 * Integrates with NotificationService and audit system for comprehensive tracking
 */
import { CosmosDBService } from './cosmos-db.service';
import { NotificationService } from './notification.service';
import { CacheService } from './cache.service';
import { ProjectCollaborator, BulkShareInput, BulkShareResult, ShareProjectInput, TransferOwnershipInput, RevokeAccessInput, UpdateCollaboratorRoleInput, SharedProject, SharingStatistics } from '../types/project-sharing.types';
export declare class ProjectSharingService {
    private cosmosDB;
    private notificationService;
    private cache;
    private readonly logger;
    private readonly SHARING_CACHE_TTL;
    private readonly COLLABORATORS_CACHE_TTL;
    private readonly PENDING_INVITATIONS_CACHE_TTL;
    constructor(cosmosDB: CosmosDBService, notificationService: NotificationService, cache: CacheService);
    /**
     * Share project with a single user
     * Creates collaborator record, sends notification, logs activity
     */
    shareWithUser(tenantId: string, projectId: string, input: ShareProjectInput, actorUserId: string, actorDisplayName: string): Promise<ProjectCollaborator>;
    /**
     * Share project with multiple users in bulk
     * Optimized for batch operations with progress tracking
     */
    bulkShareProjects(tenantId: string, input: BulkShareInput, actorUserId: string, actorDisplayName: string): Promise<BulkShareResult>;
    /**
     * Get single collaborator record
     */
    getCollaborator(tenantId: string, projectId: string, userId: string): Promise<ProjectCollaborator | null>;
    /**
     * Get all collaborators for a project
     */
    getCollaborators(tenantId: string, projectId: string): Promise<ProjectCollaborator[]>;
    /**
     * Revoke user access to project
     */
    revokeAccess(tenantId: string, projectId: string, input: RevokeAccessInput, actorUserId: string, actorDisplayName: string): Promise<void>;
    /**
     * Transfer project ownership to another user
     */
    transferOwnership(tenantId: string, projectId: string, input: TransferOwnershipInput, actorUserId: string, actorDisplayName: string): Promise<void>;
    /**
     * Update collaborator role
     */
    updateCollaboratorRole(tenantId: string, projectId: string, input: UpdateCollaboratorRoleInput, actorUserId: string, actorDisplayName: string): Promise<ProjectCollaborator>;
    /**
     * Get projects shared with a specific user
     */
    getSharedProjects(tenantId: string, userId: string): Promise<SharedProject[]>;
    /**
     * Get sharing statistics for a tenant
     */
    getSharingStatistics(tenantId: string): Promise<SharingStatistics>;
    /**
     * Accept pending invitation
     */
    acceptInvitation(tenantId: string, projectId: string, userId: string, invitationToken: string): Promise<void>;
    /**
     * Decline pending invitation
     */
    declineInvitation(tenantId: string, projectId: string, userId: string, invitationToken: string): Promise<void>;
    /**
     * Helper: Invalidate project-related caches
     */
    private invalidateProjectCaches;
    /**
     * Helper: Determine project status
     */
    private getProjectStatus;
    /**
     * Helper: Log activity (delegates to activity service)
     * In real implementation, would inject ActivityService
     */
    private logActivity;
}
//# sourceMappingURL=project-sharing.service.d.ts.map