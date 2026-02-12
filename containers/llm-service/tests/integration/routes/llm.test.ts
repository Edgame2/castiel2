/**
 * LLM Service Integration Tests
 * Plan §17: explain, recommendations, scenarios, summary, playbook, reactivation/strategy
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

describe('LLM Service routes', () => {
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

  const basePayload = { opportunityId: 'opp-123' };

  describe('POST /api/v1/llm/explain', () => {
    it('returns 200 with text', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/llm/explain',
        headers: authHeaders,
        payload: basePayload,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('text');
      expect(body.text).toContain('opp-123');
    });
  });

  describe('POST /api/v1/llm/recommendations', () => {
    it('returns 200 with recommendations', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/llm/recommendations',
        headers: authHeaders,
        payload: basePayload,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('recommendations');
      expect(Array.isArray(body.recommendations)).toBe(true);
    });
  });

  describe('POST /api/v1/llm/scenarios', () => {
    it('returns 200 with scenarios', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/llm/scenarios',
        headers: authHeaders,
        payload: basePayload,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('scenarios');
      expect(Array.isArray(body.scenarios)).toBe(true);
    });
  });

  describe('POST /api/v1/llm/summary', () => {
    it('returns 200 with text', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/llm/summary',
        headers: authHeaders,
        payload: basePayload,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('text');
      expect(body.text).toContain('opp-123');
    });
  });

  describe('POST /api/v1/llm/playbook', () => {
    it('returns 200 with text', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/llm/playbook',
        headers: authHeaders,
        payload: basePayload,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('text');
      expect(body.text).toContain('opp-123');
    });
  });

  describe('POST /api/v1/llm/reactivation/strategy', () => {
    it('returns 200 with reactivationStrategy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/llm/reactivation/strategy',
        headers: authHeaders,
        payload: basePayload,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('reactivationStrategy');
      expect(body.reactivationStrategy).toHaveProperty('priority');
      expect(body.reactivationStrategy).toHaveProperty('immediateActions');
    });
  });

  describe('validation', () => {
    it('returns 400 when opportunityId missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/llm/explain',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
