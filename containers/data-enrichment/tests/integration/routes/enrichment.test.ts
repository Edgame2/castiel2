/**
 * Data Enrichment Routes Integration Tests
 * Plan §16: jobs/:jobId, trigger, config, auth, tenant, tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';

vi.mock('../../../src/events/publishers/EnrichmentEventPublisher');

describe('Data Enrichment routes', () => {
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

  describe('POST /api/v1/enrichment/enrich', () => {
    it('returns 202 with jobId and shardId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/enrichment/enrich',
        headers: authHeaders,
        payload: { shardId: 'shard-123' },
      });

      expect(response.statusCode).toBe(202);
      const body = response.json();
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('shardId', 'shard-123');
      expect(body).toHaveProperty('status');
    });

    it('returns 400 when shardId missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/enrichment/enrich',
        headers: authHeaders,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/enrichment/trigger', () => {
    it('returns 202 with jobId and status', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/enrichment/trigger',
        headers: authHeaders,
        payload: { shardId: 'shard-123' },
      });

      expect(response.statusCode).toBe(202);
      const body = response.json();
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/enrichment/jobs/:jobId', () => {
    it('returns 200 with job for existing id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/enrichment/jobs/job-123',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('status');
    });

    it('returns 404 for non-existent job', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/enrichment/jobs/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
