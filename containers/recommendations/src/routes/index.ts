/**
 * Route registration for recommendations module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { RecommendationsService } from '../services/RecommendationsService';
import { rankMitigationActions } from '../services/MitigationRankingService';
import {
  createWorkflow,
  getWorkflow,
  getWorkflowsByOpportunity,
  completeStep,
  cancelWorkflow,
} from '../services/RemediationWorkflowService';
import { FeedbackAction } from '../types/recommendations.types';
import { getContainer } from '@coder/shared';
import { FeedbackService } from '../services/FeedbackService';
import { TenantTemplateService } from '../services/TenantTemplateService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, _config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const recommendationsService = new RecommendationsService(fastify);
    const feedbackService = new FeedbackService();
    const tenantTemplateService = new TenantTemplateService();

    // ——— Admin: Feedback types (Super Admin, global) ———
    fastify.get<{ Querystring: { includeUsage?: string } }>(
      '/api/v1/admin/feedback-types',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get all feedback types (global). Super Admin. Seeds 25+ types if empty. includeUsage=true adds usageCount and lastUsed (§1.1.1).',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          querystring: { type: 'object', properties: { includeUsage: { type: 'string', enum: ['true', 'false'] } } },
          response: { 200: { type: 'array', items: { type: 'object' } } },
        },
      },
      async (request, reply) => {
        try {
          const types = await feedbackService.getFeedbackTypes();
          const includeUsage = request.query?.includeUsage !== 'false';
          if (includeUsage && types.length > 0) {
            const stats = await feedbackService.getFeedbackTypeUsageStats(types.map((t) => t.id));
            const withUsage = types.map((t) => {
              const s = stats.get(t.id);
              return s
                ? { ...t, usageCount: s.usageCount, lastUsed: s.lastUsed || undefined }
                : { ...t, usageCount: 0, lastUsed: undefined };
            });
            return reply.send(withUsage);
          }
          return reply.send(types);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get feedback types failed', error as Error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'FEEDBACK_TYPES_FAILED', message: msg } });
        }
      }
    );

    fastify.get<{ Params: { id: string } }>(
      '/api/v1/admin/feedback-types/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get a single feedback type by id. Super Admin.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'object' }, 404: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const type = await feedbackService.getFeedbackTypeById(id);
          if (!type) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Feedback type not found' } });
          return reply.send(type);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'FEEDBACK_TYPE_FAILED', message: msg } });
        }
      }
    );

    fastify.post<{ Body: import('../types/feedback.types').CreateFeedbackTypeInput }>(
      '/api/v1/admin/feedback-types',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create a feedback type. Super Admin. Name must be unique slug (e.g. alphanumeric + underscore).',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['name', 'displayName', 'category', 'sentiment', 'sentimentScore', 'order', 'behavior', 'applicableToRecTypes', 'isActive', 'isDefault'],
            properties: {
              name: { type: 'string' },
              displayName: { type: 'string' },
              category: { type: 'string', enum: ['action', 'relevance', 'quality', 'timing', 'other'] },
              sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
              sentimentScore: { type: 'number' },
              icon: { type: 'string' },
              color: { type: 'string' },
              order: { type: 'number' },
              behavior: {
                type: 'object',
                properties: {
                  createsTask: { type: 'boolean' },
                  hidesRecommendation: { type: 'boolean' },
                  hideDurationDays: { type: 'number' },
                  suppressSimilar: { type: 'boolean' },
                  requiresComment: { type: 'boolean' },
                },
              },
              applicableToRecTypes: { type: 'array', items: { type: 'string' } },
              isActive: { type: 'boolean' },
              isDefault: { type: 'boolean' },
              translations: { type: 'object' },
            },
          },
          response: { 201: { type: 'object' }, 409: { type: 'object' }, 500: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const createdBy = request.user?.id ?? 'unknown';
          const type = await feedbackService.createFeedbackType(request.body, createdBy);
          return reply.status(201).send(type);
        } catch (error: unknown) {
          const err = error as Error & { statusCode?: number };
          const msg = err.message ?? String(error);
          const code = err.statusCode === 409 ? 409 : 500;
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(code).send({ error: { code: code === 409 ? 'CONFLICT' : 'FEEDBACK_TYPE_CREATE_FAILED', message: msg } });
        }
      }
    );

    fastify.put<{ Params: { id: string }; Body: import('../types/feedback.types').UpdateFeedbackTypeInput }>(
      '/api/v1/admin/feedback-types/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update a feedback type. Super Admin.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          body: {
            type: 'object',
            properties: {
              displayName: { type: 'string' },
              category: { type: 'string', enum: ['action', 'relevance', 'quality', 'timing', 'other'] },
              sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
              sentimentScore: { type: 'number' },
              icon: { type: 'string' },
              color: { type: 'string' },
              order: { type: 'number' },
              behavior: { type: 'object' },
              applicableToRecTypes: { type: 'array', items: { type: 'string' } },
              isActive: { type: 'boolean' },
              isDefault: { type: 'boolean' },
              translations: { type: 'object' },
            },
          },
          response: { 200: { type: 'object' }, 404: { type: 'object' }, 500: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const updatedBy = request.user?.id ?? 'unknown';
          const type = await feedbackService.updateFeedbackType(id, request.body, updatedBy);
          if (!type) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Feedback type not found' } });
          return reply.send(type);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'FEEDBACK_TYPE_UPDATE_FAILED', message: msg } });
        }
      }
    );

    fastify.delete<{ Params: { id: string } }>(
      '/api/v1/admin/feedback-types/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete a feedback type. Super Admin §1.1.4. Pre-deletion checks: not default, not in use, inactive 30 days.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: {
            204: { type: 'null' },
            400: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
            404: { type: 'object' },
            500: { type: 'object' },
          },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const deleted = await feedbackService.deleteFeedbackType(id);
          if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Feedback type not found' } });
          return reply.status(204).send();
        } catch (error: unknown) {
          const err = error as Error & { statusCode?: number };
          const msg = err.message ?? String(error);
          const code = err.statusCode === 400 ? 400 : 500;
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } })
            .status(code)
            .send({ error: { code: code === 400 ? 'DELETE_NOT_ALLOWED' : 'FEEDBACK_TYPE_DELETE_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: Feedback types bulk (must be before :id for clarity) ———
    fastify.post<{ Body: import('../types/feedback.types').BulkFeedbackTypesInput }>(
      '/api/v1/admin/feedback-types/bulk',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Bulk update feedback types. Super Admin §1.1.5. Operations: activate, deactivate, setCategory, setSentiment.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['operation', 'ids'],
            properties: {
              operation: { type: 'string', enum: ['activate', 'deactivate', 'setCategory', 'setSentiment'] },
              ids: { type: 'array', items: { type: 'string' } },
              category: { type: 'string', enum: ['action', 'relevance', 'quality', 'timing', 'other'] },
              sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
              sentimentScore: { type: 'number' },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                updated: { type: 'number' },
                failed: {
                  type: 'array',
                  items: { type: 'object', properties: { id: { type: 'string' }, error: { type: 'string' } } },
                },
              },
            },
            400: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
          },
        },
      },
      async (request, reply) => {
        try {
          const updatedBy = request.user?.id ?? 'unknown';
          const result = await feedbackService.bulkUpdateFeedbackTypes(request.body, updatedBy);
          return reply.send(result);
        } catch (error: unknown) {
          const err = error as Error & { statusCode?: number };
          const msg = err.message ?? String(error);
          const code = err.statusCode === 400 ? 400 : 500;
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } })
            .status(code)
            .send({ error: { code: code === 400 ? 'VALIDATION_ERROR' : 'BULK_UPDATE_FAILED', message: msg } });
        }
      }
    );

    fastify.post<{ Body: import('../types/feedback.types').ImportFeedbackTypesInput }>(
      '/api/v1/admin/feedback-types/import',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Import feedback types from JSON. Super Admin §1.1.5. Create or update by name.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    displayName: { type: 'string' },
                    category: { type: 'string', enum: ['action', 'relevance', 'quality', 'timing', 'other'] },
                    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                    sentimentScore: { type: 'number' },
                    icon: { type: 'string' },
                    color: { type: 'string' },
                    order: { type: 'number' },
                    behavior: { type: 'object' },
                    applicableToRecTypes: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                    isDefault: { type: 'boolean' },
                    translations: { type: 'object' },
                  },
                },
              },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                created: { type: 'number' },
                updated: { type: 'number' },
                failed: {
                  type: 'array',
                  items: { type: 'object', properties: { index: { type: 'number' }, error: { type: 'string' } } },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const createdBy = request.user?.id ?? 'unknown';
          const result = await feedbackService.importFeedbackTypes(request.body, createdBy);
          return reply.send(result);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } })
            .status(500)
            .send({ error: { code: 'IMPORT_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: Global feedback config ———
    fastify.get(
      '/api/v1/admin/feedback-config',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get global feedback config. Super Admin.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          response: { 200: { type: 'object' }, 404: { type: 'object' } },
        },
      },
      async (_request, reply) => {
        try {
          const config = await feedbackService.getGlobalFeedbackConfig();
          if (!config) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Global feedback config not found' } });
          return reply.send(config);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'FEEDBACK_CONFIG_FAILED', message: msg } });
        }
      }
    );

    fastify.put<{
      Body: {
        defaultLimit?: number;
        minLimit?: number;
        maxLimit?: number;
        availableTypes?: string[];
        defaultActiveTypes?: string[];
        patternDetection?: {
          enabled?: boolean;
          minSampleSize?: number;
          thresholds?: { ignoreRate?: number; actionRate?: number; sentimentThreshold?: number };
          autoSuppressEnabled?: boolean;
          autoBoostEnabled?: boolean;
          notifyOnPattern?: boolean;
          patternReportFrequency?: 'daily' | 'weekly' | 'monthly';
        };
        feedbackCollection?: {
          requireFeedback?: boolean;
          requireFeedbackAfterDays?: number;
          allowComments?: boolean;
          maxCommentLength?: number;
          moderateComments?: boolean;
          allowMultipleSelection?: boolean;
          maxSelectionsPerFeedback?: number;
          allowFeedbackEdit?: boolean;
          editWindowDays?: number;
          trackFeedbackHistory?: boolean;
          allowAnonymousFeedback?: boolean;
          anonymousForNegative?: boolean;
        };
      };
    }>(
      '/api/v1/admin/feedback-config',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update global feedback config. Super Admin.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            properties: {
              defaultLimit: { type: 'number' },
              minLimit: { type: 'number' },
              maxLimit: { type: 'number' },
              availableTypes: { type: 'array', items: { type: 'string' } },
              defaultActiveTypes: { type: 'array', items: { type: 'string' } },
              patternDetection: {
                type: 'object',
                properties: {
                  enabled: { type: 'boolean' },
                  minSampleSize: { type: 'number' },
                  thresholds: {
                    type: 'object',
                    properties: {
                      ignoreRate: { type: 'number' },
                      actionRate: { type: 'number' },
                      sentimentThreshold: { type: 'number' },
                    },
                  },
                  autoSuppressEnabled: { type: 'boolean' },
                  autoBoostEnabled: { type: 'boolean' },
                  notifyOnPattern: { type: 'boolean' },
                  patternReportFrequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                },
              },
              feedbackCollection: {
                type: 'object',
                properties: {
                  requireFeedback: { type: 'boolean' },
                  requireFeedbackAfterDays: { type: 'number' },
                  allowComments: { type: 'boolean' },
                  maxCommentLength: { type: 'number' },
                  moderateComments: { type: 'boolean' },
                  allowMultipleSelection: { type: 'boolean' },
                  maxSelectionsPerFeedback: { type: 'number' },
                  allowFeedbackEdit: { type: 'boolean' },
                  editWindowDays: { type: 'number' },
                  trackFeedbackHistory: { type: 'boolean' },
                  allowAnonymousFeedback: { type: 'boolean' },
                  anonymousForNegative: { type: 'boolean' },
                },
              },
            },
          },
          response: {
            200: { type: 'object' },
            400: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
          },
        },
      },
      async (request, reply) => {
        try {
          const updatedBy = request.user?.id ?? 'unknown';
          const config = await feedbackService.updateGlobalFeedbackConfig(
            request.body as Parameters<typeof feedbackService.updateGlobalFeedbackConfig>[0],
            updatedBy
          );
          return reply.send(config);
        } catch (error: unknown) {
          const err = error as Error & { statusCode?: number };
          const msg = err.message ?? String(error);
          const code = err.statusCode === 400 ? 400 : 500;
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } })
            .status(code)
            .send({ error: { code: code === 400 ? 'VALIDATION_ERROR' : 'FEEDBACK_CONFIG_UPDATE_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: List tenants (Super Admin). Stub: returns empty list; real data from auth/tenant store when available. ———
    fastify.get(
      '/api/v1/admin/tenants',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List all tenants (Super Admin §7.1.1). Returns tenant id, name, industry, status, usage, configuration, and performance fields.',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string', nullable: true },
                      industry: { type: 'string', nullable: true },
                      status: { type: 'string', enum: ['active', 'trial', 'suspended', 'inactive'], nullable: true },
                      createdAt: { type: 'string', nullable: true },
                      activeUsers: { type: 'number', nullable: true },
                      activeOpportunities: { type: 'number', nullable: true },
                      predictionsPerDay: { type: 'number', nullable: true },
                      feedbackPerDay: { type: 'number', nullable: true },
                      methodology: { type: 'string', nullable: true },
                      feedbackLimit: { type: 'number', nullable: true },
                      customCatalogEntries: { type: 'number', nullable: true },
                      avgRecommendationAccuracy: { type: 'number', nullable: true },
                      avgActionRate: { type: 'number', nullable: true },
                    },
                    required: ['id'],
                  },
                },
              },
            },
          },
        },
      },
      async (_request, reply) => {
        try {
          return reply.send({ items: [] });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('List tenants failed', error as Error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANTS_LIST_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: Get tenant by id (Super Admin §7.1.2 Overview). Stub: returns tenant id and nulls; replace with tenant store when available. ———
    fastify.get<{ Params: { tenantId: string } }>(
      '/api/v1/admin/tenants/:tenantId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get a single tenant by id (Super Admin §7.1.2 Overview).',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { tenantId: { type: 'string' } }, required: ['tenantId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string', nullable: true },
                industry: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['active', 'trial', 'suspended', 'inactive'], nullable: true },
                createdAt: { type: 'string', nullable: true },
                activeUsers: { type: 'number', nullable: true },
                activeOpportunities: { type: 'number', nullable: true },
              },
              required: ['id'],
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.params.tenantId;
          const tenant = {
            id: tenantId,
            name: null as string | null,
            industry: null as string | null,
            status: null as string | null,
            createdAt: null as string | null,
            activeUsers: null as number | null,
            activeOpportunities: null as number | null,
          };
          return reply.send(tenant);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get tenant failed', error as Error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_GET_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: List tenant templates (Super Admin §7.2) ———
    fastify.get(
      '/api/v1/admin/tenant-templates',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List all tenant templates. Super Admin.',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      feedbackConfig: { type: 'object' },
                      methodology: { type: 'string' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      createdBy: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (_request, reply) => {
        try {
          const items = await tenantTemplateService.listTemplates();
          return reply.send({ items });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('List tenant templates failed', error as Error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_TEMPLATES_LIST_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: Create tenant template (Super Admin §7.2) ———
    fastify.post<{
      Body: {
        name: string;
        description?: string;
        feedbackConfig: {
          activeLimit: number;
          activeTypes: Array<{ feedbackTypeId: string; customLabel?: string; order: number }>;
          requireFeedback: boolean;
          allowComments: boolean;
          commentRequired: boolean;
          allowMultipleSelection: boolean;
          patternDetection: { enabled: boolean; autoSuppressEnabled: boolean; autoBoostEnabled: boolean };
        };
        methodology?: string;
        defaultLimits?: { maxUsers?: number; maxOpportunities?: number; maxPredictionsPerDay?: number; maxFeedbackPerDay?: number };
      };
    }>(
      '/api/v1/admin/tenant-templates',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create a tenant template. Super Admin.',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['name', 'feedbackConfig'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              feedbackConfig: {
                type: 'object',
                required: ['activeLimit', 'activeTypes', 'requireFeedback', 'allowComments', 'commentRequired', 'allowMultipleSelection', 'patternDetection'],
                properties: {
                  activeLimit: { type: 'number' },
                  activeTypes: { type: 'array', items: { type: 'object', properties: { feedbackTypeId: { type: 'string' }, customLabel: { type: 'string' }, order: { type: 'number' } } } },
                  requireFeedback: { type: 'boolean' },
                  allowComments: { type: 'boolean' },
                  commentRequired: { type: 'boolean' },
                  allowMultipleSelection: { type: 'boolean' },
                  patternDetection: {
                    type: 'object',
                    properties: { enabled: { type: 'boolean' }, autoSuppressEnabled: { type: 'boolean' }, autoBoostEnabled: { type: 'boolean' } },
                  },
                },
              },
              methodology: { type: 'string' },
              defaultLimits: {
                type: 'object',
                properties: { maxUsers: { type: 'number' }, maxOpportunities: { type: 'number' }, maxPredictionsPerDay: { type: 'number' }, maxFeedbackPerDay: { type: 'number' } },
              },
            },
          },
          response: { 201: { type: 'object' }, 400: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const createdBy = request.user?.id ?? 'unknown';
          const body = request.body;
          if (!body.name?.trim()) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
          }
          if (!body.feedbackConfig || typeof body.feedbackConfig.activeLimit !== 'number' || !Array.isArray(body.feedbackConfig.activeTypes)) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'feedbackConfig with activeLimit and activeTypes is required' } });
          }
          const template = await tenantTemplateService.createTemplate(
            {
              name: body.name.trim(),
              description: body.description?.trim(),
              feedbackConfig: {
                activeLimit: body.feedbackConfig.activeLimit,
                activeTypes: body.feedbackConfig.activeTypes,
                requireFeedback: body.feedbackConfig.requireFeedback ?? false,
                allowComments: body.feedbackConfig.allowComments ?? true,
                commentRequired: body.feedbackConfig.commentRequired ?? false,
                allowMultipleSelection: body.feedbackConfig.allowMultipleSelection ?? false,
                patternDetection: {
                  enabled: body.feedbackConfig.patternDetection?.enabled ?? true,
                  autoSuppressEnabled: body.feedbackConfig.patternDetection?.autoSuppressEnabled ?? true,
                  autoBoostEnabled: body.feedbackConfig.patternDetection?.autoBoostEnabled ?? true,
                },
              },
              methodology: body.methodology?.trim(),
              defaultLimits: body.defaultLimits,
            },
            createdBy
          );
          return reply.status(201).send(template);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Create tenant template failed', error as Error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_TEMPLATE_CREATE_FAILED', message: msg } });
        }
      }
    );

    fastify.get<{ Params: { templateId: string } }>(
      '/api/v1/admin/tenant-templates/:templateId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get a tenant template by ID. Super Admin.',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] },
          response: { 200: { type: 'object' }, 404: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { templateId } = request.params;
          const template = await tenantTemplateService.getTemplate(templateId);
          if (!template) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
          return reply.send(template);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_TEMPLATE_GET_FAILED', message: msg } });
        }
      }
    );

    fastify.put<{
      Params: { templateId: string };
      Body: {
        name?: string;
        description?: string;
        feedbackConfig?: {
          activeLimit?: number;
          activeTypes?: Array<{ feedbackTypeId: string; customLabel?: string; order: number }>;
          requireFeedback?: boolean;
          allowComments?: boolean;
          commentRequired?: boolean;
          allowMultipleSelection?: boolean;
          patternDetection?: { enabled?: boolean; autoSuppressEnabled?: boolean; autoBoostEnabled?: boolean };
        };
        methodology?: string;
        defaultLimits?: { maxUsers?: number; maxOpportunities?: number; maxPredictionsPerDay?: number; maxFeedbackPerDay?: number };
      };
    }>(
      '/api/v1/admin/tenant-templates/:templateId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update a tenant template. Super Admin.',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] },
          body: { type: 'object' },
          response: { 200: { type: 'object' }, 404: { type: 'object' }, 500: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { templateId } = request.params;
          const updatedBy = request.user?.id ?? 'unknown';
          const body = request.body;
          const updates: Partial<{ name: string; description: string; feedbackConfig: import('../types/feedback.types').TenantTemplateFeedbackSnapshot; methodology: string; defaultLimits: Record<string, number> }> = {};
          if (body.name !== undefined) updates.name = body.name.trim();
          if (body.description !== undefined) updates.description = body.description?.trim();
          if (body.methodology !== undefined) updates.methodology = body.methodology?.trim();
          if (body.defaultLimits !== undefined) updates.defaultLimits = body.defaultLimits;
          if (body.feedbackConfig) {
            const existing = await tenantTemplateService.getTemplate(templateId);
            const fc = existing?.feedbackConfig ?? {
              activeLimit: 5,
              activeTypes: [],
              requireFeedback: false,
              allowComments: true,
              commentRequired: false,
              allowMultipleSelection: false,
              patternDetection: { enabled: true, autoSuppressEnabled: true, autoBoostEnabled: true },
            };
            updates.feedbackConfig = {
              activeLimit: body.feedbackConfig.activeLimit ?? fc.activeLimit,
              activeTypes: body.feedbackConfig.activeTypes ?? fc.activeTypes,
              requireFeedback: body.feedbackConfig.requireFeedback ?? fc.requireFeedback,
              allowComments: body.feedbackConfig.allowComments ?? fc.allowComments,
              commentRequired: body.feedbackConfig.commentRequired ?? fc.commentRequired,
              allowMultipleSelection: body.feedbackConfig.allowMultipleSelection ?? fc.allowMultipleSelection,
              patternDetection: {
                enabled: body.feedbackConfig.patternDetection?.enabled ?? fc.patternDetection?.enabled ?? true,
                autoSuppressEnabled: body.feedbackConfig.patternDetection?.autoSuppressEnabled ?? fc.patternDetection?.autoSuppressEnabled ?? true,
                autoBoostEnabled: body.feedbackConfig.patternDetection?.autoBoostEnabled ?? fc.patternDetection?.autoBoostEnabled ?? true,
              },
            };
          }
          const template = await tenantTemplateService.updateTemplate(templateId, updates, updatedBy);
          if (!template) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
          return reply.send(template);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_TEMPLATE_UPDATE_FAILED', message: msg } });
        }
      }
    );

    fastify.delete<{ Params: { templateId: string } }>(
      '/api/v1/admin/tenant-templates/:templateId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete a tenant template. Super Admin.',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] },
          response: { 204: { type: 'null' }, 404: { type: 'object' }, 500: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { templateId } = request.params;
          const deleted = await tenantTemplateService.deleteTemplate(templateId);
          if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
          return reply.status(204).send();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_TEMPLATE_DELETE_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: Apply tenant template (Super Admin §7.2) ———
    fastify.post<{
      Params: { templateId: string };
      Body: { tenantIds: string[] };
    }>(
      '/api/v1/admin/tenant-templates/:templateId/apply',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Apply a tenant template to one or more tenants. Super Admin.',
          tags: ['Admin', 'Tenants'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] },
          body: {
            type: 'object',
            required: ['tenantIds'],
            properties: { tenantIds: { type: 'array', items: { type: 'string' } } },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                applied: { type: 'array', items: { type: 'string' } },
                failed: { type: 'array', items: { type: 'object', properties: { tenantId: { type: 'string' }, error: { type: 'string' } } } },
              },
            },
            404: { type: 'object' },
          },
        },
      },
      async (request, reply) => {
        try {
          const { templateId } = request.params;
          const { tenantIds } = request.body;
          if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'tenantIds must be a non-empty array' } });
          }
          const appliedBy = request.user?.id ?? 'unknown';
          const result = await tenantTemplateService.applyTemplate(templateId, tenantIds, appliedBy);
          return reply.send(result);
        } catch (error: unknown) {
          const err = error as Error & { message?: string };
          if (err.message === 'Template not found') {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
          }
          const msg = err instanceof Error ? err.message : String(error);
          log.error('Apply tenant template failed', error as Error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_TEMPLATE_APPLY_FAILED', message: msg } });
        }
      }
    );

    // ——— Admin: Tenant feedback config ———
    fastify.get<{ Params: { tenantId: string } }>(
      '/api/v1/admin/tenants/:tenantId/feedback-config',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get tenant feedback config. Super Admin.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { tenantId: { type: 'string' } }, required: ['tenantId'] },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const config = await feedbackService.getTenantFeedbackConfig(request.params.tenantId);
          return reply.send(config);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_FEEDBACK_CONFIG_FAILED', message: msg } });
        }
      }
    );

    fastify.put<{
      Params: { tenantId: string };
      Body: Partial<{ activeLimit: number; activeTypes: Array<{ feedbackTypeId: string; customLabel?: string; order: number }>; requireFeedback: boolean; allowComments: boolean }>;
    }>(
      '/api/v1/admin/tenants/:tenantId/feedback-config',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update tenant feedback config. Super Admin.',
          tags: ['Admin', 'Feedback'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { tenantId: { type: 'string' } }, required: ['tenantId'] },
          body: { type: 'object' },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const updatedBy = request.user?.id ?? 'unknown';
          const config = await feedbackService.updateTenantFeedbackConfig(request.params.tenantId, request.body, updatedBy);
          return reply.send(config);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'TENANT_FEEDBACK_CONFIG_UPDATE_FAILED', message: msg } });
        }
      }
    );

    // ——— Tenant: Get own feedback config (for UI) ———
    fastify.get(
      '/api/v1/feedback/config',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get tenant feedback config for current tenant (for UI).',
          tags: ['Feedback'],
          security: [{ bearerAuth: [] }],
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const config = await feedbackService.getTenantFeedbackConfig(tenantId);
          return reply.send(config);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'FEEDBACK_CONFIG_FAILED', message: msg } });
        }
      }
    );

    // ——— Tenant: Get feedback aggregation ———
    fastify.get<{ Querystring: { period?: string; recType?: string } }>(
      '/api/v1/feedback/aggregation',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get feedback aggregation for tenant (by period, optional recType).',
          tags: ['Feedback'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            properties: { period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] }, recType: { type: 'string' } },
          },
          response: { 200: { type: 'object' }, 404: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const period = (request.query.period as 'daily' | 'weekly' | 'monthly') ?? 'monthly';
          const agg = await feedbackService.getAggregation(tenantId, { period, recType: request.query.recType });
          if (!agg) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Aggregation not found' } });
          return reply.send(agg);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(500).send({ error: { code: 'FEEDBACK_AGGREGATION_FAILED', message: msg } });
        }
      }
    );

    // Get recommendations for opportunity
    fastify.get<{ Querystring: { opportunityId?: string; userId?: string; limit?: number } }>(
      '/api/v1/recommendations',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get recommendations for opportunity or user',
          tags: ['Recommendations'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            properties: {
              opportunityId: { type: 'string' },
              userId: { type: 'string' },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId, userId, limit } = request.query;
          const tenantId = request.user!.tenantId;

          const batch = await recommendationsService.generateRecommendations({
            opportunityId,
            userId: userId || request.user!.id,
            tenantId,
            limit,
          });

          return reply.send(batch);
        } catch (error: any) {
          log.error('Failed to get recommendations', error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(error.statusCode || 500).send({
            error: {
              code: 'RECOMMENDATION_GENERATION_FAILED',
              message: error.message || 'Failed to generate recommendations',
            },
          });
        }
      }
    );

    // Get recommendation by ID
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/recommendations/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get recommendation by ID',
          tags: ['Recommendations'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;

          const container = getContainer('recommendation_recommendations');
          const { resource } = await container.item(id, tenantId).read();

          if (!resource) {
            return reply.status(404).send({
              error: {
                code: 'RECOMMENDATION_NOT_FOUND',
                message: 'Recommendation not found',
              },
            });
          }

          return reply.send(resource);
        } catch (error: any) {
          log.error('Failed to get recommendation', error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(error.statusCode || 500).send({
            error: {
              code: 'RECOMMENDATION_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve recommendation',
            },
          });
        }
      }
    );

    // Submit feedback on recommendation (FR-1.4: feedbackTypeId + optional metadata)
    fastify.post<{
      Params: { id: string };
      Body: {
        action: FeedbackAction;
        comment?: string;
        feedbackTypeId?: string;
        metadata?: {
          recommendation?: { type?: string; source?: string; confidence?: number; text?: string };
          opportunity?: { id?: string; stage?: string; amount?: number; probability?: number; industry?: string; daysToClose?: number };
          user?: { role?: string; teamId?: string; historicalActionRate?: number };
          timing?: { recommendationGeneratedAt?: string; recommendationShownAt?: string; timeToFeedbackMs?: number; timeVisibleMs?: number };
          display?: { location?: string; position?: number; deviceType?: string };
          secondaryTypes?: string[];
        };
      };
    }>(
      '/api/v1/recommendations/:id/feedback',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Submit feedback on recommendation (accept/ignore/irrelevant or feedbackTypeId). Full metadata optional (FR-1.4).',
          tags: ['Feedback'],
          security: [{ bearerAuth: [] }],
          params: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
          },
          body: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['accept', 'ignore', 'irrelevant'] },
              comment: { type: 'string' },
              feedbackTypeId: { type: 'string' },
              metadata: { type: 'object' },
            },
            required: ['action'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const { action, comment, feedbackTypeId, metadata } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const record = await recommendationsService.recordFeedback({
            recommendationId: id,
            action,
            userId,
            tenantId,
            comment,
            feedbackTypeId,
            metadata,
            timestamp: new Date(),
          });

          return reply.status(200).send({
            message: 'Feedback received',
            recommendationId: id,
            action,
            feedbackId: record.id,
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to record feedback', error as Error, { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(statusCode).send({
            error: {
              code: 'FEEDBACK_RECORDING_FAILED',
              message: msg || 'Failed to record feedback',
            },
          });
        }
      }
    );

    // ——— Mitigation actions (Plan §428, §927) ———
    // GET /api/v1/opportunities/:id/mitigation-actions
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/opportunities/:id/mitigation-actions',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get ranked mitigation actions for an opportunity (Plan §428, §927). Uses MitigationRankingService.rankMitigationActions.',
          tags: ['Mitigation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: {
            200: {
              type: 'object',
              properties: {
                opportunityId: { type: 'string' },
                tenantId: { type: 'string' },
                actions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      actionId: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      rank: { type: 'number' },
                      estimatedImpact: { type: 'string', enum: ['high', 'medium', 'low'] },
                      estimatedEffort: { type: 'string', enum: ['low', 'medium', 'high'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const result = await rankMitigationActions(id, tenantId);
          return reply.send(result);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get mitigation actions failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(statusCode).send({ error: { code: 'MITIGATION_ACTIONS_FAILED', message: msg } });
        }
      }
    );

    // ——— Remediation workflows (Plan §927–929) ———
    // POST /api/v1/remediation-workflows
    fastify.post<{ Body: { opportunityId: string; riskId?: string; assignedTo?: string; steps: { actionId: string; description: string; estimatedEffort?: string }[] } }>(
      '/api/v1/remediation-workflows',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create a remediation workflow (Plan §927–929)',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['opportunityId', 'steps'],
            properties: {
              opportunityId: { type: 'string' },
              riskId: { type: 'string' },
              assignedTo: { type: 'string' },
              steps: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  required: ['actionId', 'description'],
                  properties: {
                    actionId: { type: 'string' },
                    description: { type: 'string' },
                    estimatedEffort: { type: 'string' },
                  },
                },
              },
            },
          },
          response: { 201: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const w = await createWorkflow(tenantId, request.body);
          return reply.status(201).send(w);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Create remediation workflow failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_CREATE_FAILED', message: msg } });
        }
      }
    );

    // GET /api/v1/remediation-workflows?opportunityId=
    fastify.get<{ Querystring: { opportunityId?: string } }>(
      '/api/v1/remediation-workflows',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List remediation workflows, optionally by opportunityId (Plan §928)',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          querystring: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: { 200: { type: 'object', properties: { workflows: { type: 'array' } } } },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.query;
          const tenantId = request.user!.tenantId;
          if (!opportunityId) {
            return reply.status(400).send({ error: { code: 'MISSING_OPPORTUNITY_ID', message: 'opportunityId is required' } });
          }
          const workflows = await getWorkflowsByOpportunity(opportunityId, tenantId);
          return reply.send({ workflows });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('List remediation workflows failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_LIST_FAILED', message: msg } });
        }
      }
    );

    // GET /api/v1/remediation-workflows/:id
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/remediation-workflows/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get a remediation workflow by ID (Plan §928)',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const w = await getWorkflow(id, tenantId);
          if (!w) return reply.status(404).send({ error: { code: 'REMEDIATION_WORKFLOW_NOT_FOUND', message: 'Remediation workflow not found' } });
          return reply.send(w);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get remediation workflow failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_GET_FAILED', message: msg } });
        }
      }
    );

    const completeStepSchema = {
      description: 'Complete a remediation workflow step (Plan §928, §4.4). Publishes remediation.step.completed or remediation.workflow.completed when all done. PUT is per Plan §4.4; POST remains supported.',
      tags: ['Remediation'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' }, stepNumber: { type: 'string' } }, required: ['id', 'stepNumber'] },
      body: { type: 'object', properties: { completedBy: { type: 'string' } } },
      response: { 200: { type: 'object' } },
    };

    const handleCompleteStep = async (
      request: { params: { id: string; stepNumber: string }; body?: { completedBy?: string }; user?: { tenantId: string; id: string } },
      reply: { status: (code: number) => { send: (body: unknown) => unknown } }
    ) => {
      try {
        const { id, stepNumber } = request.params;
        const stepNum = parseInt(stepNumber, 10);
        if (Number.isNaN(stepNum) || stepNum < 1) {
          return reply.status(400).send({ error: { code: 'INVALID_STEP_NUMBER', message: 'stepNumber must be a positive integer' } });
        }
        const tenantId = request.user!.tenantId;
        const completedBy = request.body?.completedBy ?? request.user!.id;
        const w = await completeStep(id, stepNum, tenantId, completedBy);
        return reply.status(200).send(w);
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
        const msg = error instanceof Error ? error.message : String(error);
        log.error('Complete remediation step failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
        return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(statusCode).send({ error: { code: 'REMEDIATION_STEP_COMPLETE_FAILED', message: msg } });
      }
    };

    // POST /api/v1/remediation-workflows/:id/steps/:stepNumber/complete
    fastify.post<{ Params: { id: string; stepNumber: string }; Body: { completedBy?: string } }>(
      '/api/v1/remediation-workflows/:id/steps/:stepNumber/complete',
      { preHandler: [authenticateRequest(), tenantEnforcementMiddleware()], schema: completeStepSchema },
      handleCompleteStep as any
    );

    // PUT /api/v1/remediation-workflows/:id/steps/:stepNumber/complete (Plan §4.4; POST also supported)
    fastify.put<{ Params: { id: string; stepNumber: string }; Body: { completedBy?: string } }>(
      '/api/v1/remediation-workflows/:id/steps/:stepNumber/complete',
      { preHandler: [authenticateRequest(), tenantEnforcementMiddleware()], schema: completeStepSchema },
      handleCompleteStep as any
    );

    // PUT /api/v1/remediation-workflows/:id/cancel (Plan §928, §435)
    fastify.put<{ Params: { id: string } }>(
      '/api/v1/remediation-workflows/:id/cancel',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Cancel a remediation workflow (Plan §928, §435). Sets status to cancelled. No-op if already cancelled.',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const w = await cancelWorkflow(id, tenantId);
          return reply.send(w);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Cancel remediation workflow failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return (reply as { status: (code: number) => { send: (body: unknown) => unknown } }).status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_CANCEL_FAILED', message: msg } });
        }
      }
    );

    log.info('Recommendations routes registered', { service: 'recommendations' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'recommendations' });
    throw error;
  }
}
