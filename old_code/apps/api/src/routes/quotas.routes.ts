/**
 * Quota API Routes
 * REST endpoints for quota management and performance tracking
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { QuotaService } from '../services/quota.service.js';
import {
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
  RiskEvaluationService,
  RiskCatalogService,
  VectorSearchService,
  InsightService,
} from '@castiel/api-core';
import { RevenueAtRiskService } from '../services/revenue-at-risk.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
import type { UpdateQuotaInput } from '../types/quota.types.js';

interface QuotaRoutesOptions {
  monitoring: IMonitoringProvider;
  shardRepository: ShardRepository;
  shardTypeRepository: ShardTypeRepository;
  relationshipService: ShardRelationshipService;
  vectorSearchService: VectorSearchService;
  insightService: InsightService;
  roleManagementService?: RoleManagementService; // Optional - for permission checking
}

/**
 * Register quota routes
 */
export async function registerQuotaRoutes(
  server: FastifyInstance,
  options: QuotaRoutesOptions
): Promise<void> {
  const {
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    vectorSearchService,
    insightService,
    roleManagementService,
  } = options;

  // Initialize services
  const riskCatalogService = new RiskCatalogService(
    monitoring,
    shardRepository,
    shardTypeRepository
  );

  // Initialize Phase 1 services for risk evaluation
  const { ShardValidationService } = await import('../services/shard-validation.service.js');
  const shardValidationService = new ShardValidationService(monitoring);
  await shardValidationService.initialize();

  const { DataQualityService } = await import('../services/data-quality.service.js');
  const dataQualityService = new DataQualityService(shardValidationService, monitoring);

  const { TrustLevelService } = await import('../services/trust-level.service.js');
  const trustLevelService = new TrustLevelService();

  const { RiskAIValidationService } = await import('../services/risk-ai-validation.service.js');
  const riskAIValidationService = new RiskAIValidationService();

  const { RiskExplainabilityService } = await import('../services/risk-explainability.service.js');
  const riskExplainabilityService = new RiskExplainabilityService();

  // Initialize ComprehensiveAuditTrailService for Phase 2 audit logging
  const { ComprehensiveAuditTrailService } = await import('../services/comprehensive-audit-trail.service.js');
  const { CosmosDBService } = await import('../services/cosmos-db.service.js');
  const cosmosDB = new CosmosDBService();
  const comprehensiveAuditTrailService = new ComprehensiveAuditTrailService(cosmosDB, monitoring);

  const riskEvaluationService = new RiskEvaluationService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    riskCatalogService,
    vectorSearchService,
    insightService,
    undefined, // queueService
    dataQualityService,
    trustLevelService,
    riskAIValidationService,
    riskExplainabilityService,
    comprehensiveAuditTrailService
  );

  const revenueAtRiskService = new RevenueAtRiskService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    riskEvaluationService
  );

  const quotaService = new QuotaService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    revenueAtRiskService
  );

  // Get authentication decorator
  const authDecorator = (server as any).authenticate;
  if (!authDecorator) {
    server.log.warn('⚠️  Quota routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // Create permission guard if role management service is available
  let checkPermission: ((permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>) | undefined;
  if (roleManagementService) {
    checkPermission = createPermissionGuard(roleManagementService);
  }

  // ===============================================
  // QUOTA CRUD ROUTES
  // ===============================================

  // POST /api/v1/quotas - Create quota
  server.post(
    '/api/v1/quotas',
    {
      onRequest: checkPermission ? [...authGuards, checkPermission('shard:create:tenant')] : authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'Create a new quota',
        body: {
          type: 'object',
          required: ['quotaType', 'period', 'target'],
          properties: {
            quotaType: { type: 'string', enum: ['individual', 'team', 'tenant'] },
            targetUserId: { type: 'string' },
            teamId: { type: 'string' },
            period: {
              type: 'object',
              required: ['type', 'startDate', 'endDate'],
              properties: {
                type: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'] },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
              },
            },
            target: {
              type: 'object',
              required: ['amount', 'currency'],
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' },
                opportunityCount: { type: 'number' },
              },
            },
            parentQuotaId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const input = request.body as any;
        // Convert date strings to Date objects
        if (input.period) {
          input.period.startDate = new Date(input.period.startDate);
          input.period.endDate = new Date(input.period.endDate);
        }
        const quota = await quotaService.createQuota(
          authRequest.user.tenantId,
          authRequest.user.id,
          input
        );
        return reply.code(201).send(quota);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.createQuota' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // GET /api/v1/quotas/:quotaId - Get quota
  server.get(
    '/api/v1/quotas/:quotaId',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'Get quota by ID',
        params: {
          type: 'object',
          properties: { quotaId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { quotaId: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const quota = await quotaService.getQuota(
          request.params.quotaId,
          authRequest.user.tenantId
        );
        if (!quota) {
          return reply.code(404).send({ error: 'Quota not found' });
        }
        return reply.code(200).send(quota);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.getQuota' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // PUT /api/v1/quotas/:quotaId - Update quota
  server.put(
    '/api/v1/quotas/:quotaId',
    {
      onRequest: checkPermission ? [...authGuards, checkPermission('shard:update:all')] : authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'Update quota',
        params: {
          type: 'object',
          properties: { quotaId: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            target: { type: 'object' },
            period: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { quotaId: string }; Body: any }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const input = request.body as UpdateQuotaInput;
        // Convert date strings to Date objects if present
        if (input.period && typeof input.period === 'object') {
          if (input.period.startDate && typeof input.period.startDate === 'string') {
            input.period.startDate = new Date(input.period.startDate);
          }
          if (input.period.endDate && typeof input.period.endDate === 'string') {
            input.period.endDate = new Date(input.period.endDate);
          }
        }
        const quota = await quotaService.updateQuota(
          request.params.quotaId,
          authRequest.user.tenantId,
          authRequest.user.id,
          input
        );
        return reply.code(200).send(quota);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.updateQuota' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // GET /api/v1/quotas - List quotas
  // Note: Service should filter based on quota type (individual/team/tenant)
  // Individual quotas accessible via shard:read:assigned
  // Team quotas require quota:read:team
  // Tenant quotas require admin
  server.get(
    '/api/v1/quotas',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'List quotas',
        querystring: {
          type: 'object',
          properties: {
            quotaType: { type: 'string', enum: ['individual', 'team', 'tenant'] },
            targetUserId: { type: 'string' },
            teamId: { type: 'string' },
            periodType: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const quotas = await quotaService.listQuotas(
          authRequest.user.tenantId,
          request.query as {
            quotaType?: 'tenant' | 'team' | 'individual';
            targetUserId?: string;
            teamId?: string;
            periodType?: 'monthly' | 'quarterly' | 'yearly';
          }
        );
        return reply.code(200).send(quotas);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.listQuotas' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // ===============================================
  // QUOTA PERFORMANCE ROUTES
  // ===============================================

  // POST /api/v1/quotas/:quotaId/calculate-performance - Calculate performance
  server.post(
    '/api/v1/quotas/:quotaId/calculate-performance',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'Calculate quota performance',
        params: {
          type: 'object',
          properties: { quotaId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { quotaId: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const performance = await quotaService.calculatePerformance(
          request.params.quotaId,
          authRequest.user.tenantId,
          authRequest.user.id
        );
        return reply.code(200).send(performance);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.calculatePerformance' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // GET /api/v1/quotas/:quotaId/forecast - Get quota forecast
  server.get(
    '/api/v1/quotas/:quotaId/forecast',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'Get quota forecast',
        params: {
          type: 'object',
          properties: { quotaId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { quotaId: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const forecast = await quotaService.getForecast(
          request.params.quotaId,
          authRequest.user.tenantId,
          authRequest.user.id
        );
        return reply.code(200).send(forecast);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.getForecast' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // POST /api/v1/quotas/:quotaId/rollup - Rollup quota
  server.post(
    '/api/v1/quotas/:quotaId/rollup',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'Rollup quota from children',
        params: {
          type: 'object',
          properties: { quotaId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { quotaId: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const quota = await quotaService.rollupQuotas(
          request.params.quotaId,
          authRequest.user.tenantId,
          authRequest.user.id
        );
        return reply.code(200).send(quota);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.rollupQuotas' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // DELETE /api/v1/quotas/:quotaId - Delete quota
  server.delete(
    '/api/v1/quotas/:quotaId',
    {
      onRequest: checkPermission ? [...authGuards, checkPermission('shard:delete:all')] : authGuards,
      schema: {
        tags: ['Quotas'],
        summary: 'Delete quota',
        params: {
          type: 'object',
          properties: { quotaId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { quotaId: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        await quotaService.deleteQuota(
          request.params.quotaId,
          authRequest.user.tenantId,
          authRequest.user.id
        );
        return reply.code(204).send();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          { operation: 'quotas.deleteQuota' }
        );
        return reply.code(500).send({ error: errorMessage });
      }
    }
  );

  server.log.info('✅ Quota routes registered');
}

