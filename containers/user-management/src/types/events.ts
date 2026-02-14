/**
 * Event Type Definitions for User Management Module
 * 
 * Defines all event types for user management operations.
 * Events are published to RabbitMQ exchange 'coder.events' for logging and notification service consumption.
 * Per ModuleImplementationGuide Section 9
 */

/**
 * Base event structure matching DomainEvent from logging service
 */
export interface BaseEvent {
  type: string;
  timestamp: string; // ISO 8601
  version?: string; // Event schema version
  source?: string; // Module that emitted
  correlationId?: string; // Request correlation
  tenantId?: string; // Tenant context
  userId?: string; // Actor
  actorId?: string; // Actor (alias for userId)
  data: Record<string, any>; // Event-specific data
  metadata?: Record<string, unknown>; // Additional metadata (ipAddress, userAgent, etc.)
}

/**
 * User profile updated event
 */
export interface UserProfileUpdatedEvent extends BaseEvent {
  type: 'user.profile_updated';
  data: {
    userId: string;
    changes: {
      name?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      avatarUrl?: string;
      function?: string;
      speciality?: string;
      timezone?: string;
      language?: string;
    };
  };
}

/**
 * User deactivated event
 */
export interface UserDeactivatedEvent extends BaseEvent {
  type: 'user.deactivated';
  data: {
    userId: string;
    deactivatedBy: string;
    reason?: 'self' | 'admin';
  };
}

/**
 * User reactivated event
 */
export interface UserReactivatedEvent extends BaseEvent {
  type: 'user.reactivated';
  data: {
    userId: string;
    reactivatedBy: string;
  };
}

/**
 * User deleted event
 */
export interface UserDeletedEvent extends BaseEvent {
  type: 'user.deleted';
  data: {
    userId: string;
    deletedBy: string;
  };
}

/**
 * User session revoked event
 */
export interface UserSessionRevokedEvent extends BaseEvent {
  type: 'user.session_revoked';
  data: {
    userId: string;
    sessionId: string;
    reason?: 'user_initiated' | 'admin_revoked' | 'security';
  };
}

/**
 * Team created event
 */
export interface TeamCreatedEvent extends BaseEvent {
  type: 'team.created';
  data: {
    teamId: string;
    tenantId?: string;
    name: string;
    parentTeamId?: string;
    createdBy: string;
  };
}

/**
 * Team updated event
 */
export interface TeamUpdatedEvent extends BaseEvent {
  type: 'team.updated';
  data: {
    teamId: string;
    tenantId?: string;
    changes: Record<string, any>;
  };
}

/**
 * Team deleted event
 */
export interface TeamDeletedEvent extends BaseEvent {
  type: 'team.deleted';
  data: {
    teamId: string;
    tenantId?: string;
    name?: string;
    deletedBy: string;
  };
}

/**
 * Team member added event
 */
export interface TeamMemberAddedEvent extends BaseEvent {
  type: 'team.member_added';
  data: {
    teamId: string;
    tenantId?: string;
    userId: string;
    role: string;
    addedBy: string;
  };
}

/**
 * Team member removed event
 */
export interface TeamMemberRemovedEvent extends BaseEvent {
  type: 'team.member_removed';
  data: {
    teamId: string;
    tenantId?: string;
    userId: string;
    removedBy: string;
  };
}

/**
 * Role created event
 */
export interface RoleCreatedEvent extends BaseEvent {
  type: 'role.created';
  data: {
    roleId: string;
    tenantId: string;
    name: string;
    permissionCount: number;
    createdBy: string;
  };
}

/**
 * Role updated event
 */
export interface RoleUpdatedEvent extends BaseEvent {
  type: 'role.updated';
  data: {
    roleId: string;
    tenantId: string;
    changes: Record<string, any>;
  };
}

/**
 * Role deleted event
 */
export interface RoleDeletedEvent extends BaseEvent {
  type: 'role.deleted';
  data: {
    roleId: string;
    tenantId: string;
    name?: string;
    deletedBy: string;
  };
}

/**
 * Invitation created event
 */
export interface InvitationCreatedEvent extends BaseEvent {
  type: 'invitation.created';
  data: {
    invitationId: string;
    tenantId: string;
    email: string;
    invitationType: 'email' | 'link';
    expiresAt: string;
    createdBy: string;
  };
}

/**
 * Invitation resent event
 */
export interface InvitationResentEvent extends BaseEvent {
  type: 'invitation.resent';
  data: {
    invitationId: string;
    tenantId: string;
    email: string;
    resendCount: number;
    resentBy: string;
  };
}

/**
 * Invitation cancelled event
 */
export interface InvitationCancelledEvent extends BaseEvent {
  type: 'invitation.cancelled';
  data: {
    invitationId: string;
    tenantId: string;
    email: string;
    cancelledBy: string;
  };
}

/**
 * Invitation accepted event
 */
export interface InvitationAcceptedEvent extends BaseEvent {
  type: 'invitation.accepted';
  data: {
    invitationId: string;
    tenantId: string;
    userId: string;
    roleId: string;
  };
}

/**
 * All user management events
 */
export type UserManagementEvent =
  | UserProfileUpdatedEvent
  | UserDeactivatedEvent
  | UserReactivatedEvent
  | UserDeletedEvent
  | UserSessionRevokedEvent
  | TeamCreatedEvent
  | TeamUpdatedEvent
  | TeamDeletedEvent
  | TeamMemberAddedEvent
  | TeamMemberRemovedEvent
  | RoleCreatedEvent
  | RoleUpdatedEvent
  | RoleDeletedEvent
  | InvitationCreatedEvent
  | InvitationResentEvent
  | InvitationCancelledEvent
  | InvitationAcceptedEvent;



