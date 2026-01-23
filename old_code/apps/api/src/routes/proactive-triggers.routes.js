/**
 * Proactive Triggers API Routes
 * Provides endpoints for managing proactive trigger configurations
 */
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/authorization.js';
/**
 * Register proactive triggers routes
 */
export async function registerProactiveTriggersRoutes(server, repository, proactiveInsightService) {
    // Get auth decorator from server
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️ Proactive Triggers routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // ============================================
    // Schemas
    // ============================================
    const createTriggerSchema = {
        body: {
            type: 'object',
            required: ['name', 'type', 'shardTypeId', 'conditions', 'priority', 'cooldownHours'],
            properties: {
                name: { type: 'string', minLength: 1, maxLength: 200 },
                description: { type: 'string', maxLength: 1000 },
                type: {
                    type: 'string',
                    enum: ['deal_at_risk', 'milestone_approaching', 'stale_opportunity', 'missing_follow_up', 'relationship_cooling', 'action_required'],
                },
                shardTypeId: { type: 'string', minLength: 1 },
                conditions: {
                    type: ['object', 'array'],
                },
                priority: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                },
                cooldownHours: { type: 'number', minimum: 0 },
                schedule: {
                    type: 'object',
                    properties: {
                        cron: { type: 'string' },
                        intervalMinutes: { type: 'number', minimum: 1 },
                        timezone: { type: 'string' },
                    },
                },
                eventTriggers: {
                    type: 'array',
                    items: { type: 'string' },
                },
                messageTemplate: { type: 'string' },
                contextTemplateId: { type: 'string' },
                metadata: { type: 'object' },
                isActive: { type: 'boolean' },
            },
        },
    };
    const updateTriggerSchema = {
        body: {
            type: 'object',
            properties: {
                name: { type: 'string', minLength: 1, maxLength: 200 },
                description: { type: 'string', maxLength: 1000 },
                type: {
                    type: 'string',
                    enum: ['deal_at_risk', 'milestone_approaching', 'stale_opportunity', 'missing_follow_up', 'relationship_cooling', 'action_required'],
                },
                shardTypeId: { type: 'string', minLength: 1 },
                conditions: {
                    type: ['object', 'array'],
                },
                priority: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                },
                cooldownHours: { type: 'number', minimum: 0 },
                schedule: {
                    type: 'object',
                    properties: {
                        cron: { type: 'string' },
                        intervalMinutes: { type: 'number', minimum: 1 },
                        timezone: { type: 'string' },
                    },
                },
                eventTriggers: {
                    type: 'array',
                    items: { type: 'string' },
                },
                messageTemplate: { type: 'string' },
                contextTemplateId: { type: 'string' },
                metadata: { type: 'object' },
                isActive: { type: 'boolean' },
            },
        },
    };
    const listTriggersSchema = {
        querystring: {
            type: 'object',
            properties: {
                shardTypeId: { type: 'string' },
                type: {
                    type: 'string',
                    enum: ['deal_at_risk', 'milestone_approaching', 'stale_opportunity', 'missing_follow_up', 'relationship_cooling', 'action_required'],
                },
                isActive: { type: 'boolean' },
                isSystem: { type: 'boolean' },
                limit: { type: 'number', minimum: 1, maximum: 100 },
                offset: { type: 'number', minimum: 0 },
                orderBy: {
                    type: 'string',
                    enum: ['createdAt', 'updatedAt', 'name', 'triggerCount'],
                },
                order: {
                    type: 'string',
                    enum: ['asc', 'desc'],
                },
            },
        },
    };
    const getTriggerSchema = {
        params: {
            type: 'object',
            required: ['triggerId'],
            properties: {
                triggerId: { type: 'string' },
            },
        },
    };
    const deleteTriggerSchema = {
        params: {
            type: 'object',
            required: ['triggerId'],
            properties: {
                triggerId: { type: 'string' },
            },
        },
    };
    // ============================================
    // Routes
    // ============================================
    /**
     * GET /api/v1/proactive-triggers
     * List triggers for the authenticated tenant
     */
    server.get('/api/v1/proactive-triggers', {
        onRequest: authGuards,
        schema: listTriggersSchema,
    }, async (request, reply) => {
        try {
            const tenantId = request.tenantId;
            const query = request.query;
            const result = await repository.listTriggers(tenantId, {
                shardTypeId: query.shardTypeId,
                type: query.type,
                isActive: query.isActive,
                isSystem: query.isSystem,
                limit: query.limit,
                offset: query.offset,
                orderBy: query.orderBy,
                order: query.order,
            });
            return reply.status(200).send(result);
        }
        catch (error) {
            server.log.error({ error }, 'Error listing proactive triggers');
            return reply.status(500).send({
                error: 'Failed to list proactive triggers',
                message: error.message,
            });
        }
    });
    /**
     * GET /api/v1/proactive-triggers/:triggerId
     * Get a specific trigger
     */
    server.get('/api/v1/proactive-triggers/:triggerId', {
        onRequest: authGuards,
        schema: getTriggerSchema,
    }, async (request, reply) => {
        try {
            const tenantId = request.tenantId;
            const { triggerId } = request.params;
            const trigger = await repository.getTrigger(triggerId, tenantId);
            if (!trigger) {
                return reply.status(404).send({
                    error: 'Trigger not found',
                });
            }
            return reply.status(200).send(trigger);
        }
        catch (error) {
            server.log.error({ error }, 'Error getting proactive trigger');
            return reply.status(500).send({
                error: 'Failed to get proactive trigger',
                message: error.message,
            });
        }
    });
    /**
     * POST /api/v1/proactive-triggers
     * Create a new trigger
     */
    server.post('/api/v1/proactive-triggers', {
        onRequest: authGuards,
        schema: createTriggerSchema,
    }, async (request, reply) => {
        try {
            const tenantId = request.tenantId;
            const userId = request.userId;
            const body = request.body;
            const trigger = {
                id: uuidv4(),
                tenantId,
                name: body.name,
                description: body.description,
                type: body.type,
                shardTypeId: body.shardTypeId,
                conditions: body.conditions,
                priority: body.priority,
                cooldownHours: body.cooldownHours,
                schedule: body.schedule,
                eventTriggers: body.eventTriggers,
                messageTemplate: body.messageTemplate,
                contextTemplateId: body.contextTemplateId,
                metadata: body.metadata,
                isActive: body.isActive !== undefined ? body.isActive : true,
                isSystem: false,
                createdBy: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                triggerCount: 0,
            };
            const created = await repository.upsertTrigger(trigger);
            return reply.status(201).send(created);
        }
        catch (error) {
            server.log.error({ error }, 'Error creating proactive trigger');
            return reply.status(500).send({
                error: 'Failed to create proactive trigger',
                message: error.message,
            });
        }
    });
    /**
     * PUT /api/v1/proactive-triggers/:triggerId
     * Update an existing trigger
     */
    server.put('/api/v1/proactive-triggers/:triggerId', {
        onRequest: authGuards,
        schema: {
            ...updateTriggerSchema,
            params: getTriggerSchema.params,
        },
    }, async (request, reply) => {
        try {
            const tenantId = request.tenantId;
            const { triggerId } = request.params;
            const body = request.body;
            // Get existing trigger
            const existing = await repository.getTrigger(triggerId, tenantId);
            if (!existing) {
                return reply.status(404).send({
                    error: 'Trigger not found',
                });
            }
            // Don't allow updating system triggers (except isActive)
            if (existing.isSystem && body.isSystem === false) {
                return reply.status(403).send({
                    error: 'Cannot modify system triggers',
                });
            }
            // Update trigger
            const updated = {
                ...existing,
                ...body,
                id: existing.id, // Preserve ID
                tenantId: existing.tenantId, // Preserve tenantId
                createdBy: existing.createdBy, // Preserve createdBy
                createdAt: existing.createdAt, // Preserve createdAt
                isSystem: existing.isSystem, // Preserve isSystem
                triggerCount: existing.triggerCount, // Preserve triggerCount
                updatedAt: new Date(),
            };
            const result = await repository.upsertTrigger(updated);
            return reply.status(200).send(result);
        }
        catch (error) {
            server.log.error({ error }, 'Error updating proactive trigger');
            return reply.status(500).send({
                error: 'Failed to update proactive trigger',
                message: error.message,
            });
        }
    });
    /**
     * DELETE /api/v1/proactive-triggers/:triggerId
     * Delete a trigger
     */
    server.delete('/api/v1/proactive-triggers/:triggerId', {
        onRequest: authGuards,
        schema: deleteTriggerSchema,
    }, async (request, reply) => {
        try {
            const tenantId = request.tenantId;
            const { triggerId } = request.params;
            // Check if trigger exists
            const existing = await repository.getTrigger(triggerId, tenantId);
            if (!existing) {
                return reply.status(404).send({
                    error: 'Trigger not found',
                });
            }
            // Don't allow deleting system triggers
            if (existing.isSystem) {
                return reply.status(403).send({
                    error: 'Cannot delete system triggers',
                });
            }
            await repository.deleteTrigger(triggerId, tenantId);
            return reply.status(204).send();
        }
        catch (error) {
            server.log.error({ error }, 'Error deleting proactive trigger');
            return reply.status(500).send({
                error: 'Failed to delete proactive trigger',
                message: error.message,
            });
        }
    });
    /**
     * POST /api/v1/proactive-triggers/seed
     * Seed default triggers for the authenticated tenant (admin only)
     */
    server.post('/api/v1/proactive-triggers/seed', {
        onRequest: authGuards,
    }, async (request, reply) => {
        try {
            const tenantId = request.tenantId;
            const service = proactiveInsightService || server.proactiveInsightService;
            if (!service) {
                return reply.status(503).send({
                    error: 'Service Unavailable',
                    message: 'Proactive insight service not initialized',
                });
            }
            const results = await service.seedDefaultTriggers(tenantId);
            return reply.status(200).send({
                message: 'Default triggers seeded successfully',
                results,
            });
        }
        catch (error) {
            server.log.error({ error }, 'Error seeding default triggers');
            return reply.status(500).send({
                error: 'Failed to seed default triggers',
                message: error.message,
            });
        }
    });
}
//# sourceMappingURL=proactive-triggers.routes.js.map