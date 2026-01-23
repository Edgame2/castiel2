/**
 * AI Settings API Routes
 * Super Admin routes for managing AI models and system configuration
 * Tenant Admin routes for tenant-specific AI settings
 */
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
// In-memory storage for system config (in production, use database)
let systemAIConfig = {
    defaultLLMModelId: undefined,
    defaultEmbeddingModelId: undefined,
    defaultImageModelId: undefined,
    allowTenantModels: true,
    maxTokensPerRequest: 4000,
    maxRequestsPerMinute: 60,
    enabledProviders: ['OpenAI', 'Azure OpenAI', 'Anthropic', 'Google', 'Cohere', 'Mistral'],
};
// Tenant configs cache (in production, store in database)
const tenantConfigs = new Map();
/**
 * Register AI Settings routes
 */
export async function aiSettingsRoutes(fastify, options) {
    const { monitoring, shardRepository, shardTypeRepository } = options;
    // ============================================
    // Super Admin: AI Models Management
    // ============================================
    // REMOVED: All Shards-based AI model routes (GET/POST/PATCH/DELETE /admin/ai/models)
    // AI model management now handled exclusively by ai-models.routes.ts
    // which uses the dedicated 'aimodel' container with /provider partition key
    // ============================================
    // Super Admin: System Configuration
    // ============================================
    /**
     * Get system AI configuration
     * GET /admin/ai/config
     */
    fastify.get('/admin/ai/config', {
        schema: {
            description: 'Get system AI configuration (Super Admin)',
            tags: ['ai-admin'],
        },
    }, async (request, reply) => {
        // Use AIConfigService if available, otherwise fall back to in-memory
        if (fastify.aiConfigService) {
            const config = await fastify.aiConfigService.getSystemConfig();
            // Transform to frontend format
            return {
                defaultLLMModelId: config.defaultModel,
                defaultEmbeddingModelId: config.defaultEmbeddingModel,
                defaultImageModelId: undefined, // Not in backend config yet
                allowTenantModels: config.features.allowTenantModelSelection,
                maxTokensPerRequest: config.costControls.maxTokensPerRequest,
                maxRequestsPerMinute: config.globalRateLimits.requestsPerMinute,
                enabledProviders: config.allowedProviders,
                modelSelection: config.modelSelection, // Include model selection config
                updatedAt: config.updatedAt.toISOString(),
                updatedBy: config.updatedBy,
            };
        }
        // Fallback to in-memory storage
        return {
            ...systemAIConfig,
            updatedAt: new Date().toISOString(),
        };
    });
    /**
     * Update system AI configuration
     * PATCH /admin/ai/config
     */
    fastify.patch('/admin/ai/config', {
        schema: {
            description: 'Update system AI configuration (Super Admin)',
            tags: ['ai-admin'],
        },
    }, async (request, reply) => {
        const updates = request.body;
        const userId = request.user.id;
        // Use AIConfigService if available
        if (fastify.aiConfigService) {
            // Transform frontend format to backend format
            const backendUpdates = {
                defaultModel: updates.defaultLLMModelId,
                defaultEmbeddingModel: updates.defaultEmbeddingModelId,
                allowedProviders: updates.enabledProviders,
                globalRateLimits: updates.maxRequestsPerMinute ? {
                    requestsPerMinute: updates.maxRequestsPerMinute,
                    tokensPerMinute: undefined, // Keep existing if not provided
                } : undefined,
                costControls: updates.maxTokensPerRequest ? {
                    maxTokensPerRequest: updates.maxTokensPerRequest,
                    maxDailyCostPerTenant: undefined, // Keep existing if not provided
                    maxMonthlyCostPerTenant: undefined, // Keep existing if not provided
                } : undefined,
                features: updates.allowTenantModels !== undefined ? {
                    allowTenantModelSelection: updates.allowTenantModels,
                    allowTenantBYOK: undefined, // Keep existing if not provided
                    enableUsageTracking: undefined, // Keep existing if not provided
                    enableCostAllocation: undefined, // Keep existing if not provided
                } : undefined,
                modelSelection: updates.modelSelection, // Pass through model selection config
            };
            const updated = await fastify.aiConfigService.updateSystemConfig(backendUpdates, userId);
            monitoring.trackEvent('ai-config.updated', { updatedBy: userId });
            // Transform back to frontend format
            return {
                defaultLLMModelId: updated.defaultModel,
                defaultEmbeddingModelId: updated.defaultEmbeddingModel,
                defaultImageModelId: undefined,
                allowTenantModels: updated.features.allowTenantModelSelection,
                maxTokensPerRequest: updated.costControls.maxTokensPerRequest,
                maxRequestsPerMinute: updated.globalRateLimits.requestsPerMinute,
                enabledProviders: updated.allowedProviders,
                modelSelection: updated.modelSelection, // Include model selection config
                updatedAt: updated.updatedAt.toISOString(),
                updatedBy: updated.updatedBy,
            };
        }
        // Fallback to in-memory storage
        systemAIConfig = {
            ...systemAIConfig,
            ...updates,
        };
        monitoring.trackEvent('ai-config.updated', { updatedBy: userId });
        return {
            ...systemAIConfig,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
        };
    });
    // ============================================
    // Super Admin: Usage Statistics
    // ============================================
    /**
     * Get AI usage statistics
     * GET /admin/ai/usage
     */
    fastify.get('/admin/ai/usage', {
        schema: {
            description: 'Get AI usage statistics (Super Admin)',
            tags: ['ai-admin'],
        },
    }, async (request, reply) => {
        const { period = 'month' } = request.query;
        // Return mock data for now (in production, query actual usage)
        return {
            period,
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            byModel: [],
            byTenant: [],
        };
    });
    // ============================================
    // Tenant Admin: Usage & Billing
    // ============================================
    /**
     * Get billing summary for current tenant
     * GET /tenant/ai/billing
     */
    fastify.get('/tenant/ai/billing', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get billing summary for current tenant',
            tags: ['ai-tenant'],
            querystring: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const aiConfigService = fastify.aiConfigService;
        if (!aiConfigService) {
            return reply.status(503).send({ error: 'Billing service not available' });
        }
        try {
            const { startDate, endDate } = request.query;
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
            const end = endDate ? new Date(endDate) : new Date();
            const billingSummary = await aiConfigService.getBillingSummary(user.tenantId, start, end);
            return reply.send(billingSummary);
        }
        catch (error) {
            monitoring.trackException(error, {
                operation: 'ai-settings.getBillingSummary',
                tenantId: user.tenantId,
            });
            return reply.status(500).send({
                error: 'Failed to get billing summary',
                message: error.message,
            });
        }
    });
    /**
     * Get usage statistics for current tenant
     * GET /tenant/ai/usage
     */
    fastify.get('/tenant/ai/usage', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get usage statistics for current tenant',
            tags: ['ai-tenant'],
            querystring: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const aiConfigService = fastify.aiConfigService;
        if (!aiConfigService) {
            return reply.status(503).send({ error: 'Usage service not available' });
        }
        try {
            const { startDate, endDate } = request.query;
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
            const end = endDate ? new Date(endDate) : new Date();
            const usageStats = await aiConfigService.getUsageStats(user.tenantId, start, end);
            return reply.send(usageStats);
        }
        catch (error) {
            monitoring.trackException(error, {
                operation: 'ai-settings.getUsageStats',
                tenantId: user.tenantId,
            });
            return reply.status(500).send({
                error: 'Failed to get usage statistics',
                message: error.message,
            });
        }
    });
    // ============================================
    // Tenant Admin: AI Configuration
    // ============================================
    /**
     * Get tenant AI configuration
     * GET /tenant/ai/config
     */
    fastify.get('/tenant/ai/config', {
        schema: {
            description: 'Get tenant AI configuration',
            tags: ['ai-tenant'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const config = tenantConfigs.get(tenantId) || {
            tenantId,
            defaultLLMModelId: undefined,
            defaultEmbeddingModelId: undefined,
            customModels: [],
            usageLimit: undefined,
            currentUsage: 0,
            allowCustomApiKeys: systemAIConfig.allowTenantModels,
            customCredentials: [],
            updatedAt: new Date().toISOString(),
        };
        return config;
    });
    /**
     * Update tenant AI configuration
     * PATCH /tenant/ai/config
     */
    fastify.patch('/tenant/ai/config', {
        schema: {
            description: 'Update tenant AI configuration',
            tags: ['ai-tenant'],
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        const userId = request.user.id;
        const updates = request.body;
        const existing = tenantConfigs.get(tenantId) || {
            tenantId,
            defaultLLMModelId: undefined,
            defaultEmbeddingModelId: undefined,
            customModels: [],
            usageLimit: undefined,
            currentUsage: 0,
            allowCustomApiKeys: systemAIConfig.allowTenantModels,
            customCredentials: [],
        };
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
        };
        tenantConfigs.set(tenantId, updated);
        monitoring.trackEvent('tenant-ai-config.updated', { tenantId, updatedBy: userId });
        return updated;
    });
    /**
     * Add custom credentials for a provider
     * POST /tenant/ai/credentials/:provider
     */
    fastify.post('/tenant/ai/credentials/:provider', {
        schema: {
            description: 'Add custom API credentials for a provider (BYOK - Bring Your Own Key)',
            tags: ['ai-tenant'],
            body: {
                type: 'object',
                required: ['apiKey'],
                properties: {
                    apiKey: { type: 'string', description: 'API key for the provider' },
                    endpoint: { type: 'string', description: 'Optional custom endpoint (for Azure OpenAI)' },
                    deploymentMappings: {
                        type: 'object',
                        description: 'Model to deployment name mappings (for Azure OpenAI)',
                    },
                },
            },
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        const userId = request.user.id;
        const { provider } = request.params;
        const { apiKey, endpoint, deploymentMappings } = request.body;
        if (!systemAIConfig.allowTenantModels) {
            return reply.status(403).send({ error: 'Custom credentials not allowed' });
        }
        try {
            // Use AIConfigService to securely store credentials in Key Vault
            if (fastify.aiConfigService) {
                await fastify.aiConfigService.addTenantCredential(tenantId, {
                    provider: provider,
                    apiKey,
                    endpoint,
                    deploymentMappings,
                }, userId);
                monitoring.trackEvent('tenant-ai-credentials.added', {
                    tenantId,
                    provider,
                    addedBy: userId,
                    storedIn: 'key-vault',
                });
                return {
                    success: true,
                    message: 'Credentials stored securely in Azure Key Vault',
                    provider,
                };
            }
            else {
                // Fallback: Update in-memory storage if AIConfigService not available
                const existing = tenantConfigs.get(tenantId) || {
                    tenantId,
                    defaultLLMModelId: undefined,
                    defaultEmbeddingModelId: undefined,
                    customModels: [],
                    usageLimit: undefined,
                    currentUsage: 0,
                    allowCustomApiKeys: true,
                    customCredentials: [],
                };
                existing.customCredentials = existing.customCredentials.filter(c => c.provider !== provider);
                existing.customCredentials.push({
                    provider,
                    hasCredentials: true,
                });
                tenantConfigs.set(tenantId, existing);
                monitoring.trackEvent('tenant-ai-credentials.added', {
                    tenantId,
                    provider,
                    addedBy: userId,
                    storedIn: 'memory',
                });
                return { success: true, warning: 'Stored in memory (Key Vault not configured)' };
            }
        }
        catch (error) {
            fastify.log.error({ err: error }, 'Failed to add tenant credentials');
            return reply.status(500).send({
                error: 'Failed to store credentials',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * Remove custom credentials for a provider
     * DELETE /tenant/ai/credentials/:provider
     */
    fastify.delete('/tenant/ai/credentials/:provider', {
        schema: {
            description: 'Remove custom API credentials for a provider',
            tags: ['ai-tenant'],
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        const userId = request.user.id;
        const { provider } = request.params;
        try {
            // Use AIConfigService to remove credentials
            if (fastify.aiConfigService) {
                await fastify.aiConfigService.removeTenantCredential(tenantId, provider, userId);
                monitoring.trackEvent('tenant-ai-credentials.removed', {
                    tenantId,
                    provider,
                    removedBy: userId,
                    removedFrom: 'key-vault',
                });
                return reply.status(204).send();
            }
            else {
                // Fallback: Remove from in-memory storage
                const existing = tenantConfigs.get(tenantId);
                if (existing) {
                    existing.customCredentials = existing.customCredentials.filter(c => c.provider !== provider);
                    tenantConfigs.set(tenantId, existing);
                }
                monitoring.trackEvent('tenant-ai-credentials.removed', {
                    tenantId,
                    provider,
                    removedBy: userId,
                    removedFrom: 'memory',
                });
                return reply.status(204).send();
            }
        }
        catch (error) {
            fastify.log.error({ err: error }, 'Failed to remove tenant credentials');
            return reply.status(500).send({
                error: 'Failed to remove credentials',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    // ============================================
    // Public: Available Models
    // ============================================
    /**
     * Get available models for current tenant
     * GET /ai/models/available
     */
    fastify.get('/ai/models/available', {
        schema: {
            description: 'Get AI models available for the current tenant',
            tags: ['ai'],
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        const { type } = request.query;
        try {
            // Get system-wide models
            const shardTypes = await shardTypeRepository.list({ filter: { tenantId: 'system' }, limit: 100 });
            const aiModelType = shardTypes.shardTypes.find(st => st.name === CORE_SHARD_TYPE_NAMES.AI_MODEL);
            if (!aiModelType) {
                return { models: [] };
            }
            const result = await shardRepository.list({
                filter: {
                    tenantId: 'system',
                    shardTypeId: aiModelType.id,
                },
                limit: 100,
            });
            let models = result.shards
                .filter(shard => {
                const data = shard.structuredData;
                return data.isActive && data.isSystemWide;
            })
                .map(shard => ({
                id: shard.id,
                ...shard.structuredData,
            }));
            // Filter by type if specified
            if (type) {
                models = models.filter((m) => m.modelType === type);
            }
            return { models };
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'ai-settings.getAvailableModels' });
            return reply.status(500).send({ error: error.message });
        }
    });
}
//# sourceMappingURL=ai-settings.routes.js.map