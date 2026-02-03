/**
 * Data Enrichment Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

// Mock dependencies are set up in tests/setup.ts (do not re-mock @coder/shared or @coder/shared/database or mocks become undefined)
vi.mock('../../../src/events/publishers/EnrichmentEventPublisher');

describe('POST /api/v1/enrichment/enrich', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create enrichment job and return 202', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/enrichment/enrich',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        shardId: 'shard-123',
        enrichmentTypes: ['ai_summary', 'vectorization'],
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body).toHaveProperty('jobId');
    expect(body).toHaveProperty('shardId', 'shard-123');
    expect(body).toHaveProperty('status');
  });

  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/enrichment/enrich',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
      payload: {
        // Missing required shardId
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/v1/enrichment/jobs/:jobId', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should retrieve enrichment job and return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/enrichment/jobs/job-123',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('jobId', 'job-123');
    expect(body).toHaveProperty('status');
  });

  it('should return 404 for non-existent job', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/enrichment/jobs/non-existent',
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-tenant-id': 'tenant-123',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
