/**
 * Risk Analytics Routes Integration Tests
 * Aligned with implemented routes: POST /api/v1/risk/evaluations (no /api/v1/risk-analytics/evaluate or /score).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

vi.mock('../../../src/events/publishers/RiskAnalyticsEventPublisher');

describe('POST /api/v1/risk/evaluations', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should evaluate risk and return 202 with evaluation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/risk/evaluations',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        opportunityId: 'opp-123',
        options: {},
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body).toHaveProperty('evaluationId');
    expect(body).toHaveProperty('status', 'completed');
    expect(body).toHaveProperty('evaluation');
    expect(body.evaluation).toHaveProperty('opportunityId', 'opp-123');
  });

  it('should return 400 for missing opportunityId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/risk/evaluations',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});
