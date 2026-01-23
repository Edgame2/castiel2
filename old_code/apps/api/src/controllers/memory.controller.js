/**
 * Memory Controller
 *
 * Handles HTTP requests for AI chat memory management
 * Supports explicit memory management (remember/forget) and memory search
 */
import { getUser } from '../middleware/authenticate.js';
import { AppError } from '../middleware/error-handler.js';
export class MemoryController {
    memoryService;
    constructor(memoryService) {
        this.memoryService = memoryService;
    }
    /**
     * POST /api/v1/memory/remember
     * Remember explicit information
     */
    async remember(request, reply) {
        try {
            const user = getUser(request);
            const body = request.body;
            if (!body.information || body.information.trim().length === 0) {
                throw new AppError('Information is required', 400);
            }
            const fact = await this.memoryService.remember(user.id, user.tenantId, body.information.trim(), {
                subject: body.subject,
                category: body.category,
                confidence: body.confidence,
            });
            reply.status(201).send({
                fact,
                message: 'Information remembered successfully',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to remember information');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to remember information',
            });
        }
    }
    /**
     * POST /api/v1/memory/forget
     * Forget information matching a query
     */
    async forget(request, reply) {
        try {
            const user = getUser(request);
            const body = request.body;
            if (!body.query || body.query.trim().length === 0) {
                throw new AppError('Query is required', 400);
            }
            const result = await this.memoryService.forget(user.id, user.tenantId, body.query.trim());
            reply.status(200).send({
                removed: result.removed,
                facts: result.facts,
                message: `Forgot ${result.removed} fact(s)`,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to forget information');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to forget information',
            });
        }
    }
    /**
     * GET /api/v1/memory/search
     * Search user memory
     */
    async search(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            if (!query.q || query.q.trim().length === 0) {
                throw new AppError('Search query is required', 400);
            }
            const facts = await this.memoryService.searchUserMemory(user.id, user.tenantId, query.q.trim(), {
                category: query.category,
                limit: query.limit ? parseInt(query.limit, 10) : undefined,
            });
            reply.status(200).send({
                facts,
                count: facts.length,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to search memory');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to search memory',
            });
        }
    }
    /**
     * GET /api/v1/memory/facts
     * List all user facts
     */
    async listFacts(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            const result = await this.memoryService.listUserFacts(user.id, user.tenantId, {
                category: query.category,
                limit: query.limit ? parseInt(query.limit, 10) : undefined,
                offset: query.offset ? parseInt(query.offset, 10) : undefined,
            });
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list facts');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to list facts',
            });
        }
    }
    /**
     * DELETE /api/v1/memory/facts/:factId
     * Remove a specific fact
     */
    async removeFact(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            if (!params.factId) {
                throw new AppError('Fact ID is required', 400);
            }
            const removed = await this.memoryService.removeUserFact(user.id, user.tenantId, params.factId);
            if (!removed) {
                throw new AppError('Fact not found', 404);
            }
            reply.status(200).send({
                success: true,
                message: 'Fact removed successfully',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to remove fact');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to remove fact',
            });
        }
    }
    /**
     * GET /api/v1/memory
     * Get user memory summary
     */
    async getMemory(request, reply) {
        try {
            const user = getUser(request);
            const memory = await this.memoryService.getUserMemory(user.id, user.tenantId);
            reply.status(200).send({
                userId: memory.userId,
                tenantId: memory.tenantId,
                preferences: memory.preferences,
                factCount: memory.facts.length,
                recentTopics: memory.recentTopics,
                recentShards: memory.recentShards,
                stats: memory.stats,
                updatedAt: memory.updatedAt,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get memory');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get memory',
            });
        }
    }
    /**
     * DELETE /api/v1/memory
     * Clear all user memory (for privacy/GDPR)
     */
    async clearMemory(request, reply) {
        try {
            const user = getUser(request);
            await this.memoryService.clearUserMemory(user.id, user.tenantId);
            reply.status(200).send({
                success: true,
                message: 'Memory cleared successfully',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to clear memory');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to clear memory',
            });
        }
    }
}
//# sourceMappingURL=memory.controller.js.map