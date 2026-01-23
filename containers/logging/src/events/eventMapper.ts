/**
 * Event to Audit Log Mapper
 * Maps domain events to audit log entries
 */

import { CreateLogInput, LogCategory, LogSeverity } from '../types';
import { AuditableEvent, DomainEvent } from './types';

/**
 * Event category mapping based on event type prefix
 */
const CATEGORY_MAP: Record<string, LogCategory> = {
  'auth.login': LogCategory.SECURITY,
  'auth.logout': LogCategory.SECURITY,
  'auth.password': LogCategory.SECURITY,
  'auth.mfa': LogCategory.SECURITY,
  'user.': LogCategory.ACTION,
  'organization.': LogCategory.ACTION,
  'team.': LogCategory.ACTION,
  'role.': LogCategory.ACTION,
  'invitation.': LogCategory.ACTION,
  'secret.accessed': LogCategory.ACCESS,
  'secret.': LogCategory.ACTION,
  'plan.': LogCategory.ACTION,
  'notification.': LogCategory.SYSTEM,
};

/**
 * Event severity mapping
 */
const SEVERITY_MAP: Record<string, LogSeverity> = {
  'auth.login.failed': LogSeverity.WARN,
  'auth.login.success': LogSeverity.INFO,
  'secret.accessed': LogSeverity.INFO,
  'secret.rotated': LogSeverity.INFO,
  'user.deleted': LogSeverity.WARN,
  'user.deactivated': LogSeverity.WARN,
  'organization.deleted': LogSeverity.WARN,
  'organization.sso_configured': LogSeverity.INFO,
  'organization.sso_disabled': LogSeverity.WARN,
  'team.deleted': LogSeverity.WARN,
  'role.deleted': LogSeverity.WARN,
  'plan.executed': LogSeverity.INFO,
};

/**
 * Get category for an event type
 */
function getCategory(eventType: string): LogCategory {
  for (const [prefix, category] of Object.entries(CATEGORY_MAP)) {
    if (eventType.startsWith(prefix)) {
      return category;
    }
  }
  return LogCategory.SYSTEM;
}

/**
 * Get severity for an event type
 */
function getSeverity(eventType: string): LogSeverity {
  return SEVERITY_MAP[eventType] || LogSeverity.INFO;
}

/**
 * Extract resource info from event
 */
function extractResource(event: AuditableEvent): { resourceType?: string; resourceId?: string } {
  const type = event.type;
  
  // Auth events - user is the resource
  if (type.startsWith('auth.')) {
    if ('userId' in event && event.userId) {
      return { resourceType: 'user', resourceId: event.userId };
    }
    return {};
  }
  
  // User events
  if (type.startsWith('user.')) {
    if ('targetUserId' in event) {
      return { resourceType: 'user', resourceId: event.targetUserId };
    }
    // Check data field for userId (for user.profile_updated, user.deactivated, etc.)
    if ('data' in event && typeof event.data === 'object' && event.data !== null) {
      const data = event.data as any;
      if (data.userId) {
        return { resourceType: 'user', resourceId: data.userId };
      }
    }
    return {};
  }
  
  // Organization events
  if (type.startsWith('organization.')) {
    if ('data' in event && typeof event.data === 'object' && event.data !== null) {
      const data = event.data as any;
      if (data.organizationId) {
        return { resourceType: 'organization', resourceId: data.organizationId };
      }
    }
    return {};
  }
  
  // Team events
  if (type.startsWith('team.')) {
    if ('data' in event && typeof event.data === 'object' && event.data !== null) {
      const data = event.data as any;
      if (data.teamId) {
        return { resourceType: 'team', resourceId: data.teamId };
      }
    }
    return {};
  }
  
  // Role events
  if (type.startsWith('role.')) {
    if ('data' in event && typeof event.data === 'object' && event.data !== null) {
      const data = event.data as any;
      if (data.roleId) {
        return { resourceType: 'role', resourceId: data.roleId };
      }
    }
    return {};
  }
  
  // Invitation events
  if (type.startsWith('invitation.')) {
    if ('data' in event && typeof event.data === 'object' && event.data !== null) {
      const data = event.data as any;
      if (data.invitationId) {
        return { resourceType: 'invitation', resourceId: data.invitationId };
      }
    }
    return {};
  }
  
  // Secret events
  if (type.startsWith('secret.')) {
    if ('secretId' in event) {
      return { resourceType: 'secret', resourceId: event.secretId };
    }
    return {};
  }
  
  // Plan events
  if (type.startsWith('plan.')) {
    if ('planId' in event) {
      return { resourceType: 'plan', resourceId: event.planId };
    }
    return {};
  }
  
  // Notification events
  if (type.startsWith('notification.')) {
    if ('notificationId' in event) {
      return { resourceType: 'notification', resourceId: event.notificationId };
    }
    return {};
  }
  
  return {};
}

/**
 * Generate a human-readable message for an event
 */
