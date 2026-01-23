import { vi } from 'vitest';
import Fastify from 'fastify';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { adminDashboardRoutes } from '../../admin-dashboard.routes';
const createMockMonitoring = () => ({
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    trackDependency: vi.fn(),
    trackMetric: vi.fn(),
    trackTrace: vi.fn(),
    flush: vi.fn(),
});
describe('Admin Dashboard routes (integration smoke)', () => {
    const monitoring = createMockMonitoring();
    const fastify = Fastify();
    beforeAll(async () => {
        fastify.addHook('onRequest', async (request, reply) => {
            if (request.url.startsWith('/api/v1') && !request.headers.authorization) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
        });
        await fastify.register(adminDashboardRoutes, { prefix: '/api/v1', monitoring });
        await fastify.ready();
    });
    afterAll(async () => {
        await fastify.close();
    });
    it('GET /api/v1/admin/web-search/providers returns default providers when authorized', async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/api/v1/admin/web-search/providers',
            headers: { authorization: 'Bearer test-token' },
        });
        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(Array.isArray(body.providers)).toBe(true);
        expect(body.providers.length).toBeGreaterThan(0);
        expect(body.providers[0]).toHaveProperty('id');
    });
    it('rejects when missing authorization header', async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/api/v1/admin/web-search/providers',
        });
        expect(response.statusCode).toBe(401);
    });
});
//# sourceMappingURL=admin-dashboard.smoke.test.js.map