/**
 * Webhook Routes
 *
 * Endpoints:
 * POST   /webhooks/:registrationId  - Receive webhook events
 * POST   /integrations/:id/webhooks - Register webhook
 * DELETE /webhooks/:registrationId   - Unregister webhook
 * GET    /webhooks/:registrationId   - Get webhook details
 * GET    /webhooks                   - List webhooks
 * GET    /webhooks/:registrationId/health - Check webhook health
 */
export function registerWebhookRoutes(app, // FastifyInstance
webhookService) {
    /**
     * POST /webhooks/:registrationId
     * Receive and process webhook event from provider
     */
    app.post('/webhooks/:registrationId', async (req, reply) => {
        try {
            const { registrationId } = req.params;
            // Get raw body for signature verification
            const body = req.rawBody || JSON.stringify(req.body);
            // Process webhook
            const result = await webhookService.processWebhookEvent(registrationId, req.headers, body);
            if (!result.success) {
                return reply.status(400).send({
                    error: result.error,
                    processingTimeMs: result.processingTimeMs,
                });
            }
            return reply.status(200).send({
                success: true,
                eventType: result.eventType,
                entityId: result.entityId,
                syncTriggered: result.syncTriggered,
                processingTimeMs: result.processingTimeMs,
            });
        }
        catch (error) {
            return reply.status(500).send({
                error: error.message,
            });
        }
    });
    /**
     * POST /integrations/:integrationId/webhooks
     * Register a new webhook
     */
    app.post('/integrations/:integrationId/webhooks', {
        schema: {
            body: {
                type: 'object',
                required: ['connectionId', 'events'],
                properties: {
                    connectionId: { type: 'string' },
                    events: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Events to subscribe to (e.g., ["Contact.created", "Contact.updated"])',
                    },
                    metadata: { type: 'object' },
                    retryPolicy: {
                        type: 'object',
                        properties: {
                            maxRetries: { type: 'number' },
                            backoffSeconds: { type: 'number' },
                        },
                    },
                },
            },
        },
    }, async (req, reply) => {
        try {
            const { integrationId } = req.params;
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { connectionId, events, metadata, retryPolicy } = req.body;
            // Register webhook
            const registration = await webhookService.registerWebhook(tenantId, integrationId, connectionId, events, { metadata, retryPolicy });
            return reply.status(201).send({
                registrationId: registration.id,
                webhookUrl: registration.webhookUrl,
                webhookSecret: registration.webhookSecret,
                status: registration.status,
                createdAt: registration.createdAt,
            });
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message,
            });
        }
    });
    /**
     * DELETE /webhooks/:registrationId
     * Unregister a webhook
     */
    app.delete('/webhooks/:registrationId', async (req, reply) => {
        try {
            const { registrationId } = req.params;
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            // Unregister webhook
            await webhookService.unregisterWebhook(registrationId, tenantId);
            return reply.status(204).send();
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message,
            });
        }
    });
    /**
     * GET /webhooks/:registrationId
     * Get webhook registration details
     */
    app.get('/webhooks/:registrationId', async (req, reply) => {
        try {
            const { registrationId } = req.params;
            const registration = await webhookService.getWebhookRegistration(registrationId);
            if (!registration) {
                return reply.status(404).send({
                    error: 'Webhook registration not found',
                });
            }
            // Don't return the secret in responses
            const { webhookSecret, ...safe } = registration;
            return reply.status(200).send(safe);
        }
        catch (error) {
            return reply.status(500).send({
                error: error.message,
            });
        }
    });
    /**
     * GET /webhooks
     * List webhook registrations for authenticated tenant
     */
    app.get('/webhooks', async (req, reply) => {
        try {
            const tenantId = req.user?.tenantId;
            const { integrationId, connectionId } = req.query;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            // List registrations
            const registrations = await webhookService.listRegistrations(tenantId, integrationId, connectionId);
            // Don't return secrets
            const safe = registrations.map(({ webhookSecret, ...r }) => r);
            return reply.status(200).send({
                webhooks: safe,
                total: safe.length,
            });
        }
        catch (error) {
            return reply.status(500).send({
                error: error.message,
            });
        }
    });
    /**
     * GET /webhooks/:registrationId/health
     * Check webhook health status
     */
    app.get('/webhooks/:registrationId/health', async (req, reply) => {
        try {
            const { registrationId } = req.params;
            const health = await webhookService.checkWebhookHealth(registrationId);
            return reply.status(200).send(health);
        }
        catch (error) {
            return reply.status(500).send({
                error: error.message,
            });
        }
    });
    /**
     * GET /webhooks/health
     * Get overall webhook service health
     */
    app.get('/webhooks/health', async (req, reply) => {
        try {
            const health = await webhookService.healthCheck();
            return reply.status(200).send(health);
        }
        catch (error) {
            return reply.status(500).send({
                error: error.message,
            });
        }
    });
}
//# sourceMappingURL=webhooks.routes.js.map