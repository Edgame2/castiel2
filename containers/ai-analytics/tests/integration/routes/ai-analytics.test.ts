/**
 * AI Analytics routes integration tests (Plan §23).
 * GET /api/v1/ai-analytics/models
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

describe('AI Analytics routes (integration)', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  const authHeaders = {
    authorization: 'Bearer test-token',
    'x-tenant-id': 'tenant-123',
  };

  it('GET /api/v1/ai-analytics/models returns 200', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/api/v1/ai-analytics/models',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('models');
    expect(Array.isArray((r.json() as any).models)).toBe(true);
  });
});
