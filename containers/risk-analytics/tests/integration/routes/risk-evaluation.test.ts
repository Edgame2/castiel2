/**
 * Risk Analytics Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies are set up in tests/setup.ts
vi.mock('@coder/shared/database');
vi.mock('@coder/shared');
vi.mock('../../../src/events/publishers/RiskAnalyticsEventPublisher');

describe('POST /api/v1/risk-analytics/evaluate', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should evaluate risk and return 200', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/risk-analytics/evaluate',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        opportunityId: 'opp-123',
        industryId: 'industry-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('opportunityId');
    expect(body.data).toHaveProperty('detectedRisks');
  });

  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/risk-analytics/evaluate',
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

describe('POST /api/v1/risk-analytics/score', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should score risk and return 200', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/risk-analytics/score',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        opportunityId: 'opp-123',
        detectedRisks: [
          {
            riskId: 'risk-1',
            probability: 0.5,
            impact: 'high',
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('overallRiskScore');
  });
});
