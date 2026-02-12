/**
 * Signal Intelligence routes integration tests (Plan §24).
 * POST /api/v1/signals/analyze
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';

describe('Signal Intelligence routes (integration)', () => {
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

  it('POST /api/v1/signals/analyze returns 201', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/signals/analyze',
      headers: authHeaders,
      payload: { signalType: 'communication', source: 'test', data: {} },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as any;
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('signalType', 'communication');
    expect(body).toHaveProperty('analyzed');
  });
});
