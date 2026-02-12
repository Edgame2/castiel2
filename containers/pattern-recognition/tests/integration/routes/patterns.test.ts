/**
 * Pattern Recognition Integration Tests
 * pattern CRUD, pattern scan, scans list/get, matches
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

describe('Pattern Recognition routes', () => {
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

  describe('POST /api/v1/patterns', () => {
    it('returns 201 with created pattern', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patterns',
        headers: authHeaders,
        payload: {
          name: 'Test Pattern',
          type: 'design_pattern',
          patternDefinition: { regex: 'test' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('tenantId', 'tenant-123');
      expect(body).toHaveProperty('name', 'Test Pattern');
      expect(body).toHaveProperty('type', 'design_pattern');
    });

    it('returns 400 when required fields missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patterns',
        headers: authHeaders,
        payload: { name: 'Pattern' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/patterns', () => {
    it('returns 200 with items array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patterns',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
    });
  });

  describe('GET /api/v1/patterns/:id', () => {
    it('returns 404 when pattern not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patterns/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/patterns/:id', () => {
    it('returns 404 when pattern not found', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/patterns/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
        payload: { name: 'Updated' },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/patterns/:id', () => {
    it('returns 404 when pattern not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/patterns/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/patterns/scan', () => {
    it('returns 201 with scan', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patterns/scan',
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
        url: '/api/v1/patterns/scan',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/patterns/scans', () => {
    it('returns 200 with items array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patterns/scans',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
    });
  });

  describe('GET /api/v1/patterns/scans/:id', () => {
    it('returns 404 when scan not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patterns/scans/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/patterns/scans/:id/matches', () => {
    it('returns 200 with empty array when no matches', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patterns/scans/00000000-0000-0000-0000-000000000000/matches',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });
  });
});
