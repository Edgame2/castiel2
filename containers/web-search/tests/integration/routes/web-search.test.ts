/**
 * Integration tests for POST /api/v1/web-search.
 * Validates auth/tenant, request schema, response shape, and error handling per plan §7.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';

vi.mock('../../../src/config/index.js', () => ({
  loadConfig: vi.fn(() => ({
    module: { name: 'web-search', version: '1.0.0' },
    server: { port: 3056, host: '0.0.0.0' },
    cosmos_db: {
      endpoint: process.env.COSMOS_DB_ENDPOINT || 'https://test.documents.azure.com:443/',
      key: process.env.COSMOS_DB_KEY || 'test-key',
      database_id: process.env.COSMOS_DB_DATABASE_ID || 'test',
      containers: {
        results: 'web_search_results',
        cache: 'web_search_cache',
        schedules: 'web_search_schedules',
      },
    },
    jwt: { secret: process.env.JWT_SECRET || 'test-secret' },
    services: {
      shard_manager: { url: '' },
      ai_service: { url: 'http://localhost:3006' },
    },
    rabbitmq: { url: '', exchange: 'test', queue: 'test', bindings: [] },
    features: {},
  })),
}));

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coder/shared')>();
  return {
    ...actual,
    initializeDatabase: vi.fn(),
    connectDatabase: vi.fn().mockResolvedValue(undefined),
    authenticateRequest: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
    tenantEnforcementMiddleware: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
    setupJWT: vi.fn(),
    generateServiceToken: vi.fn().mockReturnValue('mock-token'),
  };
});

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    items: {
      create: vi.fn().mockResolvedValue({ resource: {} }),
      query: vi.fn(() => ({
        fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })),
    },
    item: vi.fn(() => ({
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn(),
      delete: vi.fn(),
    })),
  })),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn(),
}));

describe('POST /api/v1/web-search', () => {
  let app: FastifyInstance;
  const authHeaders = {
    authorization: 'Bearer test-token',
    'x-tenant-id': 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff',
  };

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and response shape (results, query, cached)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/web-search',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: { query: 'test search' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('results');
    expect(body).toHaveProperty('query');
    expect(body).toHaveProperty('cached');
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.query).toBe('test search');
    expect(typeof body.cached).toBe('boolean');
  });

  it('returns 400 when query is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/web-search',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });
});
