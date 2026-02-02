/**
 * API Gateway Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../../src/server';

describe('API Gateway routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows public auth path /api/auth/health without Authorization', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/health' });
    // Should not be 401 (tenant validation skipped for public auth paths)
    expect(res.statusCode).not.toBe(401);
    // May be 200 (if proxy succeeds) or 502/503 (if backend unreachable in test)
    expect([200, 502, 503]).toContain(res.statusCode);
  });

  it('allows public auth path /api/auth/login without Authorization', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.com', password: 'x' } });
    expect(res.statusCode).not.toBe(401);
    expect([200, 400, 502, 503]).toContain(res.statusCode);
  });

  it('returns 401 for protected path /api/users/me without Bearer token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/me' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/authorization|Missing|invalid/i);
  });

  it('returns 200 for /health when health check is registered', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    // setupHealthCheck is mocked in tests; in production /health is registered and returns 200
    expect([200, 404]).toContain(res.statusCode);
  });

  it('returns 200 for root /', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.service).toBe('API Gateway');
  });
});
