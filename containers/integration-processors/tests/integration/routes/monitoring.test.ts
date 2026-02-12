/**
 * Integration tests for admin monitoring routes (integrations, errors, performance).
 * Validates auth/tenant middleware and response shape per plan §4.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/index.js';

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coder/shared')>();
  return {
    ...actual,
    authenticateRequest: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
    tenantEnforcementMiddleware: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
    setupJWT: vi.fn(),
  };
});

vi.mock('../../../src/config/index.js', () => ({
  loadConfig: vi.fn(() => ({
    jwt: { secret: 'test-secret' },
    server: { port: 3010, host: '0.0.0.0' },
    services: {
      shard_manager: { url: 'http://localhost:9999' },
      integration_manager: { url: 'http://localhost:9998' },
    },
    rabbitmq: { url: '', exchange: '', queues: {}, dlq: { alert_threshold: 100 } },
    azure: {},
    cosmos_db: { endpoint: '', key: '', database_id: 'test', containers: {} },
  })),
}));

describe('Admin monitoring routes', () => {
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

  describe('GET /api/v1/admin/monitoring/integrations', () => {
    it('returns 200 and integrations array', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/monitoring/integrations',
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('integrations');
      expect(Array.isArray(body.integrations)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/monitoring/errors', () => {
    it('returns 200 and errors shape', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/monitoring/errors',
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('errors');
      expect(body).toHaveProperty('totalErrors');
      expect(body).toHaveProperty('errorRate');
      expect(Array.isArray(body.errors)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/monitoring/performance', () => {
    it('returns 200 and metrics shape', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/monitoring/performance',
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('metrics');
      expect(body.metrics).toHaveProperty('avgProcessingTime');
      expect(body.metrics).toHaveProperty('throughput');
      expect(body.metrics).toHaveProperty('successRate');
      expect(body.metrics).toHaveProperty('byProcessorType');
      expect(body.metrics.byProcessorType).toHaveProperty('light');
      expect(body.metrics.byProcessorType).toHaveProperty('heavy');
    });
  });
});
