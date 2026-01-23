/**
 * Search and Query Routes
 * Per ModuleImplementationGuide Section 7
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logSearchSchema, aggregationSchema } from '../utils/validation';
import { LogSearchParams, LogAggregationParams } from '../types';
import { QueryContext } from '../services/QueryService';
import { checkPermission, canAccessCrossOrg, isUserOnlyAccess, AuditPermission } from '../middleware/rbac';
import { log } from '../utils/logger';

interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId?: string;
}

/**
 * Build query context from authenticated user
 */
async function buildQueryContext(user: AuthenticatedUser | undefined): Promise<QueryContext> {
  if (!user) {
    return {
      userId: 'anonymous',
      organizationId: undefined,
      canAccessCrossOrg: false,
      ownActivityOnly: true,
    };
  }
  
  const crossOrg = await canAccessCrossOrg(user.id);
  const ownOnly = isUserOnlyAccess(user);
  
  return {
    userId: user.id,
    organizationId: user.organizationId,
    canAccessCrossOrg: crossOrg,
    ownActivityOnly: ownOnly,
  };
}

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  const queryService = (app as any).queryService;
  
  if (!queryService) {
    throw new Error('QueryService not available');
  }
  
  /**
   * GET /api/v1/logs - List logs with filters
   */
  app.get('/logs', {
    schema: {
      description: 'List audit logs with filters',
      tags: ['Search'],
      querystring: {
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 500 },
          userId: { type: 'string' },
          action: { type: 'string' },
          category: { type: 'string', enum: ['ACTION', 'ACCESS', 'SECURITY', 'SYSTEM', 'CUSTOM'] },
          severity: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] },
          resourceType: { type: 'string' },
          resourceId: { type: 'string' },
          source: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
          sortBy: { type: 'string', enum: ['timestamp', 'action', 'severity'], default: 'timestamp' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as AuthenticatedUser | undefined;
      
      // Build query context for access control
      const context = await buildQueryContext(user);
      
      // Validate query params
      const params = logSearchSchema.parse(request.query);
      
      // Build search params
      const searchParams: LogSearchParams = {
        ...params,
      };
      
      // Execute search with org isolation applied by QueryService
      const result = await queryService.search(searchParams, context);
      
      // Log the search (audit of audit)
      log.debug('Logs searched', { 
        userId: user?.id, 
        query: params.query,
        resultCount: result.items.length,
      });
      
      return reply.send({
        data: result.items,
        pagination: {
          total: result.total,
          limit: params.limit || 50,
          offset: params.offset || 0,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      throw error;
    }
  });
  
  /**
   * GET /api/v1/logs/search - Advanced search
   */
  app.get('/logs/search', {
    schema: {
      description: 'Search audit logs with full-text search',
      tags: ['Search'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1, maxLength: 500 },
          category: { type: 'string' },
          severity: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { q: string; category?: string; severity?: string; startDate?: string; endDate?: string; limit?: number } }>, reply: FastifyReply) => {
    const user = (request as any).user as AuthenticatedUser | undefined;
    const query = request.query;
    
    // Build query context for access control
    const context = await buildQueryContext(user);
    
    const searchParams: LogSearchParams = {
      query: query.q,
      category: query.category as any,
      severity: query.severity as any,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit || 50,
    };
    
    const result = await queryService.search(searchParams, context);
    
    return reply.send({
      data: result.items,
      pagination: {
        total: result.total,
        limit: query.limit || 50,
        offset: 0,
        hasMore: result.hasMore,
      },
    });
  });
  
  /**
   * GET /api/v1/logs/aggregate - Get aggregation statistics
   */
  app.get('/logs/aggregate', {
    schema: {
      description: 'Get aggregation statistics for audit logs',
      tags: ['Search'],
      querystring: {
        type: 'object',
        required: ['field'],
        properties: {
          field: { type: 'string', enum: ['category', 'severity', 'action', 'source', 'resourceType'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as AuthenticatedUser | undefined;
      
      // Build query context for access control
      const context = await buildQueryContext(user);
      
      // Validate params
      const params = aggregationSchema.parse(request.query);
      
      const aggParams: LogAggregationParams = {
        ...params,
      };
      
      const result = await queryService.aggregate(aggParams, context);
      
      return reply.send({ data: result });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      throw error;
    }
  });
  
  /**
   * GET /api/v1/logs/stats - Get dashboard statistics
   */
  app.get('/logs/stats', {
    schema: {
      description: 'Get dashboard statistics for audit logs',
      tags: ['Search'],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
    const user = (request as any).user as AuthenticatedUser | undefined;
    const { startDate, endDate } = request.query;
    
    // Build query context for access control
    const context = await buildQueryContext(user);
    
    const baseParams = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    // Get multiple aggregations in parallel (with org isolation)
    const [
      totalCount,
      byCategory,
      bySeverity,
      byAction,
    ] = await Promise.all([
      queryService.count(baseParams, context),
      queryService.aggregate({ ...baseParams, field: 'category', limit: 10 }, context),
      queryService.aggregate({ ...baseParams, field: 'severity', limit: 10 }, context),
      queryService.aggregate({ ...baseParams, field: 'action', limit: 10 }, context),
    ]);
    
    return reply.send({
      data: {
        total: totalCount,
        byCategory: byCategory.buckets,
        bySeverity: bySeverity.buckets,
        topActions: byAction.buckets,
      },
    });
  });
}

