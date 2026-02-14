/**
 * Event Types for Logging Module
 * Per ModuleImplementationGuide Section 9
 */

/**
 * Base domain event structure. Tenant-only: use tenantId for scope.
 */
export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  source: string;
  timestamp: Date | string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  data: T;
}

// ============================================================================
// AUTH EVENTS
// ============================================================================

export interface AuthLoginSuccessData {
  userId: string;
  email: string;
  sessionId: string;
  method: 'password' | 'oauth' | 'sso' | 'api_key';
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthLoginFailedData {
  email: string;
  reason: 'invalid_credentials' | 'account_locked' | 'mfa_required' | 'unknown';
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthLogoutData {
  userId: string;
  sessionId: string;
  reason: 'user_initiated' | 'session_expired' | 'admin_forced';
}

export interface AuthPasswordChangedData {
  userId: string;
  method: 'user_change' | 'admin_reset' | 'forgot_password';
}

// ============================================================================
// USER EVENTS
// ============================================================================

export interface UserCreatedData {
  userId: string;
  email: string;
  role: string;
  createdBy?: string;
}

export interface UserUpdatedData {
  userId: string;
  fields: string[];
  updatedBy?: string;
}

export interface UserDeletedData {
  userId: string;
  deletedBy: string;
  reason?: string;
}

export interface UserRoleChangedData {
  userId: string;
  previousRole: string;
  newRole: string;
  changedBy: string;
}

// ============================================================================
// SECRET EVENTS
// ============================================================================

export interface SecretAccessedData {
  secretId: string;
  secretName: string;
  accessType: 'read' | 'decrypt';
  accessedBy: string;
}

export interface SecretCreatedData {
  secretId: string;
  secretName: string;
  createdBy: string;
}

export interface SecretUpdatedData {
  secretId: string;
  secretName: string;
  updatedBy: string;
  rotated: boolean;
}

export interface SecretDeletedData {
  secretId: string;
  secretName: string;
  deletedBy: string;
}

// ============================================================================
// PLAN EVENTS
// ============================================================================

export interface PlanCreatedData {
  planId: string;
  projectId: string;
  name: string;
  createdBy: string;
}

export interface PlanExecutedData {
  planId: string;
  projectId: string;
  status: 'success' | 'failed' | 'partial';
  executedBy: string;
  duration_ms?: number;
}

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export interface NotificationSentData {
  notificationId: string;
  channel: 'email' | 'push' | 'sms' | 'in_app';
  recipientId: string;
  templateId?: string;
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export interface ServiceStartedData {
  serviceName: string;
  version: string;
  instanceId: string;
}

export interface ServiceStoppedData {
  serviceName: string;
  instanceId: string;
  reason: 'graceful' | 'error' | 'timeout';
}

export interface ConfigChangedData {
  configKey: string;
  changedBy: string;
  previousValue?: string;
  newValue?: string;
}

// ============================================================================
// EVENT TYPE UNION
// ============================================================================

export type AuditableEvent =
  | DomainEvent<AuthLoginSuccessData>
  | DomainEvent<AuthLoginFailedData>
  | DomainEvent<AuthLogoutData>
  | DomainEvent<AuthPasswordChangedData>
  | DomainEvent<UserCreatedData>
  | DomainEvent<UserUpdatedData>
  | DomainEvent<UserDeletedData>
  | DomainEvent<UserRoleChangedData>
  | DomainEvent<SecretAccessedData>
  | DomainEvent<SecretCreatedData>
  | DomainEvent<SecretUpdatedData>
  | DomainEvent<SecretDeletedData>
  | DomainEvent<PlanCreatedData>
  | DomainEvent<PlanExecutedData>
  | DomainEvent<NotificationSentData>
  | DomainEvent<ServiceStartedData>
  | DomainEvent<ServiceStoppedData>
  | DomainEvent<ConfigChangedData>;

