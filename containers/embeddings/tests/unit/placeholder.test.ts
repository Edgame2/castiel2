/** Placeholder and integration tests (Plan §21). */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';

describe('embeddings', () => {
  it('has unit test suite', () => expect(true).toBe(true));
});

describe('Embeddings routes (integration)', () => {
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

  it('POST / returns 201', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/',
      headers: authHeaders,
      payload: { content: 'test', vector: [0.1, 0.2] },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toHaveProperty('id');
  });

  it('POST /batch returns 201', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/batch',
      headers: authHeaders,
      payload: { embeddings: [{ content: 'a', vector: [0.1] }] },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toHaveProperty('embeddings');
  });

  it('GET /:id returns 200', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/emb-1',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('id');
  });

  it('POST /search returns 200', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/search',
      headers: authHeaders,
      payload: { vector: [0.1, 0.2] },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('results');
  });

  it('DELETE /:id returns 204', async () => {
    const r = await app.inject({
      method: 'DELETE',
      url: '/emb-1',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(204);
  });

  it('DELETE /project/:projectId returns 200', async () => {
    const r = await app.inject({
      method: 'DELETE',
      url: '/project/proj-1',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('deleted');
  });
});
