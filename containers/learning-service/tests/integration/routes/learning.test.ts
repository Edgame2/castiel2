/**
 * Learning Service Integration Tests
 * Plan §18: feedback, outcomes, feedback/summary, feedback/:id/link-prediction, feedback/trends
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

describe('Learning Service routes', () => {
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

  describe('POST /api/v1/feedback', () => {
    it('returns 201 with id and recordedAt', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/feedback',
        headers: authHeaders,
        payload: {
          modelId: 'm1',
          feedbackType: 'action',
        },
      });
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('recordedAt');
    });

    it('returns 400 when required fields missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/feedback',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/outcomes', () => {
    it('returns 201 with id and recordedAt', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        headers: authHeaders,
        payload: {
          modelId: 'm1',
          outcomeType: 'won',
          success: true,
        },
      });
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('recordedAt');
    });
  });

  describe('GET /api/v1/feedback/summary/:modelId', () => {
    it('returns 200 with summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/feedback/summary/model-1',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('modelId', 'model-1');
      expect(body).toHaveProperty('totalFeedback');
      expect(body).toHaveProperty('byType');
      expect(body).toHaveProperty('satisfactionScore');
    });
  });

  describe('PUT /api/v1/feedback/:feedbackId/link-prediction', () => {
    it('returns 200 when feedback exists', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/feedback/fb-1/link-prediction',
        headers: authHeaders,
        payload: { predictionId: 'pred-1' },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('predictionId', 'pred-1');
      expect(body).toHaveProperty('linkedAt');
    });

    it('returns 404 when feedback not found', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/feedback/not-found/link-prediction',
        headers: authHeaders,
        payload: { predictionId: 'pred-1' },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/feedback/trends/:modelId', () => {
    it('returns 200 with trends', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/feedback/trends/model-1',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('modelId', 'model-1');
      expect(body).toHaveProperty('series');
      expect(body).toHaveProperty('period');
    });
  });
});
