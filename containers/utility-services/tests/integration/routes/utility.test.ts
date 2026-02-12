/**
 * Utility Services routes integration tests (Plan §22).
 * GET jobs/:jobId, POST import, POST export.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';

describe('Utility routes (integration)', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  const authHeaders = {
    authorization: 'Bearer test-token',
    'x-tenant-id': 'tenant-123',
  };

  it('GET /api/v1/utility/jobs/:jobId returns 200 when job exists', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/api/v1/utility/jobs/job-1?jobType=import',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toHaveProperty('id', 'job-1');
  });

  it('GET /api/v1/utility/jobs/:jobId returns 404 when job not found', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/api/v1/utility/jobs/not-found?jobType=import',
      headers: authHeaders,
    });
    expect(r.statusCode).toBe(404);
  });

  it('POST /api/v1/utility/import returns 202', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/utility/import',
      headers: authHeaders,
      payload: { importType: 'csv', data: [] },
    });
    expect(r.statusCode).toBe(202);
    expect(r.json()).toHaveProperty('id');
  });

  it('POST /api/v1/utility/export returns 202', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/utility/export',
      headers: authHeaders,
      payload: { exportType: 'csv' },
    });
    expect(r.statusCode).toBe(202);
    expect(r.json()).toHaveProperty('id');
  });
});
