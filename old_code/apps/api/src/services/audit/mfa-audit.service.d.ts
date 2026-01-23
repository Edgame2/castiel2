/**
 * MFA Audit Service
 *
 * Handles audit logging and analytics for MFA-related events
 */
import type { Container } from '@azure/cosmos';
import type { Redis as RedisType } from 'ioredis';
/**
 * MFA audit event types
 */
export declare enum MFAAuditEventType {
    MFA_ENROLLMENT_STARTED = "mfa_enrollment_started",
    MFA_ENROLLMENT_COMPLETED = "mfa_enrollment_completed",
    MFA_ENROLLMENT_FAILED = "mfa_enrollment_failed",
    MFA_CHALLENGE_INITIATED = "mfa_challenge_initiated",
    MFA_VERIFICATION_SUCCESS = "mfa_verification_success",
    MFA_VERIFICATION_FAILED = "mfa_verification_failed",
    MFA_RECOVERY_CODE_USED = "mfa_recovery_code_used",
    MFA_RECOVERY_CODES_GENERATED = "mfa_recovery_codes_generated",
    MFA_METHOD_DISABLED = "mfa_method_disabled",
    MFA_METHOD_ENABLED = "mfa_method_enabled",
    MFA_DEVICE_TRUSTED = "mfa_device_trusted",
    MFA_DEVICE_REMOVED = "mfa_device_removed",
    MFA_POLICY_UPDATED = "mfa_policy_updated",
    MFA_ENFORCEMENT_TRIGGERED = "mfa_enforcement_triggered"
}
/**
 * MFA audit log entry
 */
export interface MFAAuditLog {
    id: string;
    tenantId: string;
    userId: string;
    email?: string;
    eventType: MFAAuditEventType;
    mfaMethod?: 'totp' | 'sms' | 'email' | 'recovery';
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    partitionKey: string;
}
/**
 * MFA statistics
 */
export interface MFAStatistics {
    tenantId: string;
    totalUsers: number;
    usersWithMFA: number;
    mfaAdoptionRate: number;
    methodDistribution: {
        totp: number;
        sms: number;
        email: number;
    };
    recentEvents: {
        successfulVerifications: number;
        failedVerifications: number;
        enrollments: number;
        recoveryCodeUsage: number;
    };
    periodStart: Date;
    periodEnd: Date;
}
/**
 * MFA Audit Service
 */
export declare class MFAAuditService {
    private readonly auditContainer;
    private readonly usersContainer;
    private readonly redis;
    private readonly CACHE_PREFIX;
    private readonly STATS_CACHE_TTL;
    constructor(auditContainer: Container, usersContainer: Container, redis: RedisType);
    /**
     * Log an MFA audit event
     */
    logEvent(event: Omit<MFAAuditLog, 'id' | 'createdAt' | 'partitionKey'>): Promise<MFAAuditLog>;
    /**
     * Get MFA audit logs for a tenant
     */
    getAuditLogs(tenantId: string, options?: {
        userId?: string;
        eventType?: MFAAuditEventType;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        logs: MFAAuditLog[];
        total: number;
    }>;
    /**
     * Get MFA statistics for a tenant
     */
    getStatistics(tenantId: string, periodDays?: number): Promise<MFAStatistics>;
    /**
     * Get user MFA audit trail
     */
    getUserAuditTrail(tenantId: string, userId: string, limit?: number): Promise<MFAAuditLog[]>;
    /**
     * Get failed verification attempts (for security monitoring)
     */
    getFailedAttempts(tenantId: string, hours?: number): Promise<MFAAuditLog[]>;
    /**
     * Export audit logs for compliance
     */
    exportAuditLogs(tenantId: string, startDate: Date, endDate: Date): Promise<MFAAuditLog[]>;
    /**
     * Invalidate stats cache
     */
    private invalidateStatsCache;
}
//# sourceMappingURL=mfa-audit.service.d.ts.map