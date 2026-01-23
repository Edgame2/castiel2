/**
 * Audit Types
 * 
 * Type definitions for audit logging across the application
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
  method?: string; // 'totp' | 'sms' | 'email'
  success: boolean;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

export interface MFAAuditEventCreate {
  tenantId: string;
  userId: string;
  userEmail: string;
  action: MFAAuditAction;
  method?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

export interface MFAAuditQuery {
  tenantId: string;
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
