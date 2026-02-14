/**
 * Event Types for Audit Logging
 * Per ModuleImplementationGuide Section 9
 */

/**
 * Base event structure. Tenant-only: use tenantId for scope.
 */
export interface DomainEvent {
  type: string;
  timestamp: Date | string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Authentication events
 */
export interface AuthLoginSuccessEvent extends DomainEvent {
  type: 'auth.login.success';
  userId: string;
  tenantId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthLoginFailedEvent extends DomainEvent {
  type: 'auth.login.failed';
  email: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthLogoutEvent extends DomainEvent {
  type: 'auth.logout';
  userId: string;
  tenantId: string;
  sessionId: string;
}

export interface AuthPasswordChangedEvent extends DomainEvent {
  type: 'auth.password.changed';
  userId: string;
  tenantId: string;
}

export interface AuthMfaEnabledEvent extends DomainEvent {
  type: 'auth.mfa.enabled';
  userId: string;
  tenantId: string;
}

/**
 * User management events
 */
export interface UserCreatedEvent extends DomainEvent {
  type: 'user.created';
  targetUserId: string;
  tenantId: string;
  role: string;
}

export interface UserUpdatedEvent extends DomainEvent {
  type: 'user.updated';
  targetUserId: string;
  tenantId: string;
  changes: string[];
}

export interface UserDeletedEvent extends DomainEvent {
  type: 'user.deleted';
  targetUserId: string;
  tenantId: string;
}

export interface UserRoleChangedEvent extends DomainEvent {
  type: 'user.role.changed';
  targetUserId: string;
  tenantId: string;
  previousRole: string;
  newRole: string;
}

/**
 * Secret management events
 */
export interface SecretCreatedEvent extends DomainEvent {
  type: 'secret.created';
  secretId: string;
  tenantId: string;
  secretName: string;
}

export interface SecretAccessedEvent extends DomainEvent {
  type: 'secret.accessed';
  secretId: string;
  tenantId: string;
  secretName: string;
  accessType: 'read' | 'write';
}

export interface SecretDeletedEvent extends DomainEvent {
  type: 'secret.deleted';
  secretId: string;
  tenantId: string;
  secretName: string;
}

export interface SecretRotatedEvent extends DomainEvent {
  type: 'secret.rotated';
  secretId: string;
  tenantId: string;
  secretName: string;
}

/**
 * Planning events
 */
export interface PlanCreatedEvent extends DomainEvent {
  type: 'plan.created';
  planId: string;
  projectId: string;
  tenantId: string;
}

export interface PlanExecutedEvent extends DomainEvent {
  type: 'plan.executed';
  planId: string;
  projectId: string;
  tenantId: string;
  status: 'success' | 'failed';
}

/**
 * Notification events
 */
export interface NotificationSentEvent extends DomainEvent {
  type: 'notification.sent';
  notificationId: string;
  tenantId: string;
  channel: string;
  recipientCount: number;
}

/**
 * Union type of all events
 */
export type AuditableEvent =
  | AuthLoginSuccessEvent
  | AuthLoginFailedEvent
  | AuthLogoutEvent
  | AuthPasswordChangedEvent
  | AuthMfaEnabledEvent
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserRoleChangedEvent
  | SecretCreatedEvent
  | SecretAccessedEvent
  | SecretDeletedEvent
  | SecretRotatedEvent
  | PlanCreatedEvent
  | PlanExecutedEvent
  | NotificationSentEvent
  | DomainEvent; // Fallback for unknown event types



