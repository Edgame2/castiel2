/**
 * Audit & Compliance API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient } from '@coder/shared';
import { ComplianceService } from '../services/ComplianceService';
import { z } from 'zod';

const auditLogsSchema = z.object({
  secretId: z.string().optional(),
  eventType: z.array(z.string()).optional(),
  actorId: z.string().optional(),
  outcome: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export async function auditRoutes(fastify: FastifyInstance) {
  const complianceService = new ComplianceService();

  // List audit logs
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = auditLogsSchema.parse(request.query);
      const user = (request as any).user;
      
      const where: any = {};
      
      if (query.secretId) {
        where.secretId = query.secretId;
      }
      
      if (query.eventType && query.eventType.length > 0) {
        where.eventType = { in: query.eventType };
      }
      
      if (query.actorId) {
        where.actorId = query.actorId;
      }
      
      if (query.outcome && query.outcome.length > 0) {
        where.outcome = { in: query.outcome };
      }
      
      if (query.startDate || query.endDate) {
        where.timestamp = {};
        if (query.startDate) {
          where.timestamp.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.timestamp.lte = new Date(query.endDate);
        }
      }
      
      // Scope to user's organization if not super admin
      if (!user.roles?.includes('Super Admin')) {
        where.organizationId = user.organizationId;
      }
      
      const db = getDatabaseClient() as any;
      const logs = await db.secret_audit_logs.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        take: query.limit || 50,
        skip: query.page ? (query.page - 1) * (query.limit || 50) : 0,
      });
      
      reply.send(logs);
    } catch (error: any) {
      throw error;
    }
  });

  // Get audit log details
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const db = getDatabaseClient() as any;
      const log = await db.secret_audit_logs.findUnique({
        where: { id },
      });
      
      if (!log) {
        throw new Error('Audit log not found');
      }
      
      reply.send(log);
    } catch (error: any) {
      throw error;
    }
  });

  // Generate compliance report
  fastify.get('/compliance/report', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { startDate: string; endDate: string };
      const user = (request as any).user;
      
      if (!query.startDate || !query.endDate) {
        throw new Error('startDate and endDate are required');
      }
      
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      // Generate comprehensive compliance report
      const report = await complianceService.generateReport({
        organizationId: user.organizationId,
        startDate,
        endDate,
      });
      
      reply.send(report);
    } catch (error: any) {
      throw error;
    }
  });
}
