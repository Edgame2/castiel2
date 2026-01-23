/**
 * MFA Audit Routes
 */

import type { FastifyInstance } from 'fastify';
import { MFAAuditController } from '../controllers/mfa-audit.controller.js';

export async function registerMFAAuditRoutes(server: FastifyInstance): Promise<void> {
  const mfaAuditController = (server as FastifyInstance & { mfaAuditController?: MFAAuditController })
    .mfaAuditController;

  if (!mfaAuditController) {
    throw new Error('MFAAuditController not found on server instance');
  }

  // Get MFA audit logs
  server.get(
    '/api/admin/mfa/audit',
    {
      schema: {
        description: 'Get MFA audit logs for the tenant',
        tags: ['MFA Audit', 'Admin'],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            eventType: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              logs: { type: 'array' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    (request, reply) => mfaAuditController.getAuditLogs(request, reply)
  );

  // Get MFA statistics
  server.get(
    '/api/admin/mfa/stats',
    {
      schema: {
        description: 'Get MFA statistics for the tenant',
        tags: ['MFA Audit', 'Admin'],
        querystring: {
          type: 'object',
          properties: {
            periodDays: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              totalUsers: { type: 'number' },
              usersWithMFA: { type: 'number' },
              mfaAdoptionRate: { type: 'number' },
              methodDistribution: { type: 'object' },
              recentEvents: { type: 'object' },
              periodStart: { type: 'string' },
              periodEnd: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => mfaAuditController.getStatistics(request, reply)
  );

  // Get user audit trail
  server.get(
    '/api/admin/mfa/audit/user/:userId',
    {
      schema: {
        description: 'Get MFA audit trail for a specific user',
        tags: ['MFA Audit', 'Admin'],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              logs: { type: 'array' },
            },
          },
        },
      },
    },
    (request, reply) => mfaAuditController.getUserAuditTrail(request, reply)
  );

  // Get failed MFA attempts
  server.get(
    '/api/admin/mfa/audit/failed-attempts',
    {
      schema: {
        description: 'Get failed MFA verification attempts',
        tags: ['MFA Audit', 'Admin'],
        querystring: {
          type: 'object',
          properties: {
            hours: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              logs: { type: 'array' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    (request, reply) => mfaAuditController.getFailedAttempts(request, reply)
  );

  // Export audit logs
  server.get(
    '/api/admin/mfa/audit/export',
    {
      schema: {
        description: 'Export MFA audit logs for compliance',
        tags: ['MFA Audit', 'Admin'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            format: { type: 'string', enum: ['json', 'csv'] },
          },
        },
      },
    },
    (request, reply) => mfaAuditController.exportAuditLogs(request, reply)
  );

  server.log.info('MFA Audit routes registered');
}

