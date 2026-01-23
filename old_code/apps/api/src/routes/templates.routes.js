/**
 * Project Template Routes
 * Endpoints for template management, gallery, and instantiation
 */
export async function registerTemplateRoutes(fastify, templateService) {
    /**
     * POST /api/v1/admin/templates
     * Create new template (super admin only)
     */
    fastify.post('/api/v1/admin/templates', async (request, reply) => {
        try {
            // Verify super admin role
            if (request.user.roles?.includes('super-admin') !== true) {
                return reply.code(403).send({ error: 'Only super admins can create templates' });
            }
            const result = await templateService.createTemplate(request.user.tenantId, request.body, request.user.sub);
            reply.code(201).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * PATCH /api/v1/admin/templates/:templateId
     * Update template (super admin only)
     */
    fastify.patch('/api/v1/admin/templates/:templateId', async (request, reply) => {
        try {
            if (request.user.roles?.includes('super-admin') !== true) {
                return reply.code(403).send({ error: 'Only super admins can update templates' });
            }
            const result = await templateService.updateTemplate(request.params.templateId, request.body, request.user.sub);
            reply.code(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * DELETE /api/v1/admin/templates/:templateId
     * Delete template (super admin only)
     */
    fastify.delete('/api/v1/admin/templates/:templateId', async (request, reply) => {
        try {
            if (request.user.roles?.includes('super-admin') !== true) {
                return reply.code(403).send({ error: 'Only super admins can delete templates' });
            }
            await templateService.deleteTemplate(request.params.templateId);
            reply.code(204).send();
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/templates/gallery?category=SALES&limit=20
     * Get template gallery with filtering
     */
    fastify.get('/api/v1/templates/gallery', async (request, reply) => {
        try {
            const tenantId = request.user.tenantId;
            const params = {
                category: request.query.category,
                tags: request.query.tags ? request.query.tags.split(',') : undefined,
                searchText: request.query.searchText,
                difficulty: request.query.difficulty,
                page: request.query.page ? parseInt(request.query.page) : 1,
                limit: request.query.limit ? parseInt(request.query.limit) : 20,
                sortBy: request.query.sortBy,
                sortDirection: request.query.sortDirection,
            };
            const result = await templateService.getTemplateGallery(tenantId, params);
            reply.code(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/templates/:templateId
     * Get template by ID
     */
    fastify.get('/api/v1/templates/:templateId', async (request, reply) => {
        try {
            const template = await templateService.getTemplate(request.params.templateId);
            if (!template) {
                return reply.code(404).send({ error: 'Template not found' });
            }
            reply.code(200).send(template);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/templates/:templateId/preview
     * Get template preview with full details
     */
    fastify.get('/api/v1/templates/:templateId/preview', async (request, reply) => {
        try {
            const preview = await templateService.getTemplatePreview(request.params.templateId);
            if (!preview) {
                return reply.code(404).send({ error: 'Template not found' });
            }
            reply.code(200).send(preview);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/templates/:templateId/instantiate
     * Create new project from template
     */
    fastify.post('/api/v1/templates/:templateId/instantiate', async (request, reply) => {
        try {
            const tenantId = request.user.tenantId;
            const userId = request.user.sub;
            const displayName = request.user.name;
            const result = await templateService.instantiateTemplate(tenantId, request.params.templateId, request.body, userId, displayName);
            reply.code(201).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/templates/:templateId/instantiate-batch
     * Create multiple projects from template
     */
    fastify.post('/api/v1/templates/:templateId/instantiate-batch', async (request, reply) => {
        try {
            const tenantId = request.user.tenantId;
            const userId = request.user.sub;
            const displayName = request.user.name;
            const result = await templateService.batchInstantiateTemplate(tenantId, request.params.templateId, request.body, userId, displayName);
            reply.code(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/admin/templates/:templateId/statistics
     * Get template usage statistics
     */
    fastify.get('/api/v1/admin/templates/:templateId/statistics', async (request, reply) => {
        try {
            const stats = await templateService.getTemplateStats(request.params.templateId);
            if (!stats) {
                return reply.code(404).send({ error: 'Template not found' });
            }
            reply.code(200).send(stats);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/templates/instances/:instanceId/setup-items/:itemId/complete
     * Mark setup item as complete
     */
    fastify.post('/api/v1/templates/instances/:instanceId/setup-items/:itemId/complete', async (request, reply) => {
        try {
            const tenantId = request.user.tenantId;
            await templateService.completeSetupItem(tenantId, request.params.instanceId, request.params.itemId);
            reply.code(200).send({ message: 'Setup item completed' });
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
}
//# sourceMappingURL=templates.routes.js.map