/**
 * Reasoning Engine Integration Tests
 * POST /reasoning/reason, GET /reasoning/tasks, GET /reasoning/tasks/:id, POST /reasoning/tasks/:id/cancel
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

describe('Reasoning Engine routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeaders = {
    authorization: 'Bearer test-token',
    'x-tenant-id': 'tenant-123',
  };

  describe('POST /api/v1/reasoning/reason', () => {
    it('returns 200 with reasoning result', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reasoning/reason',
        headers: authHeaders,
        payload: { query: 'What is 2+2?' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('reasoning');
      expect(body).toHaveProperty('conclusion');
      expect(body).toHaveProperty('confidence');
    });

    it('returns 400 when query is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reasoning/reason',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/reasoning/tasks', () => {
    it('returns 201 with created task', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reasoning/tasks',
        headers: authHeaders,
        payload: {
          type: 'chain_of_thought',
          input: { query: 'Analyze this' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('tenantId', 'tenant-123');
      expect(body).toHaveProperty('type', 'chain_of_thought');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('input');
    });

    it('returns 400 when type or input.query is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reasoning/tasks',
        headers: authHeaders,
        payload: { type: 'chain_of_thought', input: {} },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/reasoning/tasks', () => {
    it('returns 200 with items array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/reasoning/tasks',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
    });
  });

  describe('GET /api/v1/reasoning/tasks/:id', () => {
    it('returns 404 when task not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/reasoning/tasks/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/reasoning/tasks/:id/cancel', () => {
    it('returns 400 or 404 for non-existent task', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reasoning/tasks/00000000-0000-0000-0000-000000000000/cancel',
        headers: authHeaders,
      });
      expect([400, 404]).toContain(response.statusCode);
    });
  });
});
