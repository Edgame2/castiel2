/**
 * Workflow Orchestrator Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies are set up in tests/setup.ts
vi.mock('@coder/shared/database');
vi.mock('@coder/shared');
vi.mock('../../../src/events/publishers/WorkflowOrchestratorEventPublisher');

describe('POST /api/v1/workflow/orchestrator/opportunity-analysis', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should start opportunity analysis workflow and return 202', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/workflow/orchestrator/opportunity-analysis',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        opportunityId: 'opp-123',
        trigger: 'manual',
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('workflowId');
  });

  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/workflow/orchestrator/opportunity-analysis',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        // Missing required fields
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/v1/workflow/orchestrator/workflows/:workflowId', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve workflow and return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/workflow/orchestrator/workflows/workflow-123',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('workflowId');
  });

  it('should return 404 for non-existent workflow', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/workflow/orchestrator/workflows/non-existent',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
