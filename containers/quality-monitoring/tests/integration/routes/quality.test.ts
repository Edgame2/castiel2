/**
 * Quality Monitoring Routes Integration Tests
 * GET/POST /api/v1/quality/metrics
 * POST /api/v1/quality/anomalies/detect, GET /api/v1/quality/anomalies
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

vi.mock('../../../src/events/publishers/QualityMonitoringEventPublisher');

describe('Quality Monitoring routes', () => {
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

  describe('GET /api/v1/quality/metrics', () => {
    it('returns 200 with metrics array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/quality/metrics',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('metrics');
      expect(Array.isArray(body.metrics)).toBe(true);
    });
  });

  describe('POST /api/v1/quality/metrics', () => {
    it('returns 204 when metric recorded', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/quality/metrics',
        headers: authHeaders,
        payload: {
          metricType: 'accuracy',
          value: 0.95,
          threshold: 0.9,
          status: 'normal',
        },
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('POST /api/v1/quality/anomalies/detect', () => {
    it('returns 200 with anomaly or null', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/quality/anomalies/detect',
        headers: authHeaders,
        payload: {
          metricType: 'accuracy',
          value: 0.5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('anomaly');
    });
  });

  describe('GET /api/v1/quality/anomalies', () => {
    it('returns 200 with anomalies array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/quality/anomalies',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('anomalies');
      expect(Array.isArray(body.anomalies)).toBe(true);
    });
  });
});
