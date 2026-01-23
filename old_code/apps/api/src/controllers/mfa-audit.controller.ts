/**
 * MFA Audit Controller
 * 
 * HTTP handlers for MFA audit endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MFAAuditService, MFAAuditEventType } from '../services/audit/mfa-audit.service.js';
import type { AuthUser } from '../types/auth.types.js';

const ADMIN_ROLES = ['owner', 'admin', 'tenant-admin', 'super-admin'];

/**
 * MFA Audit Controller
 */
export class MFAAuditController {
  constructor(private readonly mfaAuditService: MFAAuditService) {}

  /**
   * GET /api/admin/mfa/audit
   * Get MFA audit logs for the tenant
   */
  async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Require admin role
      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const {
        userId,
        eventType,
        startDate,
        endDate,
        limit,
        offset,
      } = request.query as {
        userId?: string;
        eventType?: MFAAuditEventType;
        startDate?: string;
        endDate?: string;
        limit?: string;
        offset?: string;
      };

      const result = await this.mfaAuditService.getAuditLogs(user.tenantId, {
        userId,
        eventType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get MFA audit logs');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get audit logs',
      });
    }
  }

  /**
   * GET /api/admin/mfa/stats
   * Get MFA statistics for the tenant
   */
  async getStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Require admin role
      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const { periodDays } = request.query as { periodDays?: string };

      const stats = await this.mfaAuditService.getStatistics(
        user.tenantId,
        periodDays ? parseInt(periodDays, 10) : 30
      );

      return reply.code(200).send(stats);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get MFA statistics');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get statistics',
      });
    }
  }

  /**
   * GET /api/admin/mfa/audit/user/:userId
   * Get MFA audit trail for a specific user
   */
  async getUserAuditTrail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Require admin role
      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const { userId } = request.params as { userId: string };
      const { limit } = request.query as { limit?: string };

      const auditTrail = await this.mfaAuditService.getUserAuditTrail(
        user.tenantId,
        userId,
        limit ? parseInt(limit, 10) : 50
      );

      return reply.code(200).send({ logs: auditTrail });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get user MFA audit trail');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get user audit trail',
      });
    }
  }

  /**
   * GET /api/admin/mfa/audit/failed-attempts
   * Get failed MFA verification attempts (security monitoring)
   */
  async getFailedAttempts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Require admin role
      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const { hours } = request.query as { hours?: string };

      const failedAttempts = await this.mfaAuditService.getFailedAttempts(
        user.tenantId,
        hours ? parseInt(hours, 10) : 24
      );

      return reply.code(200).send({ logs: failedAttempts, count: failedAttempts.length });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get failed MFA attempts');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get failed attempts',
      });
    }
  }

  /**
   * GET /api/admin/mfa/audit/export
   * Export MFA audit logs for compliance
   */
  async exportAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Require admin role
      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const { startDate, endDate, format } = request.query as {
        startDate: string;
        endDate: string;
        format?: 'json' | 'csv';
      };

      if (!startDate || !endDate) {
        return reply.code(400).send({
          error: 'BadRequest',
          message: 'startDate and endDate are required',
        });
      }

      const logs = await this.mfaAuditService.exportAuditLogs(
        user.tenantId,
        new Date(startDate),
        new Date(endDate)
      );

      if (format === 'csv') {
        // Convert to CSV
        const headers = [
          'ID',
          'User ID',
          'Email',
          'Event Type',
          'MFA Method',
          'Success',
          'Failure Reason',
          'IP Address',
          'User Agent',
          'Created At',
        ];
        
        const rows = logs.map((log) => [
          log.id,
          log.userId,
          log.email || '',
          log.eventType,
          log.mfaMethod || '',
          log.success ? 'Yes' : 'No',
          log.failureReason || '',
          log.ipAddress || '',
          log.userAgent || '',
          log.createdAt,
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        return reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="mfa-audit-${startDate}-${endDate}.csv"`)
          .send(csv);
      }

      return reply.code(200).send({ logs, count: logs.length });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to export MFA audit logs');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to export audit logs',
      });
    }
  }

  /**
   * Check if user has admin role
   */
  private isAdmin(user: AuthUser): boolean {
    return ADMIN_ROLES.some((role) => user.roles?.includes(role));
  }
}

