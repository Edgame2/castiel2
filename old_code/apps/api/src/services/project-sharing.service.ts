// @ts-nocheck
/**
 * Project Sharing Service
 * Manages project ownership, collaboration, bulk sharing, and notifications
 * Integrates with NotificationService and audit system for comprehensive tracking
 */

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CosmosDBService } from './cosmos-db.service';
import { NotificationService } from './notification.service';
import { CacheService } from './cache.service';
import {
  ProjectRole,
  ProjectCollaborator,
  ProjectSharingInfo,
  BulkShareInput,
  BulkShareResult,
  ShareProjectInput,
  TransferOwnershipInput,
  RevokeAccessInput,
  UpdateCollaboratorRoleInput,
  SharedProject,
  CollaboratorDTO,
  SharingStatistics,
  BulkOperationAudit,
  OwnershipHistoryEntry,
} from '../types/project-sharing.types';
import { ProjectActivity, ProjectActivityType, ActivitySeverity, CreateActivityInput } from '../types/project-activity.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectSharingService {
  private readonly logger = new Logger(ProjectSharingService.name);
  private readonly SHARING_CACHE_TTL = 3600; // 1 hour
  private readonly COLLABORATORS_CACHE_TTL = 300; // 5 minutes
  private readonly PENDING_INVITATIONS_CACHE_TTL = 600; // 10 minutes

  constructor(
    @Inject(CosmosDBService) private cosmosDB: CosmosDBService,
    @Inject(NotificationService) private notificationService: NotificationService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  /**
   * Share project with a single user
   * Creates collaborator record, sends notification, logs activity
   */
  async shareWithUser(
    tenantId: string,
    projectId: string,
    input: ShareProjectInput,
    actorUserId: string,
    actorDisplayName: string,
  ): Promise<ProjectCollaborator> {
    try {
      // Validate inputs
      if (!input.userId || !input.role) {
        throw new BadRequestException('userId and role are required');
      }

      if (input.userId === actorUserId) {
        throw new BadRequestException('Cannot share project with yourself');
      }

      // Check if already collaborator
      const existingCollaborator = await this.getCollaborator(tenantId, projectId, input.userId);
      if (existingCollaborator && existingCollaborator.isActive) {
        throw new BadRequestException('User already has access to this project');
      }

      // Fetch tenant config to check role-based sharing enabled
      const tenantConfig = await this.cosmosDB.getDocument('tenant-configs', tenantId, tenantId);
      const roleBasedSharingEnabled = tenantConfig?.projectSettings?.roleBasedSharingEnabled ?? true;

      if (!roleBasedSharingEnabled && input.role !== ProjectRole.VIEWER) {
        throw new BadRequestException(
          'Tenant has disabled role-based sharing. Only Viewer role is allowed.',
        );
      }

      // Create collaborator record
      const collaborator: ProjectCollaborator = {
        id: uuidv4(),
        tenantId,
        projectId,
        userId: input.userId,
        displayName: '', // Will be populated by notification service from user data
        email: '', // Will be populated by notification service
        role: input.role,
        grantedBy: actorUserId,
        grantedAt: new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        isPending: input.requireAcceptance ?? false,
        invitationToken: input.requireAcceptance ? uuidv4() : undefined,
        invitationExpiry: input.requireAcceptance ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
        isActive: true,
        accessReason: input.reason,
        notificationPreferences: {
          sharingNotifications: true,
          activityDigest: true,
          digestFrequency: 'daily',
        },
      };

      // Save to database
      await this.cosmosDB.upsertDocument('project-collaborators', collaborator, tenantId);

      // Invalidate caches
      await this.invalidateProjectCaches(tenantId, projectId);

      // Send notification
      await this.notificationService.notifyProjectShared({
        recipientUserId: input.userId,
        projectId,
        projectName: '', // Will be fetched by notification service
        sharerUserId: actorUserId,
        sharerDisplayName: actorDisplayName,
        role: input.role,
        message: input.notificationMessage,
        invitationToken: collaborator.invitationToken,
        expiresAt: collaborator.expiresAt,
      });

      // Log activity
      await this.logActivity(tenantId, projectId, {
        type: ProjectActivityType.PROJECT_SHARED,
        actorUserId,
        actorDisplayName,
        description: `${actorDisplayName} shared project with ${input.userId} as ${input.role}`,
        severity: ActivitySeverity.MEDIUM,
        details: {
          sharedWith: input.userId,
          sharedWithRole: input.role,
        },
        affectedUserId: input.userId,
      });

      this.logger.log(`Project ${projectId} shared with user ${input.userId} by ${actorUserId}`);
      return collaborator;
    } catch (error) {
      this.logger.error(`Failed to share project: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Share project with multiple users in bulk
   * Optimized for batch operations with progress tracking
   */
  async bulkShareProjects(
    tenantId: string,
    input: BulkShareInput,
    actorUserId: string,
    actorDisplayName: string,
  ): Promise<BulkShareResult> {
    const operationId = uuidv4();
    const startTime = Date.now();

    try {
      const projectResults: BulkShareResult['projectResults'] = [];
      let successCount = 0;
      let failureCount = 0;
      const notifiedUsers = new Set<string>();

      // Process each project
      for (const projectId of input.projectIds) {
        try {
          // Verify project ownership/access
          const project = await this.cosmosDB.getDocument('projects', projectId, tenantId);
          if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
          }

          // Share with each recipient
          const sharedWith: string[] = [];
          for (const recipient of input.recipients) {
            try {
              await this.shareWithUser(
                tenantId,
                projectId,
                {
                  userId: recipient.userId,
                  role: recipient.role,
                  requireAcceptance: input.requireAcceptance,
                  expirationDays: input.expirationDays
                    ? new Date(Date.now() + input.expirationDays * 24 * 60 * 60 * 1000).toISOString()
                    : undefined,
                  notificationMessage: input.message,
                },
                actorUserId,
                actorDisplayName,
              );

              sharedWith.push(recipient.userId);
              notifiedUsers.add(recipient.userId);
            } catch (error) {
              this.logger.warn(
                `Failed to share ${projectId} with ${recipient.userId}: ${error.message}`,
              );
            }
          }

          projectResults.push({
            projectId,
            projectName: project.name,
            sharedWith,
          });

          successCount++;
        } catch (error) {
          failureCount++;
          projectResults.push({
            projectId,
            projectName: '',
            sharedWith: [],
            failureReason: error.message,
          });

          this.logger.error(`Failed to share project ${projectId}: ${error.message}`);
        }
      }

      // Log bulk operation audit
      const auditEntry: BulkOperationAudit = {
        operationId,
        operationType: 'bulk-share',
        initiatedBy: actorUserId,
        tenantId,
        resourceCount: input.projectIds.length,
        timestamp: new Date(),
        status: 'completed',
        successCount,
        failureCount,
        details: {
          recipientCount: input.recipients.length,
          projectIds: input.projectIds,
        },
      };

      await this.cosmosDB.upsertDocument('bulk-operation-audits', auditEntry, tenantId);

      // Log activity for bulk operation
      await this.logActivity(tenantId, input.projectIds[0], {
        type: ProjectActivityType.PROJECT_SHARED,
        actorUserId,
        actorDisplayName,
        description: `${actorDisplayName} shared ${successCount} project(s) with ${notifiedUsers.size} user(s)`,
        severity: ActivitySeverity.HIGH,
        details: {
          bulkShareCount: successCount,
        },
      });

      const result: BulkShareResult = {
        successCount,
        failureCount,
        notifiedRecipients: notifiedUsers.size,
        projectResults,
        timestamp: new Date(),
        operationId,
      };

      this.logger.log(
        `Bulk share completed: ${successCount}/${input.projectIds.length} projects, ${notifiedUsers.size} recipients, in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Bulk share operation failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get single collaborator record
   */
  async getCollaborator(
    tenantId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectCollaborator | null> {
    try {
      const cacheKey = `collaborator:${projectId}:${userId}`;
      const cached = await this.cache.get<ProjectCollaborator>(cacheKey);
      if (cached) {return cached;}

      const collaborators = await this.getCollaborators(tenantId, projectId);
      const collaborator = collaborators.find((c) => c.userId === userId) || null;

      if (collaborator) {
        await this.cache.set(cacheKey, collaborator, this.COLLABORATORS_CACHE_TTL);
      }

      return collaborator;
    } catch (error) {
      this.logger.error(`Failed to get collaborator: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all collaborators for a project
   */
  async getCollaborators(tenantId: string, projectId: string): Promise<ProjectCollaborator[]> {
    try {
      const cacheKey = `collaborators:${projectId}`;
      const cached = await this.cache.get<ProjectCollaborator[]>(cacheKey);
      if (cached) {return cached;}

      const query = `
        SELECT * FROM project_collaborators c
        WHERE c.projectId = @projectId AND c.tenantId = @tenantId AND c.isActive = true
        ORDER BY c.grantedAt DESC
      `;

      const collaborators = await this.cosmosDB.queryDocuments<ProjectCollaborator>(
        'project-collaborators',
        query,
        [
          { name: '@projectId', value: projectId },
          { name: '@tenantId', value: tenantId },
        ],
        tenantId,
      );

      await this.cache.set(cacheKey, collaborators, this.COLLABORATORS_CACHE_TTL);
      return collaborators;
    } catch (error) {
      this.logger.error(`Failed to get collaborators: ${error.message}`);
      return [];
    }
  }

  /**
   * Revoke user access to project
   */
  async revokeAccess(
    tenantId: string,
    projectId: string,
    input: RevokeAccessInput,
    actorUserId: string,
    actorDisplayName: string,
  ): Promise<void> {
    try {
      const collaborator = await this.getCollaborator(tenantId, projectId, input.userId);
      if (!collaborator) {
        throw new NotFoundException(`User ${input.userId} is not a collaborator on this project`);
      }

      if (collaborator.role === ProjectRole.OWNER) {
        throw new ForbiddenException('Cannot revoke access from project owner');
      }

      // Mark as inactive (soft delete)
      collaborator.isActive = false;
      await this.cosmosDB.upsertDocument('project-collaborators', collaborator, tenantId);

      // Invalidate caches
      await this.invalidateProjectCaches(tenantId, projectId);

      // Send notification if requested
      if (input.sendNotification) {
        await this.notificationService.notifyAccessRevoked({
          recipientUserId: input.userId,
          projectId,
          revokedBy: actorUserId,
          revokedByDisplayName: actorDisplayName,
          reason: input.reason,
          message: input.notificationMessage,
        });
      }

      // Log activity
      await this.logActivity(tenantId, projectId, {
        type: ProjectActivityType.PROJECT_UNSHARED,
        actorUserId,
        actorDisplayName,
        description: `${actorDisplayName} revoked access for ${input.userId}`,
        severity: ActivitySeverity.MEDIUM,
        details: {
          revokedUser: input.userId,
        },
        affectedUserId: input.userId,
      });

      this.logger.log(`Access revoked for user ${input.userId} on project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transfer project ownership to another user
   */
  async transferOwnership(
    tenantId: string,
    projectId: string,
    input: TransferOwnershipInput,
    actorUserId: string,
    actorDisplayName: string,
  ): Promise<void> {
    try {
      // Verify current project
      const project = await this.cosmosDB.getDocument('projects', projectId, tenantId);
      if (!project) {
        throw new NotFoundException(`Project ${projectId} not found`);
      }

      if (project.ownerId !== actorUserId) {
        throw new ForbiddenException('Only current owner can transfer ownership');
      }

      // Get or create collaborator record for new owner
      let newOwnerCollaborator = await this.getCollaborator(tenantId, projectId, input.newOwnerId);
      if (!newOwnerCollaborator) {
        // Create new collaborator record for new owner
        newOwnerCollaborator = {
          id: uuidv4(),
          tenantId,
          projectId,
          userId: input.newOwnerId,
          displayName: input.newOwnerDisplayName,
          email: '',
          role: ProjectRole.OWNER,
          grantedBy: actorUserId,
          grantedAt: new Date(),
          isPending: false,
          isActive: true,
        };
      } else {
        newOwnerCollaborator.role = ProjectRole.OWNER;
      }

      await this.cosmosDB.upsertDocument('project-collaborators', newOwnerCollaborator, tenantId);

      // Update previous owner's role
      const previousOwnerRole = input.previousOwnerRole ?? ProjectRole.MANAGER;
      const previousOwnerCollaborator = await this.getCollaborator(
        tenantId,
        projectId,
        actorUserId,
      );
      if (previousOwnerCollaborator) {
        previousOwnerCollaborator.role = previousOwnerRole;
        await this.cosmosDB.upsertDocument(
          'project-collaborators',
          previousOwnerCollaborator,
          tenantId,
        );
      }

      // Update project document
      project.ownerId = input.newOwnerId;
      project.ownerDisplayName = input.newOwnerDisplayName;
      project.updatedAt = new Date();

      // Update ownership history
      if (!project.ownershipHistory) {
        project.ownershipHistory = [];
      }

      if (project.ownershipHistory.length > 0) {
        const lastEntry = project.ownershipHistory[project.ownershipHistory.length - 1];
        if (!lastEntry.endDate) {
          lastEntry.endDate = new Date();
        }
      }

      project.ownershipHistory.push({
        userId: input.newOwnerId,
        displayName: input.newOwnerDisplayName,
        startDate: new Date(),
        reason: input.reason,
        initiatedBy: actorUserId,
      });

      await this.cosmosDB.upsertDocument('projects', project, tenantId);

      // Invalidate caches
      await this.invalidateProjectCaches(tenantId, projectId);

      // Send notifications
      if (input.notifyNewOwner) {
        await this.notificationService.notifyOwnershipTransferred({
          recipientUserId: input.newOwnerId,
          projectId,
          projectName: project.name,
          previousOwnerId: actorUserId,
          previousOwnerDisplayName: actorDisplayName,
          reason: input.reason,
        });
      }

      // Log activity
      await this.logActivity(tenantId, projectId, {
        type: ProjectActivityType.PROJECT_OWNERSHIP_TRANSFERRED,
        actorUserId,
        actorDisplayName,
        description: `${actorDisplayName} transferred project ownership to ${input.newOwnerDisplayName}`,
        severity: ActivitySeverity.HIGH,
        details: {
          newOwnerId: input.newOwnerId,
          newOwnerDisplayName: input.newOwnerDisplayName,
          previousOwnerId: actorUserId,
          previousOwnerRole,
        },
        affectedUserId: input.newOwnerId,
      });

      this.logger.log(
        `Ownership transferred for project ${projectId} from ${actorUserId} to ${input.newOwnerId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to transfer ownership: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    tenantId: string,
    projectId: string,
    input: UpdateCollaboratorRoleInput,
    actorUserId: string,
    actorDisplayName: string,
  ): Promise<ProjectCollaborator> {
    try {
      const collaborator = await this.getCollaborator(tenantId, projectId, input.userId);
      if (!collaborator) {
        throw new NotFoundException(`User ${input.userId} is not a collaborator on this project`);
      }

      if (collaborator.role === ProjectRole.OWNER) {
        throw new ForbiddenException('Cannot change role of project owner');
      }

      const previousRole = collaborator.role;
      collaborator.role = input.role;

      await this.cosmosDB.upsertDocument('project-collaborators', collaborator, tenantId);
      await this.invalidateProjectCaches(tenantId, projectId);

      if (input.sendNotification) {
        await this.notificationService.notifyRoleChanged({
          recipientUserId: input.userId,
          projectId,
          previousRole,
          newRole: input.role,
          changedByDisplayName: actorDisplayName,
          reason: input.reason,
        });
      }

      // Log activity
      await this.logActivity(tenantId, projectId, {
        type: ProjectActivityType.COLLABORATOR_ROLE_CHANGED,
        actorUserId,
        actorDisplayName,
        description: `${actorDisplayName} changed ${input.userId}'s role from ${previousRole} to ${input.role}`,
        severity: ActivitySeverity.MEDIUM,
        details: {
          userId: input.userId,
          previousRole,
          newRole: input.role,
        },
        affectedUserId: input.userId,
      });

      return collaborator;
    } catch (error) {
      this.logger.error(`Failed to update collaborator role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get projects shared with a specific user
   */
  async getSharedProjects(tenantId: string, userId: string): Promise<SharedProject[]> {
    try {
      const cacheKey = `shared-projects:${userId}`;
      const cached = await this.cache.get<SharedProject[]>(cacheKey);
      if (cached) {return cached;}

      const query = `
        SELECT p.id, p.name, p.ownerId, p.ownerDisplayName, p.description,
               c.role, c.grantedAt, c.isPending, c.expiresAt,
               (SELECT COUNT(1) FROM p.linkedShards) as linkedShardCount,
               (SELECT COUNT(1) FROM projects pp
                WHERE pp.tenantId = @tenantId AND pp.id = p.id) as collaboratorCount
        FROM project_collaborators c
        JOIN projects p ON c.projectId = p.id
        WHERE c.userId = @userId AND c.tenantId = @tenantId AND c.isActive = true
        ORDER BY c.grantedAt DESC
      `;

      const results = await this.cosmosDB.queryDocuments<any>(
        'project-collaborators',
        query,
        [
          { name: '@userId', value: userId },
          { name: '@tenantId', value: tenantId },
        ],
        tenantId,
      );

      const sharedProjects: SharedProject[] = results.map((r) => ({
        projectId: r.id,
        projectName: r.name,
        ownerId: r.ownerId,
        ownerDisplayName: r.ownerDisplayName,
        myRole: r.role,
        grantedAt: new Date(r.grantedAt),
        isPending: r.isPending,
        expiresAt: r.expiresAt ? new Date(r.expiresAt) : undefined,
        description: r.description,
        linkedShardCount: r.linkedShardCount || 0,
        collaboratorCount: r.collaboratorCount || 0,
        status: this.getProjectStatus(r.isPending, r.expiresAt),
      }));

      await this.cache.set(cacheKey, sharedProjects, this.COLLABORATORS_CACHE_TTL);
      return sharedProjects;
    } catch (error) {
      this.logger.error(`Failed to get shared projects: ${error.message}`);
      return [];
    }
  }

  /**
   * Get sharing statistics for a tenant
   */
  async getSharingStatistics(tenantId: string): Promise<SharingStatistics> {
    try {
      // Fetch all active shares in tenant
      const sharingQuery = `
        SELECT COUNT(1) as count FROM project_collaborators
        WHERE tenantId = @tenantId AND isActive = true
      `;

      const pendingQuery = `
        SELECT COUNT(1) as count FROM project_collaborators
        WHERE tenantId = @tenantId AND isPending = true
      `;

      const roleQuery = `
        SELECT role, COUNT(1) as count FROM project_collaborators
        WHERE tenantId = @tenantId AND isActive = true
        GROUP BY role
      `;

      const [sharingResult, pendingResult, roleResult] = await Promise.all([
        this.cosmosDB.queryDocuments<any>(
          'project-collaborators',
          sharingQuery,
          [{ name: '@tenantId', value: tenantId }],
          tenantId,
        ),
        this.cosmosDB.queryDocuments<any>(
          'project-collaborators',
          pendingQuery,
          [{ name: '@tenantId', value: tenantId }],
          tenantId,
        ),
        this.cosmosDB.queryDocuments<any>(
          'project-collaborators',
          roleQuery,
          [{ name: '@tenantId', value: tenantId }],
          tenantId,
        ),
      ]);

      const roleDistribution: Record<ProjectRole, number> = {
        [ProjectRole.OWNER]: 0,
        [ProjectRole.MANAGER]: 0,
        [ProjectRole.CONTRIBUTOR]: 0,
        [ProjectRole.VIEWER]: 0,
      };

      roleResult.forEach((r: any) => {
        roleDistribution[r.role as ProjectRole] = r.count;
      });

      // Fetch recent shares
      const recentQuery = `
        SELECT TOP 5 p.id, p.name, p.ownerId, p.ownerDisplayName,
               c.role, c.grantedAt
        FROM project_collaborators c
        JOIN projects p ON c.projectId = p.id
        WHERE c.tenantId = @tenantId AND c.isActive = true
        ORDER BY c.grantedAt DESC
      `;

      const recentResults = await this.cosmosDB.queryDocuments<any>(
        'project-collaborators',
        recentQuery,
        [{ name: '@tenantId', value: tenantId }],
        tenantId,
      );

      const recentlyShared: SharedProject[] = recentResults.map((r) => ({
        projectId: r.id,
        projectName: r.name,
        ownerId: r.ownerId,
        ownerDisplayName: r.ownerDisplayName,
        myRole: r.role,
        grantedAt: new Date(r.grantedAt),
        isPending: false,
        linkedShardCount: 0,
        collaboratorCount: 0,
        status: 'active',
      }));

      return {
        totalSharedProjects: sharingResult[0]?.count || 0,
        totalCollaborators: sharingResult[0]?.count || 0,
        pendingInvitations: pendingResult[0]?.count || 0,
        roleDistribution,
        recentlyShared,
        topCollaborators: [], // Can be expanded for full feature
      };
    } catch (error) {
      this.logger.error(`Failed to get sharing statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Accept pending invitation
   */
  async acceptInvitation(
    tenantId: string,
    projectId: string,
    userId: string,
    invitationToken: string,
  ): Promise<void> {
    try {
      const collaborator = await this.getCollaborator(tenantId, projectId, userId);
      if (!collaborator) {
        throw new NotFoundException('Invitation not found');
      }

      if (!collaborator.isPending || collaborator.invitationToken !== invitationToken) {
        throw new ForbiddenException('Invalid invitation token');
      }

      if (collaborator.invitationExpiry && collaborator.invitationExpiry < new Date()) {
        throw new BadRequestException('Invitation has expired');
      }

      collaborator.isPending = false;
      collaborator.invitationToken = undefined;
      collaborator.invitationExpiry = undefined;

      await this.cosmosDB.upsertDocument('project-collaborators', collaborator, tenantId);
      await this.invalidateProjectCaches(tenantId, projectId);

      this.logger.log(`User ${userId} accepted invitation for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to accept invitation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decline pending invitation
   */
  async declineInvitation(
    tenantId: string,
    projectId: string,
    userId: string,
    invitationToken: string,
  ): Promise<void> {
    try {
      const collaborator = await this.getCollaborator(tenantId, projectId, userId);
      if (!collaborator) {
        throw new NotFoundException('Invitation not found');
      }

      if (!collaborator.isPending || collaborator.invitationToken !== invitationToken) {
        throw new ForbiddenException('Invalid invitation token');
      }

      // Mark as inactive
      collaborator.isActive = false;
      await this.cosmosDB.upsertDocument('project-collaborators', collaborator, tenantId);
      await this.invalidateProjectCaches(tenantId, projectId);

      this.logger.log(`User ${userId} declined invitation for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to decline invitation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Invalidate project-related caches
   */
  private async invalidateProjectCaches(tenantId: string, projectId: string): Promise<void> {
    const keysToDelete = [
      `collaborators:${projectId}`,
      `sharing-info:${projectId}`,
      `shared-projects:*`, // Invalidate all "shared with me" caches
    ];

    for (const key of keysToDelete) {
      await this.cache.delete(key);
    }
  }

  /**
   * Helper: Determine project status
   */
  private getProjectStatus(isPending: boolean, expiresAt?: Date): SharedProject['status'] {
    if (isPending) {return 'pending';}

    if (expiresAt) {
      const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysUntilExpiry < 0) {return 'expired';}
      if (daysUntilExpiry < 7) {return 'expiring-soon';}
    }

    return 'active';
  }

  /**
   * Helper: Log activity (delegates to activity service)
   * In real implementation, would inject ActivityService
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
      this.logger.warn(`Failed to log activity: ${error.message}`);
      // Don't throw - activity logging shouldn't fail the main operation
    }
  }
}
