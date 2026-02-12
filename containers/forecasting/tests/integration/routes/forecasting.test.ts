/**
 * Forecasting Routes Integration Tests
 * GET /api/v1/forecasts/:period/scenarios, risk-adjusted, ml
 * GET /api/v1/forecasts, GET /api/v1/forecasts/:forecastId
 * POST /api/v1/forecasts, POST /api/v1/accuracy/actuals
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

vi.mock('../../../src/events/publishers/ForecastingEventPublisher');

describe('Forecasting routes', () => {
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

  describe('GET /api/v1/forecasts/:period/scenarios', () => {
    it('returns 200 with period and scenarios', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/forecasts/Q1-2025/scenarios',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('scenarios');
      expect(Array.isArray(body.scenarios)).toBe(true);
    });
  });

  describe('GET /api/v1/forecasts/:period/risk-adjusted', () => {
    it('returns 200 with forecast data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/forecasts/Q1-2025/risk-adjusted',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('forecast');
      expect(body).toHaveProperty('riskAdjustedForecast');
    });
  });

  describe('GET /api/v1/forecasts/:period/ml', () => {
    it('returns 200 with ML forecast', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/forecasts/Q1-2025/ml',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('pointForecast');
      expect(body).toHaveProperty('modelId');
    });
  });

  describe('GET /api/v1/forecasts', () => {
    it('returns 200 with forecasts and total', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/forecasts?opportunityId=opp-123',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('forecasts');
      expect(body).toHaveProperty('total');
      expect(Array.isArray(body.forecasts)).toBe(true);
    });
  });

  describe('GET /api/v1/forecasts/:forecastId', () => {
    it('returns 404 when forecast not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/forecasts/non-existent-forecast-id',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/forecasts', () => {
    it('returns 202 with forecastId when opportunityId provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/forecasts',
        headers: authHeaders,
        payload: { opportunityId: 'opp-123' },
      });

      expect(response.statusCode).toBe(202);
      const body = response.json();
      expect(body).toHaveProperty('forecastId');
      expect(body).toHaveProperty('forecast');
    });
  });

  describe('POST /api/v1/accuracy/actuals', () => {
    it('returns 400 when required fields missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/accuracy/actuals',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
