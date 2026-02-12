/**
 * AI Service routes integration tests (Plan §20).
 * Completions, models, agents – paths match gateway stripPrefix /api/ai.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

describe('AI Service routes (integration)', () => {
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

  it('POST /completions returns 200', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/completions',
      headers: authHeaders,
      payload: { messages: [{ role: 'user', content: 'Hi' }] },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('choices');
  });

  it('GET /models returns 200', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/models',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('models');
  });

  it('GET /models/:id returns 200', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/models/gpt-4',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: 'gpt-4' });
  });

  it('GET /models/:id returns 404 for unknown id', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/models/unknown-model',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(404);
  });

  it('GET /agents returns 200', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/agents',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('items');
  });

  it('POST /agents/:id/execute returns 201', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/agents/agent-1/execute',
      headers: authHeaders,
      payload: { input: {} },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toHaveProperty('execution');
  });
});
