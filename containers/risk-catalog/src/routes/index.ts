/**
 * Route registration for risk-catalog module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { RiskCatalogService } from '../services/RiskCatalogService';
import { ActionCatalogService } from '../services/ActionCatalogService';
import { CreateRiskInput, UpdateRiskInput, SetPonderationInput } from '../types/risk-catalog.types';
import {
  CreateActionCatalogEntryInput,
  UpdateActionCatalogEntryInput,
  GetApplicableCatalogEntriesInput,
  OpportunityContext,
  CreateActionCatalogCategoryInput,
  UpdateActionCatalogCategoryInput,
  CreateActionCatalogRelationshipInput,
} from '../types/action-catalog.types';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, _config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const riskCatalogService = new RiskCatalogService(fastify);
    const actionCatalogService = new ActionCatalogService(fastify);

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

    // W7 Gap 1 – Tenant catalog view for Layer 2 (ml-service extractRiskCatalogFeatures)
    fastify.get<{ Querystring: { industry?: string; stage?: string } }>(
      '/api/v1/risk-catalog/tenant-catalog',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get tenant catalog view (categories, templates, industry/methodology risks). W7 Layer 2.',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            properties: {
              industry: { type: 'string' },
              stage: { type: 'string' },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                tenantRiskCategories: { type: 'array', items: { type: 'string' } },
                categoryDefinitions: { type: 'object' },
                riskTemplates: { type: 'array' },
                industrySpecificRisks: { type: 'array', items: { type: 'string' } },
                methodologyRisks: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { industry, stage } = request.query;
          const view = await riskCatalogService.getTenantCatalog(tenantId, industry, stage);
          return reply.send(view);
        } catch (error: any) {
          log.error('Failed to get tenant catalog view', error, { service: 'risk-catalog' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'TENANT_CATALOG_VIEW_FAILED',
              message: error.message || 'Failed to get tenant catalog view',
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

    // ——— Action Catalog (Unified risks + recommendations, W2) ———
    fastify.get<{ Querystring: { type?: 'risk' | 'recommendation' } }>(
      '/api/v1/action-catalog/entries',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List action catalog entries (optional type filter)',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          querystring: { type: 'object', properties: { type: { type: 'string', enum: ['risk', 'recommendation'] } } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const entries = await actionCatalogService.listEntries(tenantId, request.query.type);
          return reply.send(entries);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_LIST_FAILED', message: msg } });
        }
      }
    );

    fastify.get<{ Querystring: { type: string; industry?: string; stage?: string; methodology?: string } }>(
      '/api/v1/action-catalog/entries/applicable',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get applicable catalog entries by context',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { type: 'string', enum: ['risk', 'recommendation'] },
              industry: { type: 'string' },
              stage: { type: 'string' },
              methodology: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const input: GetApplicableCatalogEntriesInput = {
            type: request.query.type as 'risk' | 'recommendation',
            industry: request.query.industry,
            stage: request.query.stage,
            methodology: request.query.methodology,
          };
          const entries = await actionCatalogService.getApplicableCatalogEntries(tenantId, input);
          return reply.send(entries);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_APPLICABLE_FAILED', message: msg } });
        }
      }
    );

    fastify.get<{ Params: { entryId: string } }>(
      '/api/v1/action-catalog/entries/:entryId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get action catalog entry by ID',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { entryId: { type: 'string' } }, required: ['entryId'] },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const entry = await actionCatalogService.getCatalogEntry(request.params.entryId, tenantId);
          if (!entry) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Entry not found' } });
          return reply.send(entry);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_GET_FAILED', message: msg } });
        }
      }
    );

    fastify.post<{ Body: CreateActionCatalogEntryInput }>(
      '/api/v1/action-catalog/entries',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create action catalog entry',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          body: { type: 'object' },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const entry = await actionCatalogService.createEntry(tenantId, userId, request.body as CreateActionCatalogEntryInput);
          return reply.status(201).send(entry);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_CREATE_FAILED', message: msg } });
        }
      }
    );

    fastify.put<{ Params: { entryId: string }; Body: UpdateActionCatalogEntryInput }>(
      '/api/v1/action-catalog/entries/:entryId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update action catalog entry',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { entryId: { type: 'string' } }, required: ['entryId'] },
          body: { type: 'object' },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const entry = await actionCatalogService.updateEntry(
            request.params.entryId,
            tenantId,
            userId,
            request.body as UpdateActionCatalogEntryInput
          );
          if (!entry) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Entry not found' } });
          return reply.send(entry);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_UPDATE_FAILED', message: msg } });
        }
      }
    );

    fastify.delete<{ Params: { entryId: string } }>(
      '/api/v1/action-catalog/entries/:entryId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete action catalog entry',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { entryId: { type: 'string' } }, required: ['entryId'] },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const ok = await actionCatalogService.deleteEntry(request.params.entryId, tenantId);
          if (!ok) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Entry not found' } });
          return reply.status(204).send();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_DELETE_FAILED', message: msg } });
        }
      }
    );

    // ——— Action Catalog Categories (§2.2) ———
    fastify.get<{ Querystring: Record<string, never> }>(
      '/api/v1/action-catalog/categories',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List action catalog categories with entry counts and effectiveness',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const categories = await actionCatalogService.listCategories(tenantId);
          return reply.send(categories);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_CATEGORIES_LIST_FAILED', message: msg } });
        }
      }
    );

    fastify.get<{ Params: { categoryId: string } }>(
      '/api/v1/action-catalog/categories/:categoryId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get action catalog category by ID',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { categoryId: { type: 'string' } }, required: ['categoryId'] },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const category = await actionCatalogService.getCategory(request.params.categoryId, tenantId);
          if (!category) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
          return reply.send(category);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_CATEGORY_GET_FAILED', message: msg } });
        }
      }
    );

    fastify.post<{ Body: CreateActionCatalogCategoryInput }>(
      '/api/v1/action-catalog/categories',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create action catalog category',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          body: { type: 'object' },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const category = await actionCatalogService.createCategory(tenantId, userId, request.body as CreateActionCatalogCategoryInput);
          return reply.status(201).send(category);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(error instanceof Error && error.message.includes('already exists') ? 409 : 500).send({
            error: { code: 'ACTION_CATALOG_CATEGORY_CREATE_FAILED', message: msg },
          });
        }
      }
    );

    fastify.put<{ Params: { categoryId: string }; Body: UpdateActionCatalogCategoryInput }>(
      '/api/v1/action-catalog/categories/:categoryId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update action catalog category',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { categoryId: { type: 'string' } }, required: ['categoryId'] },
          body: { type: 'object' },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const category = await actionCatalogService.updateCategory(
            request.params.categoryId,
            tenantId,
            userId,
            request.body as UpdateActionCatalogCategoryInput
          );
          if (!category) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
          return reply.send(category);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_CATEGORY_UPDATE_FAILED', message: msg } });
        }
      }
    );

    fastify.delete<{ Params: { categoryId: string }; Querystring: { reassignTo?: string } }>(
      '/api/v1/action-catalog/categories/:categoryId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete action catalog category; optional reassignTo reassigns entries to another category',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { categoryId: { type: 'string' } }, required: ['categoryId'] },
          querystring: { type: 'object', properties: { reassignTo: { type: 'string' } } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const ok = await actionCatalogService.deleteCategory(
            request.params.categoryId,
            tenantId,
            userId,
            request.query.reassignTo
          );
          if (!ok) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
          return reply.status(204).send();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_CATEGORY_DELETE_FAILED', message: msg } });
        }
      }
    );

    // ——— Action Catalog Relationships (§2.3) ———
    fastify.get<{ Querystring: Record<string, never> }>(
      '/api/v1/action-catalog/relationships',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List risk–recommendation relationships',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const relationships = await actionCatalogService.listRelationships(tenantId);
          return reply.send(relationships);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_RELATIONSHIPS_LIST_FAILED', message: msg } });
        }
      }
    );

    fastify.post<{ Body: CreateActionCatalogRelationshipInput }>(
      '/api/v1/action-catalog/relationships',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create risk–recommendation link (risk mitigates → recommendation)',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['riskId', 'recommendationId'],
            properties: {
              riskId: { type: 'string' },
              recommendationId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const rel = await actionCatalogService.createRelationship(tenantId, userId, request.body as CreateActionCatalogRelationshipInput);
          return reply.status(201).send(rel);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          const status = error instanceof Error && (msg.includes('not found') || msg.includes('is not a')) ? 404 : 400;
          return reply.status(status).send({ error: { code: 'ACTION_CATALOG_RELATIONSHIP_CREATE_FAILED', message: msg } });
        }
      }
    );

    fastify.delete<{ Querystring: { riskId: string; recommendationId: string } }>(
      '/api/v1/action-catalog/relationships',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Remove risk–recommendation link',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            required: ['riskId', 'recommendationId'],
            properties: {
              riskId: { type: 'string' },
              recommendationId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const { riskId, recommendationId } = request.query;
          const ok = await actionCatalogService.deleteRelationship(riskId, recommendationId, tenantId, userId);
          if (!ok) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Relationship or entry not found' } });
          return reply.status(204).send();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_RELATIONSHIP_DELETE_FAILED', message: msg } });
        }
      }
    );

    fastify.get<{ Params: { riskId: string } }>(
      '/api/v1/action-catalog/risks/:riskId/recommendations',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get recommendations that mitigate a risk',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { riskId: { type: 'string' } }, required: ['riskId'] },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const entries = await actionCatalogService.getRecommendationsForRisk(request.params.riskId, tenantId);
          return reply.send(entries);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_RECOMMENDATIONS_FAILED', message: msg } });
        }
      }
    );

    fastify.get<{ Params: { recId: string } }>(
      '/api/v1/action-catalog/recommendations/:recId/risks-mitigated',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risks mitigated by a recommendation',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { recId: { type: 'string' } }, required: ['recId'] },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const entries = await actionCatalogService.getRisksMitigatedByRecommendation(request.params.recId, tenantId);
          return reply.send(entries);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_RISKS_MITIGATED_FAILED', message: msg } });
        }
      }
    );

    fastify.post<{ Params: { entryId: string }; Body: OpportunityContext }>(
      '/api/v1/action-catalog/entries/:entryId/render',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Render recommendation template with opportunity context',
          tags: ['Action Catalog'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { entryId: { type: 'string' } }, required: ['entryId'] },
          body: { type: 'object' },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const entry = await actionCatalogService.getCatalogEntry(request.params.entryId, tenantId);
          if (!entry) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Entry not found' } });
          const rendered = actionCatalogService.renderRecommendation(entry, request.body as OpportunityContext);
          return reply.send(rendered);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return reply.status(500).send({ error: { code: 'ACTION_CATALOG_RENDER_FAILED', message: msg } });
        }
      }
    );

    log.info('Risk catalog routes registered', { service: 'risk-catalog' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'risk-catalog' });
    throw error;
  }
}
