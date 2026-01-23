/**
 * Project Sharing & Collaboration Routes
 * Endpoints for managing project sharing, collaborators, and ownership
 */
export async function registerSharingRoutes(fastify, sharingService, activityService) {
    /**
     * POST /api/v1/projects/:projectId/share
     * Share project with a user
     */
    fastify.post('/api/v1/projects/:projectId/share', async (request, reply) => {
        try {
            const { projectId } = request.params;
            const tenantId = request.user.tenantId;
            const userId = request.user.sub;
            const displayName = request.user.name;
            const result = await sharingService.shareWithUser(tenantId, projectId, request.body, userId, displayName);
            reply.code(201).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/projects/bulk-share
     * Share multiple projects with users in bulk
     */
    fastify.post('/api/v1/projects/bulk-share', async (request, reply) => {
        try {
            const tenantId = request.user.tenantId;
            const userId = request.user.sub;
            const displayName = request.user.name;
            const result = await sharingService.bulkShareProjects(tenantId, request.body, userId, displayName);
            reply.code(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/projects/:projectId/collaborators
     * Get all collaborators for a project
     */
    fastify.get('/api/v1/projects/:projectId/collaborators', async (request, reply) => {
        try {
            const { projectId } = request.params;
            const tenantId = request.user.tenantId;
            const collaborators = await sharingService.getCollaborators(tenantId, projectId);
            reply.code(200).send(collaborators);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * DELETE /api/v1/projects/:projectId/collaborators/:userId
     * Revoke user access to project
     */
    fastify.delete('/api/v1/projects/:projectId/collaborators/:userId', async (request, reply) => {
        try {
            const { projectId, userId } = request.params;
            const tenantId = request.user.tenantId;
            const actorId = request.user.sub;
            const actorName = request.user.name;
            const input = {
                userId,
                ...request.body,
            };
            await sharingService.revokeAccess(tenantId, projectId, input, actorId, actorName);
            reply.code(204).send();
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * PATCH /api/v1/projects/:projectId/collaborators/:userId/role
     * Update collaborator role
     */
    fastify.patch('/api/v1/projects/:projectId/collaborators/:userId/role', async (request, reply) => {
        try {
            const { projectId, userId } = request.params;
            const tenantId = request.user.tenantId;
            const actorId = request.user.sub;
            const actorName = request.user.name;
            const input = {
                userId,
                ...request.body,
            };
            const result = await sharingService.updateCollaboratorRole(tenantId, projectId, input, actorId, actorName);
            reply.code(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/projects/:projectId/transfer-ownership
     * Transfer project ownership
     */
    fastify.post('/api/v1/projects/:projectId/transfer-ownership', async (request, reply) => {
        try {
            const { projectId } = request.params;
            const tenantId = request.user.tenantId;
            const actorId = request.user.sub;
            const actorName = request.user.name;
            await sharingService.transferOwnership(tenantId, projectId, request.body, actorId, actorName);
            reply.code(200).send({ message: 'Ownership transferred successfully' });
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/projects/shared-with-me
     * Get projects shared with current user
     */
    fastify.get('/api/v1/projects/shared-with-me', async (request, reply) => {
        try {
            const tenantId = request.user.tenantId;
            const userId = request.user.sub;
            const sharedProjects = await sharingService.getSharedProjects(tenantId, userId);
            reply.code(200).send(sharedProjects);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/admin/sharing/statistics?tenantId=:tenantId
     * Get sharing statistics for a tenant (admin only)
     */
    fastify.get('/api/v1/admin/sharing/statistics', async (request, reply) => {
        try {
            const { tenantId: queryTenantId } = request.query;
            const tenantId = queryTenantId || request.user.tenantId;
            const stats = await sharingService.getSharingStatistics(tenantId);
            reply.code(200).send(stats);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/invitations/:invitationToken/accept
     * Accept pending invitation
     */
    fastify.post('/api/v1/invitations/:invitationToken/accept', async (request, reply) => {
        try {
            const { invitationToken } = request.params;
            const { projectId } = request.body;
            const tenantId = request.user.tenantId;
            const userId = request.user.sub;
            await sharingService.acceptInvitation(tenantId, projectId, userId, invitationToken);
            reply.code(200).send({ message: 'Invitation accepted' });
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/invitations/:invitationToken/decline
     * Decline pending invitation
     */
    fastify.post('/api/v1/invitations/:invitationToken/decline', async (request, reply) => {
        try {
            const { invitationToken } = request.params;
            const { projectId } = request.body;
            const tenantId = request.user.tenantId;
            const userId = request.user.sub;
            await sharingService.declineInvitation(tenantId, projectId, userId, invitationToken);
            reply.code(204).send();
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
}
/**
 * Project Activity Routes
 * Endpoints for activity logging, querying, and reporting
 */
export async function registerActivityRoutes(fastify, activityService) {
    /**
     * GET /api/v1/projects/:projectId/activities?page=1&limit=20&sortBy=timestamp
     * Get project activities with filtering and pagination
     */
    fastify.get('/api/v1/projects/:projectId/activities', async (request, reply) => {
        try {
            const { projectId } = request.params;
            const tenantId = request.user.tenantId;
            const params = {
                page: request.query.page ? parseInt(request.query.page) : 1,
                limit: request.query.limit ? parseInt(request.query.limit) : 20,
                sortBy: request.query.sortBy || 'timestamp',
                sortDirection: request.query.sortDirection || 'desc',
                types: request.query.types
                    ? request.query.types.split(',').map((t) => t.trim())
                    : undefined,
                actorUserId: request.query.actorUserId,
                searchText: request.query.searchText,
            };
            const page = await activityService.getActivities(tenantId, projectId, params);
            reply.code(200).send(page);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/projects/:projectId/activities/recent?limit=10
     * Get recent activities (cached)
     */
    fastify.get('/api/v1/projects/:projectId/activities/recent', async (request, reply) => {
        try {
            const { projectId } = request.params;
            const tenantId = request.user.tenantId;
            const limit = request.query.limit ? parseInt(request.query.limit) : 10;
            const summaries = await activityService.getRecentActivities(tenantId, projectId, limit);
            reply.code(200).send(summaries);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/projects/:projectId/activities/statistics?days=30
     * Get activity statistics
     */
    fastify.get('/api/v1/projects/:projectId/activities/statistics', async (request, reply) => {
        try {
            const { projectId } = request.params;
            const tenantId = request.user.tenantId;
            const days = request.query.days ? parseInt(request.query.days) : 30;
            const stats = await activityService.getStatistics(tenantId, projectId, { days });
            reply.code(200).send(stats);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/projects/:projectId/activities/export?format=csv
     * Export activities
     */
    fastify.get('/api/v1/projects/:projectId/activities/export', async (request, reply) => {
        try {
            const { projectId } = request.params;
            const tenantId = request.user.tenantId;
            const format = request.query.format || 'csv';
            if (!['csv', 'json', 'pdf'].includes(format)) {
                return reply.code(400).send({ error: 'Invalid format. Must be csv, json, or pdf.' });
            }
            const exported = await activityService.exportActivities(tenantId, projectId, format);
            reply
                .type(exported.mimeType)
                .header('Content-Disposition', `attachment; filename="${exported.filename}"`)
                .send(exported.data);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(400).send({ error: error.message });
        }
    });
}
//# sourceMappingURL=sharing.routes.js.map