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
export enum MFAAuditEventType {
  // Enrollment events
  MFA_ENROLLMENT_STARTED = 'mfa_enrollment_started',
  MFA_ENROLLMENT_COMPLETED = 'mfa_enrollment_completed',
  MFA_ENROLLMENT_FAILED = 'mfa_enrollment_failed',
  
  // Verification events
  MFA_CHALLENGE_INITIATED = 'mfa_challenge_initiated',
  MFA_VERIFICATION_SUCCESS = 'mfa_verification_success',
  MFA_VERIFICATION_FAILED = 'mfa_verification_failed',
  
  // Recovery events
  MFA_RECOVERY_CODE_USED = 'mfa_recovery_code_used',
  MFA_RECOVERY_CODES_GENERATED = 'mfa_recovery_codes_generated',
  
  // Method management
  MFA_METHOD_DISABLED = 'mfa_method_disabled',
  MFA_METHOD_ENABLED = 'mfa_method_enabled',
  
  // Trusted devices
  MFA_DEVICE_TRUSTED = 'mfa_device_trusted',
  MFA_DEVICE_REMOVED = 'mfa_device_removed',
  
  // Policy events
  MFA_POLICY_UPDATED = 'mfa_policy_updated',
  MFA_ENFORCEMENT_TRIGGERED = 'mfa_enforcement_triggered',
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
export class MFAAuditService {
  private readonly CACHE_PREFIX = 'mfa:audit:';
  private readonly STATS_CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly auditContainer: Container,
    private readonly usersContainer: Container,
    private readonly redis: RedisType
  ) {}

