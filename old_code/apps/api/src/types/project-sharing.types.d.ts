/**
 * Project Sharing & Collaboration Types
 * Defines structures for project ownership, role-based access, and sharing operations
 * Supports bulk operations, notifications, and comprehensive audit trails
 */
export declare enum ProjectRole {
    /** Full project control: sharing, linking, settings, deletion, member management */
    OWNER = "OWNER",
    /** Can manage project, create links, but cannot delete project or change owner */
    MANAGER = "MANAGER",
    /** Can view, create links, participate in chat, but cannot manage members or settings */
    CONTRIBUTOR = "CONTRIBUTOR",
    /** Read-only access: view project and shards, access chat history */
    VIEWER = "VIEWER"
}
/**
 * Project role permissions matrix
 */
export declare const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, string[]>;
/**
 * Collaborator information for a project
 * Stored within the project document or in project-collaborators container
 */
export interface ProjectCollaborator {
    /** Unique identifier for collaboration record */
    id: string;
    /** Tenant ID for isolation */
    tenantId: string;
    /** Project ID this collaboration belongs to */
    projectId: string;
    /** User ID of collaborator */
    userId: string;
    /** Collaborator display name (cached for quick reference) */
    displayName: string;
    /** Collaborator email address */
    email: string;
    /** Role assigned to this collaborator */
    role: ProjectRole;
    /** Who granted this access (user ID) */
    grantedBy: string;
    /** Timestamp when access was granted */
    grantedAt: Date;
    /** When access expires (null = no expiration) */
    expiresAt?: Date;
    /** Is this access pending acceptance? */
    isPending: boolean;
    /** Pending acceptance token (if isPending) */
    invitationToken?: string;
    /** Pending acceptance expiry */
    invitationExpiry?: Date;
    /** Last access timestamp for activity tracking */
    lastAccessedAt?: Date;
    /** Whether collaboration is active (soft delete support) */
    isActive: boolean;
    /** Reason for access (e.g., "Added to project by manager") */
    accessReason?: string;
    /** Notification preferences for this collaboration */
    notificationPreferences?: {
        /** Receive sharing notifications */
        sharingNotifications: boolean;
        /** Receive activity digest */
        activityDigest: boolean;
        /** Frequency: 'immediate' | 'daily' | 'weekly' */
        digestFrequency: 'immediate' | 'daily' | 'weekly';
    };
    /** Audit trail */
    _ts?: number;
    _rid?: string;
    _self?: string;
    _etag?: string;
}
/**
 * Project ownership history for audit trail
 */
export interface OwnershipHistoryEntry {
    /** Previous/New owner user ID */
    userId: string;
    /** Owner display name */
    displayName: string;
    /** When ownership started */
    startDate: Date;
    /** When ownership ended (null = current owner) */
    endDate?: Date;
    /** Reason for ownership change */
    reason?: string;
    /** Who initiated the transfer */
    initiatedBy?: string;
}
/**
 * Project-specific sharing information
 * Stored in project document or project-sharing container
 */
export interface ProjectSharingInfo {
    /** Project ID */
    projectId: string;
    /** Tenant ID */
    tenantId: string;
    /** Current owner user ID */
    ownerId: string;
    /** Owner display name */
    ownerDisplayName: string;
    /** List of all collaborators (array or container reference) */
    collaborators: ProjectCollaborator[];
    /** Ownership history for audit purposes */
    ownershipHistory: OwnershipHistoryEntry[];
    /** Total collaborator count (denormalized for quick access) */
    collaboratorCount: number;
    /** Whether project is shared with anyone */
    isShared: boolean;
    /** Timestamp when first shared */
    firstSharedAt?: Date;
    /** Last modification to sharing configuration */
    lastModifiedAt: Date;
    /** Sharing audit trail enabled */
    auditEnabled: boolean;
    /** Whether to send notifications on new shares */
    notifyOnShare: boolean;
    /** Role-based sharing settings from tenant config */
    roleBasedSharingEnabled: boolean;
}
/**
 * Bulk sharing operation input
 */
export interface BulkShareInput {
    /** Project IDs to share */
    projectIds: string[];
    /** Users to share with */
    recipients: Array<{
        userId: string;
        role: ProjectRole;
    }>;
    /** Notification message to recipients */
    message?: string;
    /** Whether to require acceptance */
    requireAcceptance: boolean;
    /** Access expiration (days from now, null = no expiration) */
    expirationDays?: number;
}
/**
 * Bulk sharing operation result
 */
export interface BulkShareResult {
    /** Number of projects successfully shared */
    successCount: number;
    /** Number of sharing operations failed */
    failureCount: number;
    /** Total recipients notified */
    notifiedRecipients: number;
    /** Detailed results per project */
    projectResults: Array<{
        projectId: string;
        projectName: string;
        sharedWith: string[];
        failureReason?: string;
    }>;
    /** Operation timestamp */
    timestamp: Date;
    /** Unique operation ID for tracking */
    operationId: string;
}
/**
 * Share input DTO
 */
