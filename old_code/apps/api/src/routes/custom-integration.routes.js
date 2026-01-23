/**
 * Custom Integration API Routes
 * Endpoints for managing and executing user-defined integrations
 */
import { CustomIntegrationService } from '../services/custom-integration.service.js';
import { CredentialEncryptionService } from '../services/credential-encryption.service.js';
import { ShardStatus } from '../types/shard.types.js';
// ============================================
// Routes
// ============================================
export async function customIntegrationRoutes(fastify, options) {
    const { monitoring, shardRepository, shardTypeRepository } = options;
    // Initialize services
    const encryptionService = new CredentialEncryptionService(process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-for-dev-only-change-in-prod');
    const customIntegrationService = new CustomIntegrationService(shardRepository, shardTypeRepository, encryptionService, monitoring);
    // ============================================
    // CRUD Operations
    // ============================================
    /**
     * List custom integrations
     * GET /custom-integrations
     */
    fastify.get('/custom-integrations', {
        schema: {
            description: 'List custom integrations for the tenant',
            tags: ['custom-integrations'],
            querystring: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    type: { type: 'string' },
                    limit: { type: 'number', default: 50 },
                    offset: { type: 'number', default: 0 },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { status, type, limit = 50, offset = 0 } = request.query;
        try {
            // Get CustomIntegration ShardType
            const shardTypes = await shardTypeRepository.list({ filter: { tenantId } });
            const customIntegrationType = shardTypes.shardTypes.find((st) => st.name === 'c_customIntegration');
            if (!customIntegrationType) {
                return { integrations: [], total: 0 };
            }
            const result = await shardRepository.list({
                filter: {
                    tenantId,
                    shardTypeId: customIntegrationType.id,
                },
                limit,
            });
            let integrations = result.shards.map((shard) => ({
                id: shard.id,
                name: shard.structuredData?.name || shard.structuredData?.title || shard.id,
                ...shard.structuredData,
                createdAt: shard.createdAt,
                updatedAt: shard.updatedAt,
            }));
            // Apply filters
            if (status) {
                integrations = integrations.filter((i) => i.status === status);
            }
            if (type) {
                integrations = integrations.filter((i) => i.integrationType === type);
            }
            return {
                integrations,
                total: integrations.length,
                limit,
                offset,
            };
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.list' });
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * Get custom integration by ID
     * GET /custom-integrations/:id
     */
    fastify.get('/custom-integrations/:id', {
        schema: {
            description: 'Get custom integration by ID',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { id } = request.params;
        try {
            const shard = await shardRepository.findById(id, tenantId);
            if (!shard) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return {
                id: shard.id,
                name: shard.structuredData?.name || shard.structuredData?.title || shard.id,
                ...shard.structuredData,
                createdAt: shard.createdAt,
                updatedAt: shard.updatedAt,
            };
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.get' });
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * Create custom integration
     * POST /custom-integrations
     */
    fastify.post('/custom-integrations', {
        schema: {
            description: 'Create a new custom integration',
            tags: ['custom-integrations'],
            body: {
                type: 'object',
                required: ['name', 'displayName', 'integrationType', 'baseUrl', 'authType', 'authConfig'],
                properties: {
                    name: { type: 'string' },
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    integrationType: { type: 'string', enum: ['rest_api', 'webhook', 'graphql'] },
                    baseUrl: { type: 'string' },
                    authType: { type: 'string' },
                    authConfig: { type: 'object' },
                    endpoints: { type: 'array' },
                    webhookConfig: { type: 'object' },
                    defaultHeaders: { type: 'object' },
                    timeout: { type: 'number' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const body = request.body;
        try {
            // Validate URL
            try {
                new URL(body.baseUrl);
            }
            catch {
                return reply.status(400).send({ error: 'Invalid base URL' });
            }
            // Get or create CustomIntegration ShardType
            const shardTypes = await shardTypeRepository.list({ filter: { tenantId } });
            let customIntegrationType = shardTypes.shardTypes.find((st) => st.name === 'c_customIntegration');
            if (!customIntegrationType) {
                // Create the ShardType
                customIntegrationType = await shardTypeRepository.create({
                    tenantId,
                    name: 'c_customIntegration',
                    displayName: 'Custom Integration',
                    description: 'User-defined integration with external APIs',
                    category: 'configuration',
                    icon: 'plug',
                    color: '#8b5cf6',
                    isSystem: true,
                    schema: {
                        format: 'rich',
                        fields: [],
                    },
                    createdBy: userId,
                });
            }
            // Encrypt sensitive auth fields
            const authConfig = await encryptAuthConfig(body.authConfig, encryptionService);
            // Generate webhook secret if webhook type
            let webhookConfig = body.webhookConfig;
            if (body.integrationType === 'webhook') {
                const webhookSecret = customIntegrationService.generateWebhookSecret();
                webhookConfig = {
                    ...webhookConfig,
                    webhookSecret,
                };
            }
            const structuredData = {
                displayName: body.displayName,
                description: body.description,
                integrationType: body.integrationType,
                baseUrl: body.baseUrl,
                authType: body.authType,
                authConfig: authConfig,
                endpoints: (body.endpoints || []),
                webhookConfig: webhookConfig,
                defaultHeaders: body.defaultHeaders,
                timeout: body.timeout,
                status: 'inactive',
            };
            const shard = await shardRepository.create({
                tenantId,
                userId,
                shardTypeId: customIntegrationType.id,
                structuredData,
                status: ShardStatus.ACTIVE,
                createdBy: userId,
            });
            monitoring.trackEvent('custom-integration.created', {
                integrationId: shard.id,
                type: body.integrationType,
            });
            // Add webhook URL if webhook type
            let webhookUrl;
            if (body.integrationType === 'webhook' && webhookConfig) {
                webhookUrl = customIntegrationService.generateWebhookUrl(shard.id, webhookConfig.webhookSecret);
            }
            return reply.status(201).send({
                id: shard.id,
                name: shard.structuredData?.name || shard.structuredData?.title || shard.id,
                ...structuredData,
                webhookUrl,
                createdAt: shard.createdAt,
            });
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.create' });
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * Update custom integration
     * PATCH /custom-integrations/:id
     */
    fastify.patch('/custom-integrations/:id', {
        schema: {
            description: 'Update a custom integration',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        const updates = request.body;
        try {
            const shard = await shardRepository.findById(id, tenantId);
            if (!shard) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            const currentData = shard.structuredData;
            // Encrypt auth config if updated
            let authConfig = currentData.authConfig;
            if (updates.authConfig) {
                authConfig = (await encryptAuthConfig(updates.authConfig, encryptionService));
            }
            const updatedData = {
                ...currentData,
                displayName: updates.displayName ?? currentData.displayName,
                description: updates.description ?? currentData.description,
                integrationType: updates.integrationType ?? currentData.integrationType,
                baseUrl: updates.baseUrl ?? currentData.baseUrl,
                authType: updates.authType ?? currentData.authType,
                authConfig,
                endpoints: (updates.endpoints ?? currentData.endpoints),
                webhookConfig: (updates.webhookConfig ?? currentData.webhookConfig),
                defaultHeaders: updates.defaultHeaders ?? currentData.defaultHeaders,
                timeout: updates.timeout ?? currentData.timeout,
                status: updates.status ?? currentData.status,
            };
            const updated = await shardRepository.update(id, tenantId, {
                structuredData: updatedData,
            });
            monitoring.trackEvent('custom-integration.updated', { integrationId: id });
            if (!updated) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return {
                id: updated.id,
                name: updated.structuredData?.name || updated.structuredData?.title || updated.id,
                ...updated.structuredData,
                updatedAt: updated.updatedAt,
            };
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.update' });
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * Delete custom integration
     * DELETE /custom-integrations/:id
     */
    fastify.delete('/custom-integrations/:id', {
        schema: {
            description: 'Delete a custom integration',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { id } = request.params;
        try {
            await shardRepository.delete(id, tenantId);
            monitoring.trackEvent('custom-integration.deleted', { integrationId: id });
            return reply.status(204).send();
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.delete' });
            return reply.status(500).send({ error: error.message });
        }
    });
    // ============================================
    // Testing Operations
    // ============================================
    /**
     * Test integration connection
     * POST /custom-integrations/:id/test
     */
    fastify.post('/custom-integrations/:id/test', {
        schema: {
            description: 'Test custom integration connection',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        try {
            const shard = await shardRepository.findById(id, tenantId);
            if (!shard) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            const integration = shardToIntegration(shard);
            const result = await customIntegrationService.testConnection(integration);
            // Update test status
            await shardRepository.update(id, tenantId, {
                structuredData: {
                    ...shard.structuredData,
                    lastTestedAt: new Date().toISOString(),
                    lastTestResult: result.success ? 'success' : 'failure',
                    lastError: result.error,
                },
            });
            monitoring.trackEvent('custom-integration.tested', {
                integrationId: id,
                success: result.success,
            });
            return result;
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.test' });
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * Test specific endpoint
     * POST /custom-integrations/:id/test/:endpointId
     */
    fastify.post('/custom-integrations/:id/test/:endpointId', {
        schema: {
            description: 'Test a specific endpoint',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { id, endpointId } = request.params;
        const { params, body } = request.body;
        try {
            const shard = await shardRepository.findById(id, tenantId);
            if (!shard) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            const integration = shardToIntegration(shard);
            const result = await customIntegrationService.testEndpoint(integration, endpointId, params, body);
            monitoring.trackEvent('custom-integration.endpoint-tested', {
                integrationId: id,
                endpointId,
                success: result.success,
            });
            return result;
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.test-endpoint' });
            return reply.status(500).send({ error: error.message });
        }
    });
    // ============================================
    // Execution Operations
    // ============================================
    /**
     * Execute endpoint and optionally create shards
     * POST /custom-integrations/:id/execute/:endpointId
     */
    fastify.post('/custom-integrations/:id/execute/:endpointId', {
        schema: {
            description: 'Execute an endpoint and optionally create shards',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id, endpointId } = request.params;
        const { params, body, createShards } = request.body;
        try {
            const shard = await shardRepository.findById(id, tenantId);
            if (!shard) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            const integration = shardToIntegration(shard);
            // Check if integration is active
            if (integration.status !== 'active') {
                return reply.status(400).send({ error: 'Integration is not active' });
            }
            const result = await customIntegrationService.executeEndpoint(integration, endpointId, params, body);
            // Create shards if requested and execution was successful
            if (createShards && result.success && result.mappedShards) {
                const endpoint = integration.endpoints.find((e) => e.id === endpointId);
                if (endpoint?.responseMapping.targetShardTypeId) {
                    for (const mapped of result.mappedShards) {
                        if (mapped.action === 'created') {
                            try {
                                const newShard = await shardRepository.create({
                                    tenantId,
                                    shardTypeId: endpoint.responseMapping.targetShardTypeId,
                                    structuredData: mapped.data,
                                    status: ShardStatus.ACTIVE,
                                    createdBy: userId,
                                });
                                mapped.shardId = newShard.id;
                            }
                            catch (error) {
                                monitoring.trackException(error, {
                                    operation: 'custom-integrations.create-shard',
                                });
                            }
                        }
                    }
                }
            }
            monitoring.trackEvent('custom-integration.executed', {
                integrationId: id,
                endpointId,
                success: result.success,
                shardsCreated: result.mappedShards?.filter((s) => s.shardId).length || 0,
            });
            return result;
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.execute' });
            return reply.status(500).send({ error: error.message });
        }
    });
    // ============================================
    // Webhook Operations
    // ============================================
    /**
     * Get webhook URL for integration
     * GET /custom-integrations/:id/webhook-url
     */
    fastify.get('/custom-integrations/:id/webhook-url', {
        schema: {
            description: 'Get the webhook URL for an integration',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { id } = request.params;
        try {
            const shard = await shardRepository.findById(id, tenantId);
            if (!shard) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            const data = shard.structuredData;
            if (!data.webhookConfig) {
                return reply.status(400).send({ error: 'Integration does not have webhook configured' });
            }
            const webhookUrl = customIntegrationService.generateWebhookUrl(id, data.webhookConfig.webhookSecret);
            return { webhookUrl };
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.get-webhook-url' });
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * Regenerate webhook secret
     * POST /custom-integrations/:id/regenerate-secret
     */
    fastify.post('/custom-integrations/:id/regenerate-secret', {
        schema: {
            description: 'Regenerate the webhook secret',
            tags: ['custom-integrations'],
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        try {
            const shard = await shardRepository.findById(id, tenantId);
            if (!shard) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            const data = shard.structuredData;
            if (!data.webhookConfig) {
                return reply.status(400).send({ error: 'Integration does not have webhook configured' });
            }
            const newSecret = customIntegrationService.generateWebhookSecret();
            await shardRepository.update(id, tenantId, {
                structuredData: {
                    ...data,
                    webhookConfig: {
                        ...data.webhookConfig,
                        webhookSecret: newSecret,
                    },
                },
            });
            const webhookUrl = customIntegrationService.generateWebhookUrl(id, newSecret);
            monitoring.trackEvent('custom-integration.secret-regenerated', { integrationId: id });
            return { webhookUrl, message: 'Webhook secret regenerated' };
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'custom-integrations.regenerate-secret' });
            return reply.status(500).send({ error: error.message });
        }
    });
}
// ============================================
// Webhook Receiver Route (Public)
// ============================================
export async function customIntegrationWebhookRoutes(fastify, options) {
    const { monitoring, shardRepository, shardTypeRepository } = options;
    const encryptionService = new CredentialEncryptionService(process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-for-dev-only-change-in-prod');
    const customIntegrationService = new CustomIntegrationService(shardRepository, shardTypeRepository, encryptionService, monitoring);
    /**
     * Receive webhook payload
     * POST /webhooks/custom/:integrationId/:secret
     */
    fastify.post('/webhooks/custom/:integrationId/:secret', {
        schema: {
            description: 'Receive webhook payload',
            tags: ['webhooks'],
        },
    }, async (request, reply) => {
        const { integrationId, secret } = request.params;
        try {
            // Find integration (need to search across tenants for webhooks)
            // In production, you'd have a separate index for webhook lookup
            const shard = await shardRepository.findById(integrationId, 'system');
            if (!shard) {
                monitoring.trackEvent('custom-integration.webhook.not-found', { integrationId });
                return reply.status(404).send({ error: 'Integration not found' });
            }
            const data = shard.structuredData;
            if (!data.webhookConfig) {
                return reply.status(400).send({ error: 'Webhook not configured' });
            }
            // Verify secret
            if (data.webhookConfig.webhookSecret !== secret) {
                monitoring.trackEvent('custom-integration.webhook.invalid-secret', { integrationId });
                return reply.status(401).send({ error: 'Invalid secret' });
            }
            // Get signature header
            const signatureHeader = data.webhookConfig.signatureConfig?.header;
            const signature = signatureHeader ? request.headers[signatureHeader.toLowerCase()] : undefined;
            const integration = shardToIntegration(shard);
            const result = await customIntegrationService.processWebhook(integration, request.body, signature);
            monitoring.trackEvent('custom-integration.webhook.received', {
                integrationId,
                success: result.success,
                processed: result.processed,
            });
            const responseStatus = data.webhookConfig.responseStatus || 200;
            const responseBody = data.webhookConfig.responseBody || { status: 'received' };
            return reply.status(responseStatus).send(typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody);
        }
        catch (error) {
            monitoring.trackException(error, {
                operation: 'custom-integrations.webhook.receive',
                integrationId,
            });
            return reply.status(500).send({ error: 'Internal error' });
        }
    });
}
// ============================================
// Helper Functions
// ============================================
async function encryptAuthConfig(config, encryptionService) {
    const sensitiveFields = ['keyValue', 'token', 'password', 'clientSecret', 'accessToken', 'refreshToken'];
    const encrypted = { ...config };
    for (const field of sensitiveFields) {
        if (encrypted[field] && typeof encrypted[field] === 'string') {
            encrypted[field] = await encryptionService.encrypt(encrypted[field]);
        }
    }
    // Handle custom headers
    if (encrypted.headers && typeof encrypted.headers === 'object') {
        const encryptedHeaders = {};
        for (const [key, value] of Object.entries(encrypted.headers)) {
            encryptedHeaders[key] = await encryptionService.encrypt(value);
        }
        encrypted.headers = encryptedHeaders;
    }
    return encrypted;
}
function shardToIntegration(shard) {
    const data = shard.structuredData;
    return {
        id: shard.id,
        tenantId: shard.tenantId,
        name: data.displayName || shard.id,
        displayName: data.displayName,
        description: data.description,
        integrationType: data.integrationType,
        baseUrl: data.baseUrl,
        defaultHeaders: data.defaultHeaders,
        timeout: data.timeout,
        retryConfig: data.retryConfig,
        auth: data.authConfig,
        endpoints: data.endpoints || [],
        webhookConfig: data.webhookConfig,
        status: data.status,
        lastTestedAt: data.lastTestedAt ? new Date(data.lastTestedAt) : undefined,
        lastTestResult: data.lastTestResult,
        createdAt: new Date(shard.createdAt),
        updatedAt: new Date(shard.updatedAt),
        createdBy: shard.createdBy,
    };
}
//# sourceMappingURL=custom-integration.routes.js.map