  /**
   * Log an MFA audit event
   */
  async logEvent(event: Omit<MFAAuditLog, 'id' | 'createdAt' | 'partitionKey'>): Promise<MFAAuditLog> {
    const auditLog: MFAAuditLog = {
      ...event,
      id: `mfa-audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      partitionKey: event.tenantId,
    };

    await this.auditContainer.items.create(auditLog);

    // Invalidate cached stats
    await this.invalidateStatsCache(event.tenantId);

    return auditLog;
  }

  /**
   * Get MFA audit logs for a tenant
   */
  async getAuditLogs(
    tenantId: string,
    options?: {
      userId?: string;
      eventType?: MFAAuditEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: MFAAuditLog[]; total: number }> {
    const { userId, eventType, startDate, endDate, limit = 50, offset = 0 } = options || {};

    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (userId) {
      query += ' AND c.userId = @userId';
      parameters.push({ name: '@userId', value: userId });
    }

    if (eventType) {
      query += ' AND c.eventType = @eventType';
      parameters.push({ name: '@eventType', value: eventType });
    }

    if (startDate) {
      query += ' AND c.createdAt >= @startDate';
      parameters.push({ name: '@startDate', value: startDate.toISOString() });
    }

    if (endDate) {
      query += ' AND c.createdAt <= @endDate';
      parameters.push({ name: '@endDate', value: endDate.toISOString() });
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
    const { resources: countResult } = await this.auditContainer.items
      .query({ query: countQuery, parameters })
      .fetchAll();
    const total = countResult[0] || 0;

    // Get paginated results
    query += ' ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
    parameters.push({ name: '@offset', value: offset });
    parameters.push({ name: '@limit', value: limit });

    const { resources: logs } = await this.auditContainer.items
      .query({ query, parameters })
      .fetchAll();

    return { logs: logs as MFAAuditLog[], total };
  }

  /**
   * Get MFA statistics for a tenant
   */
  async getStatistics(
    tenantId: string,
    periodDays: number = 30
  ): Promise<MFAStatistics> {
    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}stats:${tenantId}:${periodDays}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get total users and users with MFA
    const usersQuery = `
      SELECT 
        COUNT(1) as total,
        SUM(ARRAY_LENGTH(c.mfaMethods) > 0 ? 1 : 0) as withMFA,
        SUM(c.mfaMethods[?type = 'totp'] != null ? 1 : 0) as totp,
        SUM(c.mfaMethods[?type = 'sms'] != null ? 1 : 0) as sms,
        SUM(c.mfaMethods[?type = 'email'] != null ? 1 : 0) as email
      FROM c 
      WHERE c.tenantId = @tenantId AND c.status = 'active'
    `;

    // Simplified query for user stats
    const { resources: usersResult } = await this.usersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@status', value: 'active' },
        ],
      })
      .fetchAll();

    const totalUsers = usersResult.length;
    const usersWithMFA = usersResult.filter((u: any) => 
      u.mfaMethods && u.mfaMethods.some((m: any) => m.status === 'active')
    ).length;
    
    const totpCount = usersResult.filter((u: any) => 
      u.mfaMethods?.some((m: any) => m.type === 'totp' && m.status === 'active')
    ).length;
    const smsCount = usersResult.filter((u: any) => 
      u.mfaMethods?.some((m: any) => m.type === 'sms' && m.status === 'active')
    ).length;
    const emailCount = usersResult.filter((u: any) => 
      u.mfaMethods?.some((m: any) => m.type === 'email' && m.status === 'active')
    ).length;

    // Get recent events
    const eventsQuery = `
      SELECT c.eventType, c.success FROM c 
      WHERE c.tenantId = @tenantId 
        AND c.createdAt >= @startDate 
        AND c.createdAt <= @endDate
    `;
    const { resources: events } = await this.auditContainer.items
      .query({
        query: eventsQuery,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@startDate', value: startDate.toISOString() },
          { name: '@endDate', value: endDate.toISOString() },
        ],
      })
      .fetchAll();

    const successfulVerifications = events.filter(
      (e: any) => e.eventType === MFAAuditEventType.MFA_VERIFICATION_SUCCESS
    ).length;
    const failedVerifications = events.filter(
      (e: any) => e.eventType === MFAAuditEventType.MFA_VERIFICATION_FAILED
    ).length;
    const enrollments = events.filter(
      (e: any) => e.eventType === MFAAuditEventType.MFA_ENROLLMENT_COMPLETED
    ).length;
    const recoveryCodeUsage = events.filter(
      (e: any) => e.eventType === MFAAuditEventType.MFA_RECOVERY_CODE_USED
    ).length;

    const stats: MFAStatistics = {
      tenantId,
      totalUsers,
      usersWithMFA,
      mfaAdoptionRate: totalUsers > 0 ? (usersWithMFA / totalUsers) * 100 : 0,
      methodDistribution: {
        totp: totpCount,
        sms: smsCount,
        email: emailCount,
      },
      recentEvents: {
        successfulVerifications,
        failedVerifications,
        enrollments,
        recoveryCodeUsage,
      },
      periodStart: startDate,
      periodEnd: endDate,
    };

    // Cache the results
    await this.redis.setex(cacheKey, this.STATS_CACHE_TTL, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get user MFA audit trail
   */
  async getUserAuditTrail(
    tenantId: string,
    userId: string,
    limit: number = 50
  ): Promise<MFAAuditLog[]> {
    const { resources } = await this.auditContainer.items
      .query({
        query: `
          SELECT * FROM c 
          WHERE c.tenantId = @tenantId AND c.userId = @userId 
          ORDER BY c.createdAt DESC 
          OFFSET 0 LIMIT @limit
        `,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@userId', value: userId },
          { name: '@limit', value: limit },
        ],
      })
      .fetchAll();

    return resources as MFAAuditLog[];
  }

  /**
   * Get failed verification attempts (for security monitoring)
   */
  async getFailedAttempts(
    tenantId: string,
    hours: number = 24
  ): Promise<MFAAuditLog[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { resources } = await this.auditContainer.items
      .query({
        query: `
          SELECT * FROM c 
          WHERE c.tenantId = @tenantId 
            AND c.eventType = @eventType
            AND c.createdAt >= @since
          ORDER BY c.createdAt DESC
        `,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@eventType', value: MFAAuditEventType.MFA_VERIFICATION_FAILED },
          { name: '@since', value: since.toISOString() },
        ],
      })
      .fetchAll();

    return resources as MFAAuditLog[];
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MFAAuditLog[]> {
    const { resources } = await this.auditContainer.items
      .query({
        query: `
          SELECT * FROM c 
          WHERE c.tenantId = @tenantId 
            AND c.createdAt >= @startDate 
            AND c.createdAt <= @endDate
          ORDER BY c.createdAt ASC
        `,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@startDate', value: startDate.toISOString() },
          { name: '@endDate', value: endDate.toISOString() },
        ],
      })
      .fetchAll();

    return resources as MFAAuditLog[];
  }

  /**
   * Invalidate stats cache
   */
  private async invalidateStatsCache(tenantId: string): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}stats:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

