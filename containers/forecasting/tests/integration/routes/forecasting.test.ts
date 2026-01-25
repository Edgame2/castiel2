/**
 * Forecasting Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies are set up in tests/setup.ts
vi.mock('@coder/shared/database');
vi.mock('@coder/shared');
vi.mock('../../../src/events/publishers/ForecastingEventPublisher');

describe('POST /api/v1/forecasting/generate', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate forecast and return 200', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/forecasting/generate',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        opportunityId: 'opp-123',
        timeframe: 'quarter',
        includeDecomposition: true,
        includeConsensus: true,
        includeCommitment: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('forecastId');
    expect(body.data).toHaveProperty('revenueForecast');
  });

  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/forecasting/generate',
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

describe('GET /api/v1/forecasting/:forecastId', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve forecast and return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/forecasting/forecast-123',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('forecastId');
  });

  it('should return 404 for non-existent forecast', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/forecasting/non-existent',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
