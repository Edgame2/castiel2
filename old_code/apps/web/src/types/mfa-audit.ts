/**
 * MFA Audit Types for Frontend
 */

export type MFAAuditEventType =
  | 'mfa_enrolled'
  | 'mfa_verified'
  | 'mfa_failed'
  | 'mfa_disabled'
  | 'recovery_code_used'
  | 'recovery_codes_regenerated'
  | 'trusted_device_added'
  | 'trusted_device_removed';

export type MFAMethodType = 'totp' | 'sms' | 'email' | 'recovery';

/**
 * MFA Audit Log Entry
 */
export interface MFAAuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  eventType: MFAAuditEventType;
  method?: MFAMethodType;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * MFA Audit Query Parameters
 */
export interface MFAAuditQueryParams {
  userId?: string;
  eventType?: MFAAuditEventType;
  method?: MFAMethodType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * MFA Audit Stats
 */
export interface MFAAuditStats {
  totalEnrollments: number;
  totalVerifications: number;
  failedAttempts: number;
  recoveryCodesUsed: number;
  byMethod: {
    totp: number;
    sms: number;
    email: number;
  };
  byDay: Array<{
    date: string;
    enrollments: number;
    verifications: number;
    failures: number;
  }>;
}

/**
 * MFA Audit Response
 */
export interface MFAAuditResponse {
  logs: MFAAuditLog[];
  total: number;
  limit: number;
  offset: number;
}

