/**
 * Integration tests for GET /api/v1/prompts/analytics.
 * Validates auth/tenant, response schema, and analytics shape per plan §6.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coder/shared')>();
  return {
    ...actual,
    initializeDatabase: vi.fn(),
    connectDatabase: vi.fn().mockResolvedValue(undefined),
    disconnectDatabase: vi.fn().mockResolvedValue(undefined),
    authenticateRequest: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
    tenantEnforcementMiddleware: vi.fn(() => async (req: any) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'test-tenant' };
    }),
    setupJWT: vi.fn(),
  };
});

describe('GET /api/v1/prompts/analytics', () => {
  let app: FastifyInstance;
  const authHeaders = {
    authorization: 'Bearer test-token',
    'x-tenant-id': 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
  };

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and analytics shape (totalPrompts, byStatus, byCategory)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/prompts/analytics',
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('totalPrompts');
    expect(body).toHaveProperty('byStatus');
    expect(body).toHaveProperty('byCategory');
    expect(typeof body.totalPrompts).toBe('number');
    expect(body.byStatus).toEqual(expect.any(Object));
    expect(body.byCategory).toEqual(expect.any(Object));
  });

});