function generateMessage(event: AuditableEvent): string {
  const type = event.type;
  
  switch (type) {
    case 'auth.login.success':
      return 'User logged in successfully';
    case 'auth.login.failed':
      return `Login attempt failed: ${'reason' in event ? event.reason : 'Unknown reason'}`;
    case 'auth.logout':
      return 'User logged out';
    case 'auth.password.changed':
      return 'User changed their password';
    case 'auth.mfa.enabled':
      return 'User enabled multi-factor authentication';
    case 'user.created':
      return `New user created with role: ${'role' in event ? event.role : 'unknown'}`;
    case 'user.updated':
      return `User profile updated: ${'changes' in event ? (event.changes as string[]).join(', ') : 'unknown changes'}`;
    case 'user.deleted':
      return 'User account deleted';
    case 'user.role.changed':
      return `User role changed from ${'previousRole' in event ? event.previousRole : 'unknown'} to ${'newRole' in event ? event.newRole : 'unknown'}`;
    case 'secret.created':
      return `Secret created: ${'secretName' in event ? event.secretName : 'unknown'}`;
    case 'secret.accessed':
      return `Secret accessed (${'accessType' in event ? event.accessType : 'read'}): ${'secretName' in event ? event.secretName : 'unknown'}`;
    case 'secret.deleted':
      return `Secret deleted: ${'secretName' in event ? event.secretName : 'unknown'}`;
    case 'secret.rotated':
      return `Secret rotated: ${'secretName' in event ? event.secretName : 'unknown'}`;
    case 'plan.created':
      return `Plan created for project ${'projectId' in event ? event.projectId : 'unknown'}`;
    case 'plan.executed':
      return `Plan execution ${'status' in event ? event.status : 'completed'}`;
    case 'notification.sent':
      return `Notification sent via ${'channel' in event ? event.channel : 'unknown'} to ${'recipientCount' in event ? event.recipientCount : 0} recipients`;
    case 'user.profile_updated':
      return 'User profile updated';
    case 'user.deactivated':
      return `User account deactivated: ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).reason || 'admin' : 'admin'}`;
    case 'user.reactivated':
      return 'User account reactivated';
    case 'user.session_revoked':
      return `User session revoked: ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).reason || 'user_initiated' : 'user_initiated'}`;
    case 'organization.created':
      return `Organization created: ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).name || 'unknown' : 'unknown'}`;
    case 'organization.updated':
      return 'Organization updated';
    case 'organization.deleted':
      return 'Organization deleted';
    case 'organization.settings_updated':
      return 'Organization settings updated';
    case 'organization.security_settings_updated':
      return 'Organization security settings updated';
    case 'team.created':
      return `Team created: ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).name || 'unknown' : 'unknown'}`;
    case 'team.updated':
      return 'Team updated';
    case 'team.deleted':
      return 'Team deleted';
    case 'team.member_added':
      return 'Team member added';
    case 'team.member_removed':
      return 'Team member removed';
    case 'role.created':
      return `Role created: ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).name || 'unknown' : 'unknown'}`;
    case 'role.updated':
      return 'Role updated';
    case 'role.deleted':
      return 'Role deleted';
    case 'invitation.created':
      return `Invitation created for ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).email || 'unknown' : 'unknown'}`;
    case 'invitation.resent':
      return `Invitation resent to ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).email || 'unknown' : 'unknown'}`;
    case 'invitation.cancelled':
      return `Invitation cancelled for ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).email || 'unknown' : 'unknown'}`;
    case 'invitation.accepted':
      return 'Invitation accepted';
    case 'organization.sso_configured':
      return `SSO configured for organization: ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).provider || 'unknown' : 'unknown'}`;
    case 'organization.sso_disabled':
      return `SSO disabled for organization: ${'data' in event && typeof event.data === 'object' && event.data !== null ? (event.data as any).provider || 'unknown' : 'unknown'}`;
    default:
      return `Event: ${type}`;
  }
}

/**
 * Map a domain event to an audit log input
 */
export function mapEventToLog(event: AuditableEvent): CreateLogInput {
  const resource = extractResource(event);
  const timestamp = typeof event.timestamp === 'string' 
    ? new Date(event.timestamp) 
    : event.timestamp;
  
  // Build metadata from event fields (excluding standard ones)
  const metadata: Record<string, unknown> = { ...event.metadata };
  
  // Add event-specific fields to metadata
  if ('sessionId' in event) metadata.sessionId = event.sessionId;
  if ('ipAddress' in event) metadata.ipAddress = event.ipAddress;
  if ('userAgent' in event) metadata.userAgent = event.userAgent;
  if ('status' in event) metadata.status = event.status;
  if ('reason' in event) metadata.reason = event.reason;
  if ('changes' in event) metadata.changes = event.changes;
  if ('previousRole' in event) metadata.previousRole = event.previousRole;
  if ('newRole' in event) metadata.newRole = event.newRole;
  if ('channel' in event) metadata.channel = event.channel;
  if ('recipientCount' in event) metadata.recipientCount = event.recipientCount;
  
  // Extract from data field for new event types
  if ('data' in event && typeof event.data === 'object' && event.data !== null) {
    const data = event.data as any;
    if (data.changes) metadata.changes = data.changes;
    if (data.reason) metadata.reason = data.reason;
    if (data.invitationType) metadata.invitationType = data.invitationType;
    if (data.role) metadata.role = data.role;
    if (data.permissionCount) metadata.permissionCount = data.permissionCount;
  }
  
  // Extract from metadata field if present
  if (event.metadata) {
    if (event.metadata.ipAddress) metadata.ipAddress = event.metadata.ipAddress as string;
    if (event.metadata.userAgent) metadata.userAgent = event.metadata.userAgent as string;
    if (event.metadata.sessionId) metadata.sessionId = event.metadata.sessionId as string;
  }
  
  return {
    organizationId: event.organizationId,
    userId: event.userId,
    action: event.type,
    category: getCategory(event.type),
    severity: getSeverity(event.type),
    resourceType: resource.resourceType,
    resourceId: resource.resourceId,
    message: generateMessage(event),
    metadata,
    source: event.type.split('.')[0], // e.g., "auth" from "auth.login.success"
    correlationId: event.correlationId,
    ipAddress: 'ipAddress' in event ? (event.ipAddress as string) : undefined,
    userAgent: 'userAgent' in event ? (event.userAgent as string) : undefined,
  };
}



