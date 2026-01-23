import { ContextTemplateService } from '../services/context-template.service.js';
// AuthContext is already declared in types/fastify.d.ts
/**
 * Context Template Controller
 * Handles AI context assembly and template management
 */
export class ContextTemplateController {
    templateService;
    monitoring;
    constructor(monitoring, shardRepository, shardTypeRepository, relationshipService, redis) {
        this.monitoring = monitoring;
        this.templateService = new ContextTemplateService(monitoring, shardRepository, shardTypeRepository, relationshipService, redis);
    }
    /**
     * POST /api/v1/ai/context
     * Assemble context for a shard using a template
     */
    assembleContext = async (req, reply) => {
        const startTime = Date.now();
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { shardId, templateId, assistantId, debug, maxTokensOverride, skipCache } = req.body;
            if (!shardId) {
                return reply.status(400).send({ error: 'shardId is required' });
            }
            const options = {
                templateId,
                assistantId,
                debug,
                maxTokensOverride,
                skipCache,
            };
            const result = await this.templateService.assembleContext(shardId, tenantId, options);
            this.monitoring.trackMetric('api.context.assemble.duration', Date.now() - startTime);
            if (!result.success) {
                return reply.status(400).send({ error: result.error });
            }
            return reply.status(200).send(result);
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context.assemble' });
            return reply.status(500).send({ error: 'Failed to assemble context', details: error.message });
        }
    };
    /**
     * GET /api/v1/ai/templates
     * List available context templates
     */
    listTemplates = async (req, reply) => {
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { category, applicableShardType, includeSystem } = req.query;
            const templates = await this.templateService.listTemplates(tenantId, {
                category,
                applicableShardType,
                includeSystem: includeSystem !== false,
            });
            return reply.status(200).send({
                templates: templates.map(t => ({
                    id: t.id,
                    ...t.structuredData,
                })),
                count: templates.length,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context.listTemplates' });
            return reply.status(500).send({ error: 'Failed to list templates', details: error.message });
        }
    };
    /**
     * GET /api/v1/ai/templates/:id
     * Get a specific template
     */
    getTemplate = async (req, reply) => {
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const template = await this.templateService.getTemplateById(id, tenantId);
            if (!template) {
                return reply.status(404).send({ error: 'Template not found' });
            }
            return reply.status(200).send({
                id: template.id,
                ...template.structuredData,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context.getTemplate' });
            return reply.status(500).send({ error: 'Failed to get template', details: error.message });
        }
    };
    /**
     * GET /api/v1/ai/templates/system
     * Get system template definitions
     */
    getSystemTemplates = async (req, reply) => {
        try {
            const templates = this.templateService.getSystemTemplates();
            return reply.status(200).send({
                templates,
                count: templates.length,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context.getSystemTemplates' });
            return reply.status(500).send({ error: 'Failed to get system templates', details: error.message });
        }
    };
    /**
     * POST /api/v1/ai/templates/select
     * Select the appropriate template for a shard
     */
    selectTemplate = async (req, reply) => {
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { shardId, shardTypeName, preferredTemplateId, assistantId } = req.body;
            if (!shardTypeName && !shardId) {
                return reply.status(400).send({ error: 'Either shardId or shardTypeName is required' });
            }
            const template = await this.templateService.selectTemplate(tenantId, {
                preferredTemplateId,
                assistantId,
                shardTypeName,
            });
            if (!template) {
                return reply.status(404).send({ error: 'No suitable template found' });
            }
            return reply.status(200).send({
                id: template.id,
                ...template.structuredData,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context.selectTemplate' });
            return reply.status(500).send({ error: 'Failed to select template', details: error.message });
        }
    };
    /**
     * DELETE /api/v1/ai/context/cache/:shardId
     * Invalidate cached context for a shard
     */
    invalidateCache = async (req, reply) => {
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = req.params;
            await this.templateService.invalidateCache(shardId, tenantId);
            return reply.status(204).send();
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context.invalidateCache' });
            return reply.status(500).send({ error: 'Failed to invalidate cache', details: error.message });
        }
    };
    /**
     * Get the template service for external use
     */
    getService() {
        return this.templateService;
    }
}
//# sourceMappingURL=context-template.controller.js.map