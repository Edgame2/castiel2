/**
 * Admin Dashboard API Routes
 *
 * Provides REST endpoints for admin dashboard operations:
 * - Provider management
 * - Fallback chain configuration
 * - Provider health monitoring
 * - Usage analytics
 * - Quota management
 * - Tenant configuration
 *
 * @author AI Insights Team
 * @version 1.0.0
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { AdminDashboardService } from '../services/admin-dashboard.service.js';

/**
 * Validation schemas
 */
const UpdateProviderSchema = z.object({
    enabled: z.boolean().optional(),
    priority: z.number().int().min(1).max(10).optional(),
    config: z.record(z.any()).optional(),
    budget: z.record(z.any()).optional(),
});

const UpdateFallbackChainSchema = z.object({
    providers: z.array(z.object({
        providerId: z.string(),
        priority: z.number().int(),
        enabled: z.boolean(),
    })).optional(),
    smartRouting: z.object({
        enabled: z.boolean(),
        rules: z.array(z.object({
            type: z.string(),
            preferredProvider: z.string(),
        })),
    }).optional(),
    failover: z.object({
        maxRetries: z.number().int(),
        initialDelay: z.number().int(),
        maxDelay: z.number().int(),
        backoffMultiplier: z.number(),
    }).optional(),
});

const UpdateQuotaSchema = z.object({
    monthlySearchQuota: z.number().int().positive().optional(),
    monthlyBudget: z.number().positive().optional(),
    alerts: z.array(z.object({
        id: z.string(),
        type: z.enum(['quota', 'budget']),
        threshold: z.number(),
        triggered: z.boolean(),
    })).optional(),
});

const UpdateTenantConfigSchema = z.object({
    enabled: z.boolean().optional(),
    autoTriggerEnabled: z.boolean().optional(),
    autoTriggerKeywords: z.array(z.string()).optional(),
    domainWhitelist: z.array(z.string()).optional(),
    domainBlacklist: z.array(z.string()).optional(),
    deepSearchEnabled: z.boolean().optional(),
    deepSearchPageDepth: z.number().int().min(1).max(10).optional(),
    defaultSearchProvider: z.string().optional(),
});

/**
 * Register admin dashboard routes
 */
export async function adminDashboardRoutes(
    fastify: FastifyInstance,
    options: {
        monitoring: IMonitoringProvider;
    }
) {
    const service = new AdminDashboardService(options.monitoring);

    // ============================================
    // PROVIDER MANAGEMENT
    // ============================================

    /**
     * GET /admin/web-search/providers
     * List all search providers
     */
    fastify.get<{
        Querystring: {
            enabled?: string;
        };
    }>(
        '/admin/web-search/providers',
        {
            schema: {
                description: 'List all search providers',
                tags: ['admin-web-search'],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            providers: {
                                type: 'array',
                            },
                        },
                    },
                },
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const providers = await service.getProviders();

                // Filter by enabled status if specified
                const { enabled } = request.query as { enabled?: string };
                const filtered = enabled === undefined
                    ? providers
                    : providers.filter((p) => (enabled === 'true' ? p.enabled : !p.enabled));

                return reply.code(200).send({ providers: filtered });
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.providers.list',
                });
                return reply.code(500).send({
                    error: 'Failed to list providers',
                    message: (error as Error).message,
                });
            }
        }
    );

    /**
     * GET /admin/web-search/providers/:providerId
     * Get specific provider details
     */
    fastify.get<{
        Params: {
            providerId: string;
        };
    }>(
        '/admin/web-search/providers/:providerId',
        {
            schema: {
                description: 'Get specific provider',
                tags: ['admin-web-search'],
            },
        },
        async (request: FastifyRequest<{ Params: { providerId: string } }>, reply: FastifyReply) => {
            try {
                const { providerId } = request.params;
                const provider = await service.getProvider(providerId);

                if (!provider) {
                    return reply.code(404).send({
                        error: 'Provider not found',
                        providerId,
                    });
                }

                return reply.code(200).send(provider);
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.provider.get',
                });
                return reply.code(500).send({
                    error: 'Failed to get provider',
                    message: (error as Error).message,
                });
            }
        }
    );

    /**
     * PATCH /admin/web-search/providers/:providerId
     * Update provider configuration
     */
    fastify.patch<{
        Params: {
            providerId: string;
        };
        Body: unknown;
    }>(
        '/admin/web-search/providers/:providerId',
        {
            schema: {
                description: 'Update provider configuration',
                tags: ['admin-web-search'],
            },
        },
        async (request: FastifyRequest<{ Params: { providerId: string } }>, reply: FastifyReply) => {
            try {
                const { providerId } = request.params;
                const updates = UpdateProviderSchema.parse(request.body);

                const updated = await service.updateProvider(providerId, updates as any);

                if (!updated) {
                    return reply.code(404).send({
                        error: 'Provider not found',
                        providerId,
                    });
                }

                return reply.code(200).send({
                    success: true,
                    provider: updated,
                });
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return reply.code(400).send({
                        error: 'Validation error',
                        details: error.errors,
                    });
                }

                options.monitoring.trackException(error as Error, {
                    operation: 'admin.provider.update',
                });
                return reply.code(500).send({
                    error: 'Failed to update provider',
                    message: (error as Error).message,
                });
            }
        }
    );

    /**
     * POST /admin/web-search/providers/:providerId/test
     * Test provider connectivity
     */
    fastify.post<{
        Params: {
            providerId: string;
        };
    }>(
        '/admin/web-search/providers/:providerId/test',
        {
            schema: {
                description: 'Test provider connectivity',
                tags: ['admin-web-search'],
            },
        },
        async (request: FastifyRequest<{ Params: { providerId: string } }>, reply: FastifyReply) => {
            try {
                const { providerId } = request.params;
                const result = await service.testProvider(providerId);

                return reply.code(200).send(result);
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.provider.test',
                });
                return reply.code(500).send({
                    error: 'Failed to test provider',
                    message: (error as Error).message,
                });
            }
        }
    );

    // ============================================
    // FALLBACK CHAIN MANAGEMENT
    // ============================================

    /**
     * GET /admin/web-search/fallback-chain
     * Get fallback chain configuration
     */
    fastify.get(
        '/admin/web-search/fallback-chain',
        {
            schema: {
                description: 'Get fallback chain configuration',
                tags: ['admin-web-search'],
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const chain = await service.getFallbackChain('default-chain');

                if (!chain) {
                    return reply.code(404).send({
                        error: 'Fallback chain not found',
                    });
                }

                return reply.code(200).send(chain);
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.fallbackChain.get',
                });
                return reply.code(500).send({
                    error: 'Failed to get fallback chain',
                    message: (error as Error).message,
                });
            }
        }
    );

    /**
     * PUT /admin/web-search/fallback-chain
     * Update fallback chain configuration
     */
    fastify.put<{
        Body: unknown;
    }>(
        '/admin/web-search/fallback-chain',
        {
            schema: {
                description: 'Update fallback chain configuration',
                tags: ['admin-web-search'],
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const updates = UpdateFallbackChainSchema.parse(request.body);

                const updated = await service.updateFallbackChain('default-chain', updates as any);

                if (!updated) {
                    return reply.code(404).send({
                        error: 'Fallback chain not found',
                    });
                }

                return reply.code(200).send({
                    success: true,
                    chain: updated,
                });
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return reply.code(400).send({
                        error: 'Validation error',
                        details: error.errors,
                    });
                }

                options.monitoring.trackException(error as Error, {
                    operation: 'admin.fallbackChain.update',
                });
                return reply.code(500).send({
                    error: 'Failed to update fallback chain',
                    message: (error as Error).message,
                });
            }
        }
    );

    // ============================================
    // PROVIDER HEALTH MONITORING
    // ============================================

    /**
     * GET /admin/web-search/health
     * Get provider health status
     */
    fastify.get<{
        Querystring: {
            providerId?: string;
        };
    }>(
        '/admin/web-search/health',
        {
            schema: {
                description: 'Get provider health status',
                tags: ['admin-web-search'],
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { providerId } = request.query as { providerId?: string };
                const health = await service.getProviderHealth(providerId);

                return reply.code(200).send(
                    Array.isArray(health)
                        ? { providers: health }
                        : { provider: health }
                );
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.health.get',
                });
                return reply.code(500).send({
                    error: 'Failed to get health status',
                    message: (error as Error).message,
                });
            }
        }
    );

    // ============================================
    // USAGE ANALYTICS
    // ============================================

    /**
     * GET /admin/web-search/usage
     * Get usage statistics and cost analytics
     */
    fastify.get<{
        Querystring: {
            days?: string;
            tenantId?: string;
        };
    }>(
        '/admin/web-search/usage',
        {
            schema: {
                description: 'Get usage statistics and cost analytics',
                tags: ['admin-web-search'],
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { days = '30', tenantId } = request.query as { days?: string; tenantId?: string };
                const usage = await service.getUsageAnalytics(
                    parseInt(days, 10) || 30,
                    tenantId
                );

                return reply.code(200).send(usage);
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.usage.get',
                });
                return reply.code(500).send({
                    error: 'Failed to get usage analytics',
                    message: (error as Error).message,
                });
            }
        }
    );

    // ============================================
    // QUOTA MANAGEMENT
    // ============================================

    /**
     * GET /admin/quota/:tenantId
     * Get tenant quota configuration
     */
    fastify.get<{
        Params: {
            tenantId: string;
        };
    }>(
        '/admin/quota/:tenantId',
        {
            schema: {
                description: 'Get tenant quota configuration',
                tags: ['admin-quota'],
            },
        },
        async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
            try {
                const { tenantId } = request.params;
                const quota = await service.getQuotaConfig(tenantId);

                if (!quota) {
                    return reply.code(404).send({
                        error: 'Quota configuration not found',
                        tenantId,
                    });
                }

                return reply.code(200).send(quota);
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.quota.get',
                });
                return reply.code(500).send({
                    error: 'Failed to get quota configuration',
                    message: (error as Error).message,
                });
            }
        }
    );

    /**
     * PUT /admin/quota/:tenantId
     * Update tenant quota configuration
     */
    fastify.put<{
        Params: {
            tenantId: string;
        };
        Body: unknown;
    }>(
        '/admin/quota/:tenantId',
        {
            schema: {
                description: 'Update tenant quota configuration',
                tags: ['admin-quota'],
            },
        },
        async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
            try {
                const { tenantId } = request.params;
                const updates = UpdateQuotaSchema.parse(request.body);

                const updated = await service.updateQuotaConfig(tenantId, updates as any);

                return reply.code(200).send({
                    success: true,
                    quota: updated,
                });
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return reply.code(400).send({
                        error: 'Validation error',
                        details: error.errors,
                    });
                }

                options.monitoring.trackException(error as Error, {
                    operation: 'admin.quota.update',
                });
                return reply.code(500).send({
                    error: 'Failed to update quota configuration',
                    message: (error as Error).message,
                });
            }
        }
    );

    // ============================================
    // TENANT CONFIGURATION
    // ============================================

    /**
     * GET /admin/tenant-config/:tenantId/web-search
     * Get tenant web search configuration
     */
    fastify.get<{
        Params: {
            tenantId: string;
        };
    }>(
        '/admin/tenant-config/:tenantId/web-search',
        {
            schema: {
                description: 'Get tenant web search configuration',
                tags: ['admin-tenant-config'],
            },
        },
        async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
            try {
                const { tenantId } = request.params;
                const config = await service.getTenantWebSearchConfig(tenantId);

                if (!config) {
                    return reply.code(404).send({
                        error: 'Tenant configuration not found',
                        tenantId,
                    });
                }

                return reply.code(200).send(config);
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.tenantConfig.get',
                });
                return reply.code(500).send({
                    error: 'Failed to get tenant configuration',
                    message: (error as Error).message,
                });
            }
        }
    );

    /**
     * PUT /admin/tenant-config/:tenantId/web-search
     * Update tenant web search configuration
     */
    fastify.put<{
        Params: {
            tenantId: string;
        };
        Body: unknown;
    }>(
        '/admin/tenant-config/:tenantId/web-search',
        {
            schema: {
                description: 'Update tenant web search configuration',
                tags: ['admin-tenant-config'],
            },
        },
        async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
            try {
                const { tenantId } = request.params;
                const updates = UpdateTenantConfigSchema.parse(request.body);

                const updated = await service.updateTenantWebSearchConfig(tenantId, updates as any);

                return reply.code(200).send({
                    success: true,
                    config: updated,
                });
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return reply.code(400).send({
                        error: 'Validation error',
                        details: error.errors,
                    });
                }

                options.monitoring.trackException(error as Error, {
                    operation: 'admin.tenantConfig.update',
                });
                return reply.code(500).send({
                    error: 'Failed to update tenant configuration',
                    message: (error as Error).message,
                });
            }
        }
    );

    // ============================================
    // PLATFORM STATISTICS
    // ============================================

    /**
     * GET /admin/stats
     * Get platform statistics
     */
    fastify.get(
        '/admin/stats',
        {
            schema: {
                description: 'Get platform statistics',
                tags: ['admin-stats'],
            },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const stats = await service.getPlatformStats();
                return reply.code(200).send(stats);
            } catch (error) {
                options.monitoring.trackException(error as Error, {
                    operation: 'admin.stats.get',
                });
                return reply.code(500).send({
                    error: 'Failed to get platform statistics',
                    message: (error as Error).message,
                });
            }
        }
    );
}
