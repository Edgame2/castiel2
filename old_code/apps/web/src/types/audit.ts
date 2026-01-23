/**
 * Audit Types
 * Frontend type definitions for MFA audit logging
 */

export type MFAAuditAction =
  | 'mfa_enrollment_started'
  | 'mfa_enrollment_completed'
  | 'mfa_enrollment_failed'
  | 'mfa_verification_success'
  | 'mfa_verification_failed'
  | 'mfa_method_disabled'
  | 'mfa_recovery_codes_generated'
  | 'mfa_recovery_code_used'
  | 'mfa_policy_updated'
  | 'mfa_device_trusted'
  | 'mfa_device_removed';

export interface MFAAuditEvent {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  action: MFAAuditAction;
  method?: string;
  success: boolean;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

export interface MFAAuditQuery {
  userId?: string;
  action?: MFAAuditAction;
  method?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface MFAAuditListResponse {
  events: MFAAuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface MFAStatistics {
  totalEvents: number;
  successRate: number;
  eventsByAction: Record<string, number>;
  eventsByMethod: Record<string, number>;
}
