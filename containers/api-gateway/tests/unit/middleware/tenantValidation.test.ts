/**
 * Tenant Validation Middleware Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { tenantValidationMiddleware, isPublicAuthPath } from '../../../src/middleware/tenantValidation';

describe('isPublicAuthPath', () => {
  it('returns true for /api/v1/auth/login', () => {
    expect(isPublicAuthPath('/api/v1/auth/login')).toBe(true);
  });

  it('returns true for /api/v1/auth/register', () => {
    expect(isPublicAuthPath('/api/v1/auth/register')).toBe(true);
  });

  it('returns true for /api/v1/auth/google/callback', () => {
    expect(isPublicAuthPath('/api/v1/auth/google/callback')).toBe(true);
  });

  it('returns true for /api/v1/auth/oauth/github/callback', () => {
    expect(isPublicAuthPath('/api/v1/auth/oauth/github/callback')).toBe(true);
  });

  it('returns true for /api/v1/auth/forgot-password', () => {
    expect(isPublicAuthPath('/api/v1/auth/forgot-password')).toBe(true);
  });

  it('returns true for /api/v1/auth/reset-password', () => {
    expect(isPublicAuthPath('/api/v1/auth/reset-password')).toBe(true);
  });

  it('returns true for /api/v1/auth/sso/saml/initiate', () => {
    expect(isPublicAuthPath('/api/v1/auth/sso/saml/initiate')).toBe(true);
  });

  it('returns true for /api/v1/auth/sso/saml/callback', () => {
    expect(isPublicAuthPath('/api/v1/auth/sso/saml/callback')).toBe(true);
  });

  it('returns true for /api/v1/auth/verify-email', () => {
    expect(isPublicAuthPath('/api/v1/auth/verify-email')).toBe(true);
  });

  it('returns true for /api/v1/auth/verify-email with query', () => {
    expect(isPublicAuthPath('/api/v1/auth/verify-email?token=abc')).toBe(true);
  });

  it('returns true for /api/v1/auth/health', () => {
    expect(isPublicAuthPath('/api/v1/auth/health')).toBe(true);
  });

  it('returns true for /api/v1/auth/refresh', () => {
    expect(isPublicAuthPath('/api/v1/auth/refresh')).toBe(true);
  });

  it('returns true for /api/v1/auth/logout', () => {
    expect(isPublicAuthPath('/api/v1/auth/logout')).toBe(true);
  });

  it('returns true for /api/v1/auth/google (OAuth initiate)', () => {
    expect(isPublicAuthPath('/api/v1/auth/google')).toBe(true);
  });

  it('returns true for /api/v1/auth/oauth/github (OAuth initiate)', () => {
    expect(isPublicAuthPath('/api/v1/auth/oauth/github')).toBe(true);
  });

  it('returns false for /api/v1/users/me', () => {
    expect(isPublicAuthPath('/api/v1/users/me')).toBe(false);
  });

  it('returns false for /api/v1/auth/me', () => {
    expect(isPublicAuthPath('/api/v1/auth/me')).toBe(false);
  });
});

describe('tenantValidationMiddleware', () => {
  const validTenantId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('skips validation for /health', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn() };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/health', async (_request, reply) => reply.send({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect((app as any).jwt.verify).not.toHaveBeenCalled();
  });

  it('skips validation for /ready', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn() };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/ready', async (_request, reply) => reply.send({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
  });

  it('skips validation for public auth path /api/v1/auth/login', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn() };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.post('/api/v1/auth/login', async (_request, reply) => reply.send({ ok: true }));

    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {} });
    expect(res.statusCode).toBe(200);
    expect((app as any).jwt.verify).not.toHaveBeenCalled();
  });

  it('returns 401 for protected path without Bearer token', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn() };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/v1/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({ method: 'GET', url: '/api/v1/users/me' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/authorization/i);
  });

  it('injects X-Tenant-ID when accessToken in cookie (no Bearer)', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({ tenantId: validTenantId })) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/v1/users/me', async (request: any, reply) => {
      const tenantId = request.headers['x-tenant-id'];
      return reply.send({ tenantId });
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { cookie: 'accessToken=fake-token; other=value' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tenantId).toBe(validTenantId);
    expect((app as any).jwt.verify).toHaveBeenCalledWith('fake-token');
  });

  it('injects X-Tenant-ID when valid Bearer token with tenantId', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({ tenantId: validTenantId })) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/v1/users/me', async (request: any, reply) => {
      const tenantId = request.headers['x-tenant-id'];
      return reply.send({ tenantId });
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: 'Bearer fake-token' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tenantId).toBe(validTenantId);
  });

  it('returns 400 when token has no tenantId', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({})) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/v1/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: 'Bearer fake-token' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/tenantId|tenant/i);
  });

  it('returns 400 when token has no tenantId (empty payload)', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({})) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/v1/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: 'Bearer fake-token' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/tenantId|tenant/i);
  });

  it('returns 400 when tenantId is not a valid UUID', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({ tenantId: 'not-a-uuid' })) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/v1/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: 'Bearer fake-token' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/Invalid tenantId|format/i);
  });

  it('returns 401 when token is invalid', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => { throw new Error('invalid'); }) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/v1/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: 'Bearer bad-token' },
    });
    expect(res.statusCode).toBe(401);
  });
});
