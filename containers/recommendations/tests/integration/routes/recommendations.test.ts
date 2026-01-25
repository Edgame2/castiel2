/**
 * Recommendations Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies are set up in tests/setup.ts
vi.mock('@coder/shared/database');
vi.mock('@coder/shared');
vi.mock('../../../src/events/publishers/RecommendationEventPublisher');

describe('POST /api/v1/recommendations/generate', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate recommendations and return 200', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/recommendations/generate',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        opportunityId: 'opp-123',
        limit: 10,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('recommendations');
    expect(Array.isArray(body.data.recommendations)).toBe(true);
  });

  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/recommendations/generate',
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

describe('POST /api/v1/recommendations/:id/feedback', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should submit feedback and return 200', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/recommendations/rec-123/feedback',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        action: 'accept',
        rating: 5,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
  });

  it('should return 400 for invalid action', async () => {
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
