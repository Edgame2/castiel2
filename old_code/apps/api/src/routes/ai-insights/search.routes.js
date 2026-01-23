import { z } from 'zod';
import { requireAuth } from '../../middleware/authorization.js';
import { WebSearchService } from '../../services/ai-insights/web-search.service.js';
import { AIInsightsCosmosService } from '../../services/ai-insights/cosmos.service.js';
const searchBodySchema = z.object({
    query: z.string().min(1),
    deepSearch: z.boolean().optional(),
    maxPages: z.number().int().min(1).max(10).optional(),
    projectId: z.string().optional(),
    searchType: z.enum(['web', 'news', 'finance', 'bing']).optional(),
});
export async function registerInsightsSearchRoutes(fastify, options) {
    const cosmos = new AIInsightsCosmosService(options.monitoring);
    const webSearchService = new WebSearchService(options.monitoring, cosmos, {
        serpApiKey: process.env.SERPAPI_API_KEY,
        azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAiApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME_EMBEDDING || 'text-embedding-ada-002',
    });
    // POST /api/v1/insights/search
    fastify.post('/insights/search', { preHandler: requireAuth() }, async (request, reply) => {
        const body = searchBodySchema.parse(request.body);
        const user = request.user || { sub: 'anonymous' };
        const tenantId = user.tenantId || user.tenant || 'tenant-default';
        const opts = {
            tenantId,
            userId: user.sub,
            projectId: body.projectId,
            deepSearch: body.deepSearch,
            maxPages: body.maxPages,
            searchType: body.searchType,
        };
        const result = await webSearchService.search(body.query, opts);
        return reply.code(200).send(result);
    });
    // GET /api/v1/insights/search/:shardId
    fastify.get('/insights/search/:shardId', { preHandler: requireAuth() }, async (request, reply) => {
        const { shardId } = request.params;
        const queryHash = request.query?.queryHash;
        const user = request.user || { tenantId: 'tenant-default' };
        if (!queryHash) {
            return reply.code(400).send({ error: 'queryHash is required for partition lookup' });
        }
        const container = cosmos.getSearchContainer();
        const doc = await cosmos.read(container, shardId, [user.tenantId, queryHash, shardId]);
        if (!doc) {
            return reply.code(404).send({ error: 'Not found' });
        }
        return reply.send(doc);
    });
    // POST /api/v1/chat/search (async-friendly, returns quick acknowledgement)
    fastify.post('/chat/search', { preHandler: requireAuth() }, async (request, reply) => {
        const body = searchBodySchema.parse(request.body);
        const user = request.user || { sub: 'anonymous', tenantId: 'tenant-default' };
        const opts = {
            tenantId: user.tenantId,
            userId: user.sub,
            projectId: body.projectId,
            deepSearch: true,
            maxPages: body.maxPages ?? 3,
            searchType: body.searchType,
        };
        const result = await webSearchService.search(body.query, opts);
        return reply.code(202).send({ jobId: result.searchId, status: 'started', ...result });
    });
    // POST /api/v1/recurring-search
    fastify.post('/recurring-search', { preHandler: requireAuth() }, async (request, reply) => {
        const body = searchBodySchema.extend({ schedule: z.string().optional() }).parse(request.body);
        const user = request.user || { sub: 'anonymous', tenantId: 'tenant-default' };
        const opts = {
            tenantId: user.tenantId,
            userId: user.sub,
            projectId: body.projectId,
            deepSearch: body.deepSearch,
            maxPages: body.maxPages,
            searchType: body.searchType,
        };
        const result = await webSearchService.search(body.query, opts);
        return reply.code(201).send({ ...result, schedule: body.schedule || 'ad-hoc' });
    });
}
//# sourceMappingURL=search.routes.js.map