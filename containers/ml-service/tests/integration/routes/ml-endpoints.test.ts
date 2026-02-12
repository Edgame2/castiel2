/**
 * Integration tests for GET /api/v1/ml/endpoints and GET /api/v1/ml/endpoints/:id.
 * Plan §5: list/get with real data shape; auth + tenant enforced.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';

vi.mock('../../../src/events/publishers/MLServiceEventPublisher.js', () => ({
  initializeEventPublisher: vi.fn().mockResolvedValue(undefined),
  closeEventPublisher: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coder/shared')>();
  return {
    ...actual,
    connectDatabase: vi.fn().mockResolvedValue(undefined),
    authenticateRequest: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'u1', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
    tenantEnforcementMiddleware: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'u1', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
  };
});

describe('ML endpoints routes', () => {
  let app: FastifyInstance;
  const authHeaders = {
    authorization: 'Bearer test-token',
    'x-tenant-id': '11111111-2222-3333-4444-555555555555',
  };

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/ml/endpoints', () => {
    it('returns 200 with items array and timestamp', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ml/endpoints',
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/ml/endpoints/:id', () => {
    it('returns 404 when endpoint id is not configured', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ml/endpoints/nonexistent-endpoint-id',
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body).toHaveProperty('error');
      expect(body.error?.code).toBe('ENDPOINT_NOT_FOUND');
    });
  });
});
