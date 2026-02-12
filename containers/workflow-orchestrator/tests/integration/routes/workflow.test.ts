/**
 * Workflow Orchestrator Routes Integration Tests
 * GET /api/v1/workflows, GET /api/v1/workflows/:workflowId, POST retry
 * GET /api/v1/hitl/approvals/:id, POST approve, POST reject
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

vi.mock('../../../src/events/publishers/WorkflowOrchestratorEventPublisher');

describe('Workflow Orchestrator routes', () => {
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

  describe('GET /api/v1/workflows', () => {
    it('returns 200 with workflows and total', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/workflows?opportunityId=opp-123',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('workflows');
      expect(body).toHaveProperty('total');
      expect(Array.isArray(body.workflows)).toBe(true);
    });
  });

  describe('GET /api/v1/workflows/:workflowId', () => {
    it('returns 404 when workflow not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/workflows/non-existent-workflow',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/workflows/:workflowId/retry', () => {
    it('returns 404 or 500 when workflow not found', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/workflows/non-existent-workflow/retry',
        headers: authHeaders,
      });
      expect([404, 500]).toContain(response.statusCode);
    });
  });

  describe('GET /api/v1/hitl/approvals/:id', () => {
    it('returns 404 when approval not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/hitl/approvals/non-existent-id',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/hitl/approvals/:id/approve', () => {
    it('returns 400 when decidedBy missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hitl/approvals/some-id/approve',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/hitl/approvals/:id/reject', () => {
    it('returns 400 when decidedBy missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/hitl/approvals/some-id/reject',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