export interface ShareProjectInput {
    /** User ID to share with */
    userId: string;
    /** Role to assign */
    role: ProjectRole;
    /** Reason for sharing (optional) */
    reason?: string;
    /** When access should expire (ISO date string, optional) */
    expiresAt?: string;
    /** Whether to require acceptance */
    requireAcceptance?: boolean;
    /** Notification message */
    notificationMessage?: string;
}
/**
 * Transfer ownership input
 */
export interface TransferOwnershipInput {
    /** New owner user ID */
    newOwnerId: string;
    /** New owner display name */
    newOwnerDisplayName: string;
    /** Reason for transfer */
    reason?: string;
    /** Previous owner's new role after transfer (default: MANAGER) */
    previousOwnerRole?: ProjectRole;
    /** Send notification to new owner */
    notifyNewOwner?: boolean;
}
/**
 * Revoke access input
 */
export interface RevokeAccessInput {
    /** User ID whose access to revoke */
    userId: string;
    /** Reason for revocation */
    reason?: string;
    /** Whether to send notification */
    sendNotification?: boolean;
    /** Notification message */
    notificationMessage?: string;
}
/**
 * Update collaborator role input
 */
export interface UpdateCollaboratorRoleInput {
    /** User ID of collaborator */
    userId: string;
    /** New role */
    role: ProjectRole;
    /** Reason for role change */
    reason?: string;
    /** Send notification to collaborator */
    sendNotification?: boolean;
}
/**
 * Shared project list item (for "Shared with Me" view)
 */
export interface SharedProject {
    /** Project ID */
    projectId: string;
    /** Project name */
    projectName: string;
    /** Project owner ID */
    ownerId: string;
    /** Owner display name */
    ownerDisplayName: string;
    /** My role in this project */
    myRole: ProjectRole;
    /** Granted timestamp */
    grantedAt: Date;
    /** Is access pending acceptance */
    isPending: boolean;
    /** When access expires (if applicable) */
    expiresAt?: Date;
    /** Last activity timestamp in this project */
    lastActivityAt?: Date;
    /** Short description of project */
    description?: string;
    /** Number of linked shards */
    linkedShardCount: number;
    /** Number of collaborators */
    collaboratorCount: number;
    /** Status badge */
    status: 'active' | 'pending' | 'expiring-soon' | 'expired';
}
/**
 * Collaborator response DTO
 */
export interface CollaboratorDTO {
    /** User ID */
    userId: string;
    /** Display name */
    displayName: string;
    /** Email */
    email: string;
    /** Role */
    role: ProjectRole;
    /** Granted at */
    grantedAt: Date;
    /** Granted by user ID */
    grantedBy: string;
    /** Is pending */
    isPending: boolean;
    /** Expires at (if applicable) */
    expiresAt?: Date;
    /** Last accessed at */
    lastAccessedAt?: Date;
    /** Permissions based on role */
    permissions: string[];
}
/**
 * Sharing statistics for dashboard
 */
export interface SharingStatistics {
    /** Total projects shared */
    totalSharedProjects: number;
    /** Total collaborators across projects */
    totalCollaborators: number;
    /** Pending invitations */
    pendingInvitations: number;
    /** Distribution by role */
    roleDistribution: Record<ProjectRole, number>;
    /** Most recently shared projects */
    recentlyShared: SharedProject[];
    /** Collaborators by frequency */
    topCollaborators: Array<{
        userId: string;
        displayName: string;
        projectCount: number;
    }>;
}
/**
 * Bulk operations audit entry
 */
export interface BulkOperationAudit {
    /** Unique operation ID */
    operationId: string;
    /** Operation type: 'bulk-share' | 'bulk-link' | 'bulk-update-roles' */
    operationType: 'bulk-share' | 'bulk-link' | 'bulk-update-roles' | 'bulk-delete';
    /** Who initiated the operation */
    initiatedBy: string;
    /** Tenant ID */
    tenantId: string;
    /** Number of affected resources */
    resourceCount: number;
    /** Timestamp */
    timestamp: Date;
    /** Status: 'pending' | 'in-progress' | 'completed' | 'failed' */
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    /** Results summary */
    successCount: number;
    failureCount: number;
    /** Error details if failed */
    errors?: Array<{
        resourceId: string;
        errorMessage: string;
    }>;
    /** Operation details */
    details: Record<string, any>;
}
/**
 * Access request for future enhancement
 * When users can request access to projects
 */
export interface ProjectAccessRequest {
    /** Request ID */
    id: string;
    /** Project ID */
    projectId: string;
    /** Requester user ID */
    requesterId: string;
    /** Requested role */
    requestedRole: ProjectRole;
    /** Request message */
    message?: string;
    /** Status: 'pending' | 'approved' | 'rejected' */
    status: 'pending' | 'approved' | 'rejected';
    /** Created at */
    createdAt: Date;
    /** Responded at */
    respondedAt?: Date;
    /** Response reason */
    responseReason?: string;
}
//# sourceMappingURL=project-sharing.types.d.ts.map