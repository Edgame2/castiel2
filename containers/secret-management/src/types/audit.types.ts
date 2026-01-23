/**
 * Audit & Compliance Type Definitions
 */

export type SecretAuditEventType =
  | 'SECRET_CREATED'
  | 'SECRET_READ'
  | 'SECRET_UPDATED'
  | 'SECRET_DELETED'
  | 'SECRET_RESTORED'
  | 'SECRET_PERMANENTLY_DELETED'
  | 'SECRET_ROTATED'
  | 'SECRET_EXPIRED'
  | 'SECRET_EXPIRING_SOON'
  | 'ACCESS_GRANTED'
  | 'ACCESS_REVOKED'
  | 'ACCESS_DENIED'
  | 'VAULT_CONFIGURED'
  | 'VAULT_UPDATED'
  | 'VAULT_DELETED'
  | 'VAULT_HEALTH_CHECK'
  | 'SECRETS_IMPORTED'
  | 'SECRETS_EXPORTED'
  | 'SECRETS_MIGRATED'
  | 'KEY_ROTATED'
  | 'KEY_RETIRED';

export type AuditCategory =
  | 'CRUD'
  | 'LIFECYCLE'
  | 'ACCESS'
  | 'VAULT'
  | 'IMPORT_EXPORT'
  | 'KEY_MANAGEMENT';

export type ActorType = 'USER' | 'SYSTEM' | 'SCHEDULER';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export type SecretScope =
  | 'GLOBAL'
  | 'ORGANIZATION'
  | 'TEAM'
  | 'PROJECT'
  | 'USER';

export interface AuditLogParams {
  eventType: SecretAuditEventType;
  actorType?: ActorType;
  actorId: string;
  actorName?: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  secretId?: string;
  secretName?: string;
  secretScope?: SecretScope;
  action?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  outcome?: AuditOutcome;
  errorMessage?: string;
}

export interface AuditLog {
  id: string;
  eventType: SecretAuditEventType;
  eventCategory: AuditCategory;
  actorType: ActorType;
  actorId: string;
  actorName?: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  secretId?: string;
  secretName?: string;
  secretScope?: SecretScope;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  outcome: AuditOutcome;
  errorMessage?: string;
  timestamp: Date;
}

export interface AuditLogsParams {
  secretId?: string;
  eventType?: SecretAuditEventType[];
  actorId?: string;
  outcome?: AuditOutcome[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ============================================================================
// COMPLIANCE
// ============================================================================

export interface ComplianceReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  
  // Summary
  summary: {
    totalSecrets: number;
    activeSecrets: number;
    expiredSecrets: number;
    expiringWithin30Days: number;
    rotationsDue: number;
    deletedSecrets: number;
  };
  
  // Access report
  accessReport: {
    totalAccesses: number;
    uniqueUsers: number;
    accessesByScope: Record<SecretScope, number>;
    accessesByModule: Record<string, number>;
    deniedAccesses: number;
  };
  
  // Security findings
  findings: ComplianceFinding[];
}

export interface ComplianceFinding {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  description: string;
  affectedSecrets: string[];
  recommendation: string;
}

export interface ComplianceReportParams {
  startDate: Date;
  endDate: Date;
  format?: 'json' | 'pdf';
}
