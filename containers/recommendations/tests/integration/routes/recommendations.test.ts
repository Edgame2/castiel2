/**
 * Recommendations Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies: use setup's @coder/shared mock (has getContainer, auth from actual)
vi.mock('../../../src/events/publishers/RecommendationEventPublisher');

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    module: { name: 'recommendations', version: '1.0.0' },
    server: { port: 3049, host: '0.0.0.0' },
    cosmos_db: {
      endpoint: process.env.COSMOS_DB_ENDPOINT || 'https://localhost:8081',
      key: process.env.COSMOS_DB_KEY || 'test-key',
      database_id: process.env.COSMOS_DB_DATABASE_ID || 'castiel',
      containers: {
        recommendations: 'recommendation_recommendations',
        feedback: 'recommendation_feedback',
        feedback_aggregation: 'recommendation_feedback_aggregation',
        recommendation_config: 'recommendation_config',
        metrics: 'recommendation_metrics',
        remediation_workflows: 'recommendation_remediation_workflows',
        mitigation_actions: 'recommendation_mitigation_actions',
      },
    },
    jwt: { secret: 'test-secret' },
    services: {},
    rabbitmq: { url: '', exchange: 'coder_events', queue: 'recommendations', bindings: [] },
    features: {},
  })),
}));

describe('GET /api/v1/recommendations', () => {
  let app: FastifyInstance | undefined;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should return recommendations and 200', async () => {
    if (!app) return;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/recommendations?opportunityId=opp-123&limit=10',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('recommendations');
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  it('should return 200 with empty array when no opportunityId', async () => {
    if (!app) return;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/recommendations?limit=10',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('recommendations');
    expect(Array.isArray(body.recommendations)).toBe(true);
  });
});

describe('POST /api/v1/recommendations/:id/feedback', () => {
  let app: FastifyInstance | undefined;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should submit feedback and return 200', async () => {
    if (!app) return;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/recommendations/rec-123/feedback',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        action: 'accept',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('recommendationId');
    expect(body).toHaveProperty('action');
  });

  it('should return 400 for invalid action', async () => {
    if (!app) return;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/recommendations/rec-123/feedback',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        action: 'invalid',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
