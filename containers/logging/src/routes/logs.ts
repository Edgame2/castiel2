/**
 * Log Ingestion Routes
 * Per ModuleImplementationGuide Section 7
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { createLogSchema, batchLogSchema } from '../utils/validation';
import { CreateLogInput } from '../types';
import { log } from '../utils/logger';

interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId?: string;
}

export async function registerLogRoutes(app: FastifyInstance): Promise<void> {
  const ingestionService = (app as any).ingestionService;
  
  /**
   * POST /api/v1/logs - Create a single log entry
   */
  app.post('/logs', {
    schema: {
      description: 'Create an audit log entry',
      tags: ['Logs'],
      body: {
        type: 'object',
        required: ['action', 'message'],
        properties: {
          action: { type: 'string', minLength: 1, maxLength: 255 },
          message: { type: 'string', minLength: 1, maxLength: 10000 },
          category: { type: 'string', enum: ['ACTION', 'ACCESS', 'SECURITY', 'SYSTEM', 'CUSTOM'] },
          severity: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] },
          resourceType: { type: 'string', maxLength: 100 },
          resourceId: { type: 'string', maxLength: 255 },
          metadata: { type: 'object' },
          correlationId: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                action: { type: 'string' },
                category: { type: 'string' },
                severity: { type: 'string' },
                message: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as AuthenticatedUser | undefined;
      
      // Validate input
      const input = createLogSchema.parse(request.body);
      
      // Get context from auth
      const context = {
        organizationId: user?.organizationId,
        userId: user?.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      };
      
      // Ingest the log
      const result = await ingestionService.ingest(input as CreateLogInput, context);
      
      log.debug('Log created', { logId: result.id, action: result.action });
      
      return reply.status(201).send({
        data: {
          id: result.id,
          action: result.action,
          category: result.category,
          severity: result.severity,
          message: result.message,
          timestamp: result.timestamp.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }
      throw error;
    }
  });
  
  /**
   * POST /api/v1/logs/batch - Create multiple log entries
   */
  app.post('/logs/batch', {
    schema: {
      description: 'Create multiple audit log entries',
      tags: ['Logs'],
      body: {
        type: 'object',
        required: ['logs'],
        properties: {
          logs: {
            type: 'array',
            minItems: 1,
            maxItems: 1000,
            items: {
              type: 'object',
              required: ['action', 'message'],
              properties: {
                action: { type: 'string' },
                message: { type: 'string' },
                category: { type: 'string' },
                severity: { type: 'string' },
                resourceType: { type: 'string' },
                resourceId: { type: 'string' },
                metadata: { type: 'object' },
              },
            },
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                count: { type: 'number' },
                ids: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as AuthenticatedUser | undefined;
      
      // Validate input
      const { logs } = batchLogSchema.parse(request.body);
      
      // Get context from auth
      const context = {
        organizationId: user?.organizationId,
        userId: user?.id,
      };
      
      // Ingest the logs
      const results = await ingestionService.ingestBatch(logs as CreateLogInput[], context);
      
      log.info('Batch logs created', { count: results.length });
      
      return reply.status(201).send({
        data: {
          count: results.length,
          ids: results.map((r: { id: string }) => r.id),
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }
      throw error;
    }
  });
  
  /**
   * GET /api/v1/logs/:id - Get a single log entry
   */
  app.get('/logs/:id', {
    schema: {
      description: 'Get an audit log entry by ID',
      tags: ['Logs'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = (request as any).user as AuthenticatedUser | undefined;
    const storageProvider = (app as any).storageProvider;
    
    const logEntry = await storageProvider.getById(
      request.params.id,
      user?.organizationId
    );
    
    if (!logEntry) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: `Log not found: ${request.params.id}`,
        },
      });
    }
    
    // Log access (audit of audit)
    log.debug('Log accessed', { logId: logEntry.id, userId: user?.id });
    
    return reply.send({ data: logEntry });
  });
  
  /**
   * GET /api/v1/logs/my-activity - Get current user's activity
   */
  app.get('/logs/my-activity', {
    schema: {
      description: 'Get audit logs for the current user',
      tags: ['Logs'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>, reply: FastifyReply) => {
    const user = (request as any).user as AuthenticatedUser | undefined;
    
    if (!user) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }
    
    const storageProvider = (app as any).storageProvider;
    
    const result = await storageProvider.search({
      userId: user.id,
      limit: request.query.limit || 20,
      offset: request.query.offset || 0,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
    
    return reply.send({
      data: result.items,
      pagination: {
        total: result.total,
        limit: request.query.limit || 20,
        offset: request.query.offset || 0,
        hasMore: result.hasMore,
      },
    });
  });
}

