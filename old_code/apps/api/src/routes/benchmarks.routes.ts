/**
 * Benchmarks API Routes
 * REST endpoints for benchmarking win rates, closing times, deal sizes, and renewals
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { BenchmarkingService } from '../services/benchmarking.service.js';
import {
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
} from '@castiel/api-core';
import { requireAuth } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import type { RoleManagementService } from '../services/auth/role-management.service.js';

interface BenchmarksRoutesOptions {
  monitoring: IMonitoringProvider;
  shardRepository: ShardRepository;
  shardTypeRepository: ShardTypeRepository;
  relationshipService: ShardRelationshipService;
  roleManagementService?: RoleManagementService; // Optional - for permission checking
}

/**
 * Register benchmarks routes
 */
export async function registerBenchmarksRoutes(
  server: FastifyInstance,
  options: BenchmarksRoutesOptions
): Promise<void> {
  const {
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    roleManagementService,
  } = options;

  // Initialize service
  const benchmarkingService = new BenchmarkingService(
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService
  );

  // Get authentication decorator
  const authDecorator = (server as any).authenticate;
  if (!authDecorator) {
    server.log.warn('⚠️  Benchmarks routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // Create permission guard if role management service is available
  // Note: Benchmarks are read-only aggregated analytics. Currently accessible to all authenticated users.
  // Future: Could restrict team-level benchmarks with quota:read:team or risk:read:team if needed.
  let checkPermission: ((permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>) | undefined;
  if (roleManagementService) {
    checkPermission = createPermissionGuard(roleManagementService);
  }

  // ===============================================
  // BENCHMARK ROUTES
  // ===============================================

  // GET /api/v1/benchmarks/win-rates - Calculate win rates
  server.get(
    '/api/v1/benchmarks/win-rates',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Benchmarks'],
        summary: 'Calculate win rates',
        querystring: {
          type: 'object',
          properties: {
            industryId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            scope: { type: 'string', enum: ['tenant', 'industry', 'peer'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ 
      Querystring: {
        industryId?: string;
        startDate?: string;
        endDate?: string;
        scope?: 'tenant' | 'industry' | 'peer';
      }
    }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const options: any = {};
        const query = request.query;
        if (query.industryId) {options.industryId = query.industryId;}
        if (query.startDate) {options.startDate = new Date(query.startDate);}
        if (query.endDate) {options.endDate = new Date(query.endDate);}
        if (query.scope) {options.scope = query.scope;}

        const benchmark = await benchmarkingService.calculateWinRates(
          authRequest.user.tenantId,
          options
        );
        return reply.code(200).send(benchmark);
      } catch (error: any) {
        monitoring.trackException(error, { operation: 'benchmarks.calculateWinRates' });
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // GET /api/v1/benchmarks/closing-times - Calculate closing times
  server.get(
    '/api/v1/benchmarks/closing-times',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Benchmarks'],
        summary: 'Calculate closing times',
        querystring: {
          type: 'object',
          properties: {
            industryId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            scope: { type: 'string', enum: ['tenant', 'industry', 'peer'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ 
      Querystring: {
        industryId?: string;
        startDate?: string;
        endDate?: string;
        scope?: 'tenant' | 'industry' | 'peer';
      }
    }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const options: any = {};
        const query = request.query;
        if (query.industryId) {options.industryId = query.industryId;}
        if (query.startDate) {options.startDate = new Date(query.startDate);}
        if (query.endDate) {options.endDate = new Date(query.endDate);}
        if (query.scope) {options.scope = query.scope;}

        const benchmark = await benchmarkingService.calculateClosingTimes(
          authRequest.user.tenantId,
          options
        );
        return reply.code(200).send(benchmark);
      } catch (error: any) {
        monitoring.trackException(error, { operation: 'benchmarks.calculateClosingTimes' });
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // GET /api/v1/benchmarks/deal-sizes - Calculate deal size distribution
  server.get(
    '/api/v1/benchmarks/deal-sizes',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Benchmarks'],
        summary: 'Calculate deal size distribution',
        querystring: {
          type: 'object',
          properties: {
            industryId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            scope: { type: 'string', enum: ['tenant', 'industry', 'peer'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ 
      Querystring: {
        industryId?: string;
        startDate?: string;
        endDate?: string;
        scope?: 'tenant' | 'industry' | 'peer';
      }
    }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const options: any = {};
        const query = request.query;
        if (query.industryId) {options.industryId = query.industryId;}
        if (query.startDate) {options.startDate = new Date(query.startDate);}
        if (query.endDate) {options.endDate = new Date(query.endDate);}
        if (query.scope) {options.scope = query.scope;}

        const benchmark = await benchmarkingService.calculateDealSizeDistribution(
          authRequest.user.tenantId,
          options
        );
        return reply.code(200).send(benchmark);
      } catch (error: any) {
        monitoring.trackException(error, { operation: 'benchmarks.calculateDealSizeDistribution' });
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // GET /api/v1/benchmarks/renewals/:contractId - Estimate renewal
  server.get(
    '/api/v1/benchmarks/renewals/:contractId',
    {
      onRequest: authGuards,
      schema: {
        tags: ['Benchmarks'],
        summary: 'Estimate renewal probability for contract',
        params: {
          type: 'object',
          properties: { contractId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { contractId: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      try {
        const estimate = await benchmarkingService.estimateRenewal(
          request.params.contractId,
          authRequest.user.tenantId
        );
        return reply.code(200).send(estimate);
      } catch (error: any) {
        monitoring.trackException(error, { operation: 'benchmarks.estimateRenewal' });
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  server.log.info('✅ Benchmarks routes registered');
}


