/**
 * Integration Controller
 * Handles HTTP requests for tenant integration management
 */
import { MAX_USER_CONNECTIONS_PER_INTEGRATION } from '../integrations/constants.js';
function getUser(request) {
    const req = request;
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    return req.user;
}
export class IntegrationController {
    service;
    constructor(service) {
        this.service = service;
    }
    /**
     * GET /api/integrations
     * List available providers and enabled integrations
     */
    async list(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            const result = await this.service.listIntegrations({
                tenantId: user.tenantId,
                providerName: query.providerName,
                status: query.status,
                searchEnabled: query.searchEnabled !== undefined ? query.searchEnabled === 'true' : undefined,
                userScoped: query.userScoped !== undefined ? query.userScoped === 'true' : undefined,
                limit: query.limit ? parseInt(query.limit) : undefined,
                offset: query.offset ? parseInt(query.offset) : undefined,
            });
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list integrations');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to list integrations',
            });
        }
    }
    /**
     * POST /api/integrations
     * Create integration instance
     */
    async create(request, reply) {
        try {
            const user = getUser(request);
            const input = request.body;
            const integration = await this.service.createIntegration({ ...input, tenantId: user.tenantId }, user);
            reply.status(201).send(integration);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create integration');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to create integration',
            });
        }
    }
    /**
     * GET /api/integrations/:id
     * Get integration
     */
    async get(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            reply.status(200).send(integration);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get integration');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get integration',
            });
        }
    }
    /**
     * PATCH /api/integrations/:id
     * Update integration
     */
    async update(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const input = request.body;
            const integration = await this.service.updateIntegration(params.id, user.tenantId, input, user);
            reply.status(200).send(integration);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update integration');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to update integration',
            });
        }
    }
    /**
     * DELETE /api/integrations/:id
     * Delete integration
     */
    async delete(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const deleted = await this.service.deleteIntegration(params.id, user.tenantId, user);
            if (!deleted) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            reply.status(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete integration');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to delete integration',
            });
        }
    }
    /**
     * POST /api/integrations/:id/activate
     * Activate integration
     */
    async activate(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const integration = await this.service.activateIntegration(params.id, user.tenantId, user);
            reply.status(200).send(integration);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to activate integration');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to activate integration',
            });
        }
    }
    /**
     * POST /api/integrations/:id/deactivate
     * Deactivate integration
     */
    async deactivate(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const integration = await this.service.deactivateIntegration(params.id, user.tenantId, user);
            reply.status(200).send(integration);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to deactivate integration');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to deactivate integration',
            });
        }
    }
    /**
     * POST /api/integrations/:id/test-connection
     * Test connection
     */
    async testConnection(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // Test connection
            const result = await connectionService.testConnection(params.id, user.tenantId, integration.userScoped ? user.id : undefined);
            if (result.success) {
                reply.status(200).send(result);
            }
            else {
                reply.status(400).send({
                    error: 'Connection Test Failed',
                    message: result.error || 'Connection test failed',
                    details: result.details,
                });
            }
        }
        catch (error) {
            request.log.error({ error }, 'Failed to test connection');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to test connection',
            });
        }
    }
    /**
     * PATCH /api/integrations/:id/data-access
     * Update data access
     */
    async updateDataAccess(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            const integration = await this.service.updateDataAccess(params.id, user.tenantId, body.allowedShardTypes, user);
            reply.status(200).send(integration);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update data access');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to update data access',
            });
        }
    }
    /**
     * PATCH /api/integrations/:id/search-config
     * Update search configuration
     */
    async updateSearchConfig(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            const integration = await this.service.updateSearchConfig(params.id, user.tenantId, body, user);
            reply.status(200).send(integration);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update search config');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to update search config',
            });
        }
    }
    /**
     * POST /api/integrations/:id/oauth/authorize
     * Start OAuth authorization flow
     */
    async startOAuth(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            // Get integration to check if it supports OAuth
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // Start OAuth flow
            const result = await connectionService.startOAuthFlowForIntegration(integration, user.id, body.returnUrl || '/integrations');
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to start OAuth flow');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to start OAuth flow',
            });
        }
    }
    /**
     * GET /api/integrations/:id/oauth/callback
     * Handle OAuth callback
     */
    async handleOAuthCallback(request, reply) {
        try {
            getUser(request); // Verify user is authenticated
            const query = request.query;
            const frontendUrl = process.env.FRONTEND_URL ||
                (process.env.NODE_ENV === 'production'
                    ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
                    : 'http://localhost:3000');
            // Handle OAuth provider errors (e.g., user denied access)
            if (query.error) {
                // Try to get returnUrl from state if available
                let returnUrl = '/integrations';
                try {
                    const redis = request.server.redis;
                    if (redis && query.state) {
                        // Try to extract returnUrl from state
                        const stateData = await redis.get(`oauth:state:${query.state}`);
                        if (stateData) {
                            const oauthState = JSON.parse(stateData);
                            returnUrl = oauthState.returnUrl || returnUrl;
                        }
                    }
                }
                catch {
                    // If we can't get returnUrl from state, use default
                }
                const redirectUrl = new URL(returnUrl, frontendUrl);
                redirectUrl.searchParams.set('oauth', 'error');
                redirectUrl.searchParams.set('error', query.error_description || query.error || 'OAuth authorization was denied or failed');
                return reply.redirect(redirectUrl.toString());
            }
            if (!query.code || !query.state) {
                // Try to get returnUrl from state if available
                let returnUrl = '/integrations';
                try {
                    const redis = request.server.redis;
                    if (redis && query.state) {
                        const stateData = await redis.get(`oauth:state:${query.state}`);
                        if (stateData) {
                            const oauthState = JSON.parse(stateData);
                            returnUrl = oauthState.returnUrl || returnUrl;
                        }
                    }
                }
                catch {
                    // If we can't get returnUrl from state, use default
                }
                const redirectUrl = new URL(returnUrl, frontendUrl);
                redirectUrl.searchParams.set('oauth', 'error');
                redirectUrl.searchParams.set('error', 'Missing code or state parameter');
                return reply.redirect(redirectUrl.toString());
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                const redirectUrl = new URL('/integrations', frontendUrl);
                redirectUrl.searchParams.set('oauth', 'error');
                redirectUrl.searchParams.set('error', 'Connection service not available');
                return reply.redirect(redirectUrl.toString());
            }
            // Handle OAuth callback
            const result = await connectionService.handleOAuthCallback(query.code, query.state);
            // Redirect to frontend returnUrl with success/error parameters
            const returnUrl = new URL(result.returnUrl || '/integrations', frontendUrl);
            if (result.success) {
                returnUrl.searchParams.set('oauth', 'success');
                if (result.connectionId) {
                    returnUrl.searchParams.set('connectionId', result.connectionId);
                }
                return reply.redirect(returnUrl.toString());
            }
            else {
                returnUrl.searchParams.set('oauth', 'error');
                returnUrl.searchParams.set('error', result.error || 'Failed to complete OAuth flow');
                return reply.redirect(returnUrl.toString());
            }
        }
        catch (error) {
            request.log.error({ error }, 'Failed to handle OAuth callback');
            const frontendUrl = process.env.FRONTEND_URL ||
                (process.env.NODE_ENV === 'production'
                    ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
                    : 'http://localhost:3000');
            const redirectUrl = new URL('/integrations', frontendUrl);
            redirectUrl.searchParams.set('oauth', 'error');
            redirectUrl.searchParams.set('error', error.message || 'Failed to handle OAuth callback');
            return reply.redirect(redirectUrl.toString());
        }
    }
    /**
     * GET /api/integrations/:id/connections
     * Get user connections for an integration
     */
    async getUserConnections(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // Get user connections using service method
            const connections = await connectionService.getUserConnections(params.id, user.tenantId, user.id);
            reply.status(200).send({
                connections: connections.map((conn) => ({
                    id: conn.id,
                    integrationId: conn.integrationId,
                    displayName: conn.displayName,
                    status: conn.status,
                    scope: conn.scope,
                    authType: conn.authType,
                    lastValidatedAt: conn.lastValidatedAt,
                    validationError: conn.validationError,
                    lastUsedAt: conn.lastUsedAt, // Include usage tracking
                    usageCount: conn.usageCount, // Include usage count
                    oauthExpiresAt: conn.oauth?.expiresAt, // Include OAuth token expiration for UI display
                    createdAt: conn.createdAt,
                    updatedAt: conn.updatedAt,
                })),
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get user connections');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: error.message || 'Failed to get user connections',
            });
        }
    }
    /**
     * POST /api/integrations/:id/connections
     * Create a user connection for an integration
     */
    async createUserConnection(request, reply) {
        const params = request.params;
        try {
            const user = getUser(request);
            const body = request.body;
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // Validate that integration supports user-scoped connections
            if (!integration.userScoped) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'This integration does not support user-scoped connections',
                });
                return;
            }
            // Get existing connections to check limits and duplicates
            const existingConnections = await connectionService.getUserConnections(params.id, user.tenantId, user.id);
            // Check connection limit
            if (existingConnections.length >= MAX_USER_CONNECTIONS_PER_INTEGRATION) {
                reply.status(403).send({
                    error: 'Forbidden',
                    message: `Maximum number of connections (${MAX_USER_CONNECTIONS_PER_INTEGRATION}) reached for this integration. Please delete an existing connection before creating a new one.`,
                });
                return;
            }
            // Validate display name if provided
            if (body.displayName !== undefined) {
                const trimmedDisplayName = body.displayName.trim();
                if (trimmedDisplayName.length === 0) {
                    reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Display name cannot be empty',
                    });
                    return;
                }
                if (trimmedDisplayName.length > 200) {
                    reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Display name must be less than 200 characters',
                    });
                    return;
                }
                // Use trimmed value
                body.displayName = trimmedDisplayName;
                // Check for duplicate display names
                const duplicateName = existingConnections.find((conn) => conn.displayName?.toLowerCase() === trimmedDisplayName.toLowerCase());
                if (duplicateName) {
                    reply.status(409).send({
                        error: 'Conflict',
                        message: `A connection with the display name "${trimmedDisplayName}" already exists. Please use a different name.`,
                    });
                    return;
                }
            }
            // For now, user connections are typically created via OAuth flow
            // This endpoint can be used for API key or custom credentials
            if (!body.credentials) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Credentials are required',
                });
                return;
            }
            // Validate credentials is an object and not empty
            if (typeof body.credentials !== 'object' || body.credentials === null || Array.isArray(body.credentials)) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Credentials must be an object',
                });
                return;
            }
            if (Object.keys(body.credentials).length === 0) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Credentials object cannot be empty',
                });
                return;
            }
            // Validate credentials structure based on auth type
            const provider = await (connectionService).providerRepo?.findByIdAcrossCategories(integration.integrationId);
            if (provider) {
                if (provider.authType === 'api_key') {
                    if (!body.credentials.apiKey && !body.credentials.api_key && !body.credentials.key) {
                        reply.status(400).send({
                            error: 'Bad Request',
                            message: 'API key is required for this integration',
                        });
                        return;
                    }
                }
                else if (provider.authType === 'basic') {
                    if (!body.credentials.username || !body.credentials.password) {
                        reply.status(400).send({
                            error: 'Bad Request',
                            message: 'Username and password are required for basic authentication',
                        });
                        return;
                    }
                }
            }
            const connection = await connectionService.connectWithCustomCredentials(params.id, user.tenantId, user.id, body.credentials, body.displayName);
            // Audit log
            const auditLogService = request.server.auditLogService;
            if (auditLogService) {
                auditLogService.log({
                    tenantId: user.tenantId,
                    category: 'system',
                    eventType: 'integration.connection.created',
                    outcome: 'success',
                    actorId: user.id,
                    actorEmail: user.email,
                    actorType: 'user',
                    targetId: connection.id,
                    targetType: 'integration_connection',
                    targetName: connection.displayName || `Connection for ${integration.name}`,
                    message: `User connection created for integration "${integration.name}"`,
                    details: {
                        integrationId: params.id,
                        integrationName: integration.name,
                        connectionId: connection.id,
                        authType: connection.authType,
                        scope: connection.scope,
                    },
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                }).catch((err) => {
                    // Don't fail if audit logging fails
                    request.log.warn({ err }, 'Failed to log audit event for connection creation');
                });
            }
            reply.status(201).send({
                connection: {
                    id: connection.id,
                    integrationId: connection.integrationId,
                    displayName: connection.displayName,
                    status: connection.status,
                    scope: connection.scope,
                    authType: connection.authType,
                    lastValidatedAt: connection.lastValidatedAt,
                    createdAt: connection.createdAt,
                    updatedAt: connection.updatedAt,
                },
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create user connection');
            // Audit log failure (only if user is available)
            try {
                const user = getUser(request);
                const auditLogService = request.server.auditLogService;
                if (auditLogService) {
                    auditLogService.log({
                        tenantId: user.tenantId,
                        category: 'system',
                        eventType: 'integration.connection.created',
                        outcome: 'failure',
                        actorId: user.id,
                        actorEmail: user.email,
                        actorType: 'user',
                        targetId: params.id,
                        targetType: 'integration',
                        message: `Failed to create user connection for integration`,
                        errorMessage: error.message,
                        details: {
                            integrationId: params.id,
                            error: error.message,
                        },
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                    }).catch(() => {
                        // Ignore audit logging errors
                    });
                }
            }
            catch {
                // User not available, skip audit logging
            }
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to create user connection',
            });
        }
    }
    /**
     * PATCH /api/integrations/:id/connections/:connectionId
     * Update a user connection
     */
    async updateUserConnection(request, reply) {
        const params = request.params;
        try {
            const user = getUser(request);
            const body = request.body;
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // Get the specific user connection to verify ownership
            const connection = await connectionService.getUserConnection(params.id, params.connectionId, user.tenantId, user.id);
            if (!connection) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Connection not found',
                });
                return;
            }
            // Validate display name if provided
            if (body.displayName !== undefined) {
                const trimmedDisplayName = body.displayName.trim();
                if (trimmedDisplayName.length === 0) {
                    reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Display name cannot be empty',
                    });
                    return;
                }
                if (trimmedDisplayName.length > 200) {
                    reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Display name must be less than 200 characters',
                    });
                    return;
                }
                // Use trimmed value
                body.displayName = trimmedDisplayName;
                // Check for duplicate display names (excluding the current connection being updated)
                const existingConnections = await connectionService.getUserConnections(params.id, user.tenantId, user.id);
                const duplicateName = existingConnections.find((conn) => conn.id !== params.connectionId && conn.displayName?.toLowerCase() === trimmedDisplayName.toLowerCase());
                if (duplicateName) {
                    reply.status(409).send({
                        error: 'Conflict',
                        message: `A connection with the display name "${trimmedDisplayName}" already exists. Please use a different name.`,
                    });
                    return;
                }
            }
            // Validate credentials if provided
            if (body.credentials !== undefined) {
                if (typeof body.credentials !== 'object' || body.credentials === null || Array.isArray(body.credentials)) {
                    reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Credentials must be an object',
                    });
                    return;
                }
                if (Object.keys(body.credentials).length === 0) {
                    reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Credentials object cannot be empty',
                    });
                    return;
                }
                // Validate credentials structure based on auth type
                const provider = await (connectionService).providerRepo?.findByIdAcrossCategories(integration.integrationId);
                if (provider) {
                    if (provider.authType === 'api_key') {
                        if (!body.credentials.apiKey && !body.credentials.api_key && !body.credentials.key) {
                            reply.status(400).send({
                                error: 'Bad Request',
                                message: 'API key is required for this integration',
                            });
                            return;
                        }
                    }
                    else if (provider.authType === 'basic') {
                        if (!body.credentials.username || !body.credentials.password) {
                            reply.status(400).send({
                                error: 'Bad Request',
                                message: 'Username and password are required for basic authentication',
                            });
                            return;
                        }
                    }
                }
                // Update credentials using the connection service
                // This will re-encrypt and store credentials in Key Vault
                // connectWithCustomCredentials will update the existing connection if it exists
                await connectionService.connectWithCustomCredentials(params.id, user.tenantId, user.id, body.credentials, body.displayName || connection.displayName);
            }
            // Update display name if provided (and credentials weren't updated, or if it's different)
            if (body.displayName !== undefined) {
                const connectionRepo = (connectionService).connectionRepo;
                if (!connectionRepo) {
                    reply.status(500).send({
                        error: 'Internal Server Error',
                        message: 'Connection repository not available',
                    });
                    return;
                }
                await connectionRepo.update(params.connectionId, params.id, {
                    displayName: body.displayName,
                    updatedAt: new Date(),
                });
            }
            // Fetch the updated connection
            const updated = await connectionService.getUserConnection(params.id, params.connectionId, user.tenantId, user.id);
            if (!updated) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Connection not found after update',
                });
                return;
            }
            // Audit log
            const auditLogService = request.server.auditLogService;
            if (auditLogService) {
                const changes = [];
                if (body.displayName !== undefined && connection.displayName !== body.displayName) {
                    changes.push({
                        field: 'displayName',
                        oldValue: connection.displayName,
                        newValue: body.displayName,
                    });
                }
                if (body.credentials) {
                    changes.push({
                        field: 'credentials',
                        oldValue: '[REDACTED]',
                        newValue: '[REDACTED]',
                    });
                }
                auditLogService.log({
                    tenantId: user.tenantId,
                    category: 'system',
                    eventType: 'integration.connection.updated',
                    outcome: 'success',
                    actorId: user.id,
                    actorEmail: user.email,
                    actorType: 'user',
                    targetId: updated.id,
                    targetType: 'integration_connection',
                    targetName: updated.displayName || `Connection for ${integration.name}`,
                    message: `User connection updated for integration "${integration.name}"`,
                    details: {
                        integrationId: params.id,
                        integrationName: integration.name,
                        connectionId: updated.id,
                        changes,
                        credentialsUpdated: !!body.credentials,
                    },
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                }).catch((err) => {
                    // Don't fail if audit logging fails
                    request.log.warn({ err }, 'Failed to log audit event for connection update');
                });
            }
            reply.status(200).send({
                connection: {
                    id: updated.id,
                    integrationId: updated.integrationId,
                    displayName: updated.displayName,
                    status: updated.status,
                    scope: updated.scope,
                    authType: updated.authType,
                    lastValidatedAt: updated.lastValidatedAt,
                    createdAt: updated.createdAt,
                    updatedAt: updated.updatedAt,
                },
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update user connection');
            // Audit log failure (only if user is available)
            try {
                const user = getUser(request);
                const auditLogService = request.server.auditLogService;
                if (auditLogService) {
                    auditLogService.log({
                        tenantId: user.tenantId,
                        category: 'system',
                        eventType: 'integration.connection.updated',
                        outcome: 'failure',
                        actorId: user.id,
                        actorEmail: user.email,
                        actorType: 'user',
                        targetId: params.connectionId,
                        targetType: 'integration_connection',
                        message: `Failed to update user connection`,
                        errorMessage: error.message,
                        details: {
                            integrationId: params.id,
                            connectionId: params.connectionId,
                            error: error.message,
                        },
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                    }).catch(() => {
                        // Ignore audit logging errors
                    });
                }
            }
            catch {
                // User not available, skip audit logging
            }
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to update user connection',
            });
        }
    }
    /**
     * DELETE /api/integrations/:id/connections/:connectionId
     * Delete a user connection
     */
    async deleteUserConnection(request, reply) {
        const params = request.params;
        try {
            const user = getUser(request);
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // Get the specific user connection to verify ownership
            const connection = await connectionService.getUserConnection(params.id, params.connectionId, user.tenantId, user.id);
            if (!connection) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Connection not found',
                });
                return;
            }
            // Delete connection using service method to ensure proper cleanup
            await connectionService.deleteConnection(params.connectionId, params.id);
            // Audit log
            const auditLogService = request.server.auditLogService;
            if (auditLogService) {
                auditLogService.log({
                    tenantId: user.tenantId,
                    category: 'system',
                    eventType: 'integration.connection.deleted',
                    outcome: 'success',
                    actorId: user.id,
                    actorEmail: user.email,
                    actorType: 'user',
                    targetId: connection.id,
                    targetType: 'integration_connection',
                    targetName: connection.displayName || `Connection for ${integration.name}`,
                    message: `User connection deleted for integration "${integration.name}"`,
                    details: {
                        integrationId: params.id,
                        integrationName: integration.name,
                        connectionId: connection.id,
                        authType: connection.authType,
                        scope: connection.scope,
                    },
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                }).catch((err) => {
                    // Don't fail if audit logging fails
                    request.log.warn({ err }, 'Failed to log audit event for connection deletion');
                });
            }
            reply.status(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete user connection');
            // Audit log failure (only if user is available)
            try {
                const user = getUser(request);
                const auditLogService = request.server.auditLogService;
                if (auditLogService) {
                    auditLogService.log({
                        tenantId: user.tenantId,
                        category: 'system',
                        eventType: 'integration.connection.deleted',
                        outcome: 'failure',
                        actorId: user.id,
                        actorEmail: user.email,
                        actorType: 'user',
                        targetId: params.connectionId,
                        targetType: 'integration_connection',
                        message: `Failed to delete user connection`,
                        errorMessage: error.message,
                        details: {
                            integrationId: params.id,
                            connectionId: params.connectionId,
                            error: error.message,
                        },
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                    }).catch(() => {
                        // Ignore audit logging errors
                    });
                }
            }
            catch {
                // User not available, skip audit logging
            }
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to delete user connection',
            });
        }
    }
    /**
     * POST /api/integrations/:id/connections/:connectionId/test
     * Test a user connection
     */
    async testUserConnection(request, reply) {
        const params = request.params;
        try {
            const user = getUser(request);
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // Get the specific user connection to verify ownership
            const connection = await connectionService.getUserConnection(params.id, params.connectionId, user.tenantId, user.id);
            if (!connection) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Connection not found',
                });
                return;
            }
            // Test the specific connection using testSpecificConnection
            const result = await connectionService.testSpecificConnection(params.id, params.connectionId, user.tenantId, user.id);
            // Audit log
            const auditLogService = request.server.auditLogService;
            if (auditLogService) {
                auditLogService.log({
                    tenantId: user.tenantId,
                    category: 'system',
                    eventType: 'integration.connection.tested',
                    outcome: result.success ? 'success' : 'failure',
                    actorId: user.id,
                    actorEmail: user.email,
                    actorType: 'user',
                    targetId: connection.id,
                    targetType: 'integration_connection',
                    targetName: connection.displayName || `Connection for ${integration.name}`,
                    message: result.success
                        ? `Connection test successful for integration "${integration.name}"`
                        : `Connection test failed for integration "${integration.name}"`,
                    errorMessage: result.success ? undefined : result.error,
                    details: {
                        integrationId: params.id,
                        integrationName: integration.name,
                        connectionId: connection.id,
                        testResult: result.success,
                        authType: connection.authType,
                    },
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                }).catch((err) => {
                    // Don't fail if audit logging fails
                    request.log.warn({ err }, 'Failed to log audit event for connection test');
                });
            }
            if (result.success) {
                reply.status(200).send(result);
            }
            else {
                reply.status(400).send({
                    error: 'Connection Test Failed',
                    message: result.error || 'Connection test failed',
                    details: result.details,
                });
            }
        }
        catch (error) {
            request.log.error({ error }, 'Failed to test user connection');
            // Audit log failure (only if user is available)
            try {
                const user = getUser(request);
                const auditLogService = request.server.auditLogService;
                if (auditLogService) {
                    auditLogService.log({
                        tenantId: user.tenantId,
                        category: 'system',
                        eventType: 'integration.connection.tested',
                        outcome: 'failure',
                        actorId: user.id,
                        actorEmail: user.email,
                        actorType: 'user',
                        targetId: params.connectionId,
                        targetType: 'integration_connection',
                        message: `Failed to test user connection`,
                        errorMessage: error.message,
                        details: {
                            integrationId: params.id,
                            connectionId: params.connectionId,
                            error: error.message,
                        },
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                    }).catch(() => {
                        // Ignore audit logging errors
                    });
                }
            }
            catch {
                // User not available, skip audit logging
            }
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to test user connection',
            });
        }
    }
    /**
     * GET /api/integrations/:id/connections/stats
     * Get connection usage statistics for an integration (or all integrations if id is 'all')
     */
    async getConnectionUsageStats(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            // Get connection service from server
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            // If id is 'all', get stats for all integrations, otherwise verify integration exists
            const integrationId = params.id === 'all' ? undefined : params.id;
            if (integrationId) {
                // Verify integration exists and user has access
                const integration = await this.service.getIntegration(integrationId, user.tenantId);
                if (!integration) {
                    reply.status(404).send({
                        error: 'Not Found',
                        message: 'Integration not found',
                    });
                    return;
                }
            }
            const stats = await connectionService.getConnectionUsageStats(user.tenantId, user.id, integrationId);
            reply.status(200).send(stats);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get connection usage stats');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: error.message || 'Failed to get connection usage stats',
            });
        }
    }
    /**
     * POST /api/integrations/:id/connections/bulk/delete
     * Bulk delete user connections
     */
    async bulkDeleteUserConnections(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Verify integration is user-scoped
            if (!integration.userScoped) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Bulk operations are only available for user-scoped integrations',
                });
                return;
            }
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            const result = await connectionService.bulkDeleteUserConnections(params.id, body.connectionIds, user.tenantId, user.id);
            // Audit log
            const auditLogService = request.server.auditLogService;
            if (auditLogService) {
                auditLogService.log({
                    tenantId: user.tenantId,
                    category: 'system',
                    eventType: 'integration.connection.bulk_deleted',
                    outcome: result.failureCount === 0 ? 'success' : 'partial',
                    actorId: user.id,
                    actorEmail: user.email,
                    actorType: 'user',
                    message: `Bulk deleted ${result.successCount} of ${body.connectionIds.length} connections for integration "${integration.name}"`,
                    details: {
                        integrationId: params.id,
                        integrationName: integration.name,
                        totalRequested: body.connectionIds.length,
                        successCount: result.successCount,
                        failureCount: result.failureCount,
                    },
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                }).catch((err) => {
                    request.log.warn({ err }, 'Failed to log audit event for bulk connection deletion');
                });
            }
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to bulk delete user connections');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to bulk delete user connections',
            });
        }
    }
    /**
     * POST /api/integrations/:id/connections/bulk/test
     * Bulk test user connections
     */
    async bulkTestUserConnections(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const body = request.body;
            // Get integration to verify it exists and user has access
            const integration = await this.service.getIntegration(params.id, user.tenantId);
            if (!integration) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'Integration not found',
                });
                return;
            }
            // Verify integration is user-scoped
            if (!integration.userScoped) {
                reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Bulk operations are only available for user-scoped integrations',
                });
                return;
            }
            const connectionService = request.server.integrationConnectionService;
            if (!connectionService) {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Connection service not available',
                });
                return;
            }
            const result = await connectionService.bulkTestUserConnections(params.id, body.connectionIds, user.tenantId, user.id);
            // Audit log
            const auditLogService = request.server.auditLogService;
            if (auditLogService) {
                auditLogService.log({
                    tenantId: user.tenantId,
                    category: 'system',
                    eventType: 'integration.connection.bulk_tested',
                    outcome: result.failureCount === 0 ? 'success' : 'partial',
                    actorId: user.id,
                    actorEmail: user.email,
                    actorType: 'user',
                    message: `Bulk tested ${result.successCount} of ${body.connectionIds.length} connections for integration "${integration.name}"`,
                    details: {
                        integrationId: params.id,
                        integrationName: integration.name,
                        totalRequested: body.connectionIds.length,
                        successCount: result.successCount,
                        failureCount: result.failureCount,
                    },
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                }).catch((err) => {
                    request.log.warn({ err }, 'Failed to log audit event for bulk connection test');
                });
            }
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to bulk test user connections');
            reply.status(400).send({
                error: 'Bad Request',
                message: error.message || 'Failed to bulk test user connections',
            });
        }
    }
}
//# sourceMappingURL=integration.controller.js.map