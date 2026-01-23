/**
 * Route registration for risk-catalog module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { RiskCatalogService } from '../services/RiskCatalogService';
import { CreateRiskInput, UpdateRiskInput, SetPonderationInput } from '../types/risk-catalog.types';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const riskCatalogService = new RiskCatalogService(fastify);

    // Get applicable risk catalog (global + industry + tenant-specific)
    fastify.get<{ Params: { tenantId: string }; Querystring: { industryId?: string } }>(
      '/api/v1/risk-catalog/catalog/:tenantId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get applicable risk catalog for tenant',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
          params: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
            },
            required: ['tenantId'],
          },
          querystring: {
            type: 'object',
            properties: {
              industryId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId } = request.params;
          const { industryId } = request.query;
          const catalog = await riskCatalogService.getCatalog(tenantId, industryId);
          return reply.send(catalog);
        } catch (error: any) {
          log.error('Failed to get catalog', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'CATALOG_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve risk catalog',
            },
          });
        }
      }
    );

    // Create risk
    fastify.post<{ Body: CreateRiskInput }>(
      '/api/v1/risk-catalog/risks',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create custom risk (global, industry, or tenant-specific based on role)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const userRoles = (request.user as any)?.roles || [];
          const input = request.body as CreateRiskInput;

          const catalog = await riskCatalogService.createCustomRisk(tenantId, userId, input, userRoles);
          return reply.status(201).send(catalog);
        } catch (error: any) {
          log.error('Failed to create risk', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RISK_CREATION_FAILED',
              message: error.message || 'Failed to create risk',
            },
          });
        }
      }
    );

    // Update risk
    fastify.put<{ Params: { riskId: string }; Body: UpdateRiskInput }>(
      '/api/v1/risk-catalog/risks/:riskId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update risk catalog entry',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const updates = request.body as UpdateRiskInput;

          const catalog = await riskCatalogService.updateRisk(riskId, tenantId, userId, updates);
          return reply.send(catalog);
        } catch (error: any) {
          log.error('Failed to update risk', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RISK_UPDATE_FAILED',
              message: error.message || 'Failed to update risk',
            },
          });
        }
      }
    );

    // Delete tenant-specific risk
    fastify.delete<{ Params: { riskId: string } }>(
      '/api/v1/risk-catalog/risks/:riskId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete tenant-specific risk',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.deleteRisk(riskId, tenantId, userId);
          return reply.status(204).send();
        } catch (error: any) {
          log.error('Failed to delete risk', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RISK_DELETION_FAILED',
              message: error.message || 'Failed to delete risk',
            },
          });
        }
      }
    );

    // Duplicate risk
    fastify.post<{
      Params: { riskId: string };
      Body: { sourceCatalogType: 'global' | 'industry'; sourceIndustryId?: string; newRiskId?: string };
    }>(
      '/api/v1/risk-catalog/risks/:riskId/duplicate',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Duplicate risk (global/industry → tenant-specific)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { sourceCatalogType, sourceIndustryId, newRiskId } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const catalog = await riskCatalogService.duplicateRisk(
            riskId,
            sourceCatalogType,
            sourceIndustryId,
            tenantId,
            userId,
            newRiskId
          );
          return reply.status(201).send(catalog);
        } catch (error: any) {
          log.error('Failed to duplicate risk', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RISK_DUPLICATION_FAILED',
              message: error.message || 'Failed to duplicate risk',
            },
          });
        }
      }
    );

    // Enable risk for tenant
    fastify.put<{ Params: { riskId: string }; Body: { catalogType: 'global' | 'industry'; industryId?: string } }>(
      '/api/v1/risk-catalog/risks/:riskId/enable',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Enable risk for tenant',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { catalogType, industryId } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.setRiskEnabledForTenant(riskId, catalogType, industryId, tenantId, userId, true);
          return reply.status(204).send();
        } catch (error: any) {
          log.error('Failed to enable risk', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RISK_ENABLE_FAILED',
              message: error.message || 'Failed to enable risk',
            },
          });
        }
      }
    );

    // Disable risk for tenant
    fastify.put<{ Params: { riskId: string }; Body: { catalogType: 'global' | 'industry'; industryId?: string } }>(
      '/api/v1/risk-catalog/risks/:riskId/disable',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Disable risk for tenant',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { catalogType, industryId } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.setRiskEnabledForTenant(riskId, catalogType, industryId, tenantId, userId, false);
          return reply.status(204).send();
        } catch (error: any) {
          log.error('Failed to disable risk', { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RISK_DISABLE_FAILED',
              message: error.message || 'Failed to disable risk',
            },
          });
        }
      }
    );

    // Get risk weights
    fastify.get<{ Params: { riskId: string }; Querystring: { industryId?: string; opportunityType?: string } }>(
      '/api/v1/risk-catalog/risks/:riskId/ponderation',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk weights (ponderation)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { industryId, opportunityType } = request.query;
          const tenantId = request.user!.tenantId;

          const ponderation = await riskCatalogService.getPonderation(riskId, tenantId, industryId, opportunityType);
          return reply.send({ ponderation });
        } catch (error: any) {
          log.error('Failed to get ponderation', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'PONDERATION_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve risk ponderation',
            },
          });
        }
      }
    );

    // Set risk weights
    fastify.put<{ Params: { riskId: string }; Body: SetPonderationInput }>(
      '/api/v1/risk-catalog/risks/:riskId/ponderation',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Set risk weights (ponderation)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { ponderations } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.setPonderation(riskId, tenantId, userId, ponderations);
          return reply.status(204).send();
        } catch (error: any) {
          log.error('Failed to set ponderation', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'PONDERATION_UPDATE_FAILED',
              message: error.message || 'Failed to update risk ponderation',
            },
          });
        }
      }
    );

    log.info('Risk catalog routes registered', { service: 'risk-catalog' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'risk-catalog' });
    throw error;
  }
}
