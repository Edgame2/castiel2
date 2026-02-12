/**
 * Validation Engine Integration Tests
 * rules CRUD, validation run, runs list/get/results
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

describe('Validation Engine routes', () => {
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

  describe('POST /api/v1/validation/rules', () => {
    it('returns 201 with created rule', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/validation/rules',
        headers: authHeaders,
        payload: {
          name: 'Test Rule',
          type: 'syntax',
          severity: 'error',
          ruleDefinition: { pattern: 'test' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('tenantId', 'tenant-123');
      expect(body).toHaveProperty('name', 'Test Rule');
      expect(body).toHaveProperty('type', 'syntax');
    });

    it('returns 400 when required fields missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/validation/rules',
        headers: authHeaders,
        payload: { name: 'Rule', type: 'syntax' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/validation/rules', () => {
    it('returns 200 with items array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/validation/rules',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
    });
  });

  describe('GET /api/v1/validation/rules/:id', () => {
    it('returns 404 when rule not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/validation/rules/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/validation/run', () => {
    it('returns 201 with validation run', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/validation/run',
        headers: authHeaders,
        payload: {
          target: { type: 'file', path: '/test/file.ts' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('tenantId', 'tenant-123');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('target');
    });

    it('returns 400 when target missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/validation/run',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/validation/runs', () => {
    it('returns 200 with items array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/validation/runs',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
    });
  });

  describe('GET /api/v1/validation/runs/:id', () => {
    it('returns 404 when run not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/validation/runs/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
