/**
 * Tenant Validation Middleware Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { tenantValidationMiddleware, isPublicAuthPath } from '../../../src/middleware/tenantValidation';

describe('isPublicAuthPath', () => {
  it('returns true for /api/auth/login', () => {
    expect(isPublicAuthPath('/api/auth/login')).toBe(true);
  });

  it('returns true for /api/auth/register', () => {
    expect(isPublicAuthPath('/api/auth/register')).toBe(true);
  });

  it('returns true for /api/auth/google/callback', () => {
    expect(isPublicAuthPath('/api/auth/google/callback')).toBe(true);
  });

  it('returns true for /api/auth/oauth/github/callback', () => {
    expect(isPublicAuthPath('/api/auth/oauth/github/callback')).toBe(true);
  });

  it('returns true for /api/auth/forgot-password', () => {
    expect(isPublicAuthPath('/api/auth/forgot-password')).toBe(true);
  });

  it('returns true for /api/auth/reset-password', () => {
    expect(isPublicAuthPath('/api/auth/reset-password')).toBe(true);
  });

  it('returns true for /api/auth/sso/saml/initiate', () => {
    expect(isPublicAuthPath('/api/auth/sso/saml/initiate')).toBe(true);
  });

  it('returns true for /api/auth/sso/saml/callback', () => {
    expect(isPublicAuthPath('/api/auth/sso/saml/callback')).toBe(true);
  });

  it('returns true for /api/auth/verify-email', () => {
    expect(isPublicAuthPath('/api/auth/verify-email')).toBe(true);
  });

  it('returns true for /api/auth/verify-email with query', () => {
    expect(isPublicAuthPath('/api/auth/verify-email?token=abc')).toBe(true);
  });

  it('returns true for /api/auth/health', () => {
    expect(isPublicAuthPath('/api/auth/health')).toBe(true);
  });

  it('returns true for /api/auth/refresh', () => {
    expect(isPublicAuthPath('/api/auth/refresh')).toBe(true);
  });

  it('returns true for /api/auth/logout', () => {
    expect(isPublicAuthPath('/api/auth/logout')).toBe(true);
  });

  it('returns true for /api/auth/google (OAuth initiate)', () => {
    expect(isPublicAuthPath('/api/auth/google')).toBe(true);
  });

  it('returns true for /api/auth/oauth/github (OAuth initiate)', () => {
    expect(isPublicAuthPath('/api/auth/oauth/github')).toBe(true);
  });

  it('returns false for /api/users/me', () => {
    expect(isPublicAuthPath('/api/users/me')).toBe(false);
  });

  it('returns false for /api/auth/me', () => {
    expect(isPublicAuthPath('/api/auth/me')).toBe(false);
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

  it('skips validation for public auth path /api/auth/login', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn() };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.post('/api/auth/login', async (_request, reply) => reply.send({ ok: true }));

    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: {} });
    expect(res.statusCode).toBe(200);
    expect((app as any).jwt.verify).not.toHaveBeenCalled();
  });

  it('returns 401 for protected path without Bearer token', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn() };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({ method: 'GET', url: '/api/users/me' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/authorization/i);
  });

  it('injects X-Tenant-ID when accessToken in cookie (no Bearer)', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({ tenantId: validTenantId })) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/users/me', async (request: any, reply) => {
      const tenantId = request.headers['x-tenant-id'];
      return reply.send({ tenantId });
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
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
    app.get('/api/users/me', async (request: any, reply) => {
      const tenantId = request.headers['x-tenant-id'];
      return reply.send({ tenantId });
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { authorization: 'Bearer fake-token' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tenantId).toBe(validTenantId);
  });

  it('accepts organizationId when tenantId missing', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({ organizationId: validTenantId })) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/users/me', async (request: any, reply) => {
      const tenantId = request.headers['x-tenant-id'];
      return reply.send({ tenantId });
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { authorization: 'Bearer fake-token' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tenantId).toBe(validTenantId);
  });

  it('returns 400 when token has no tenantId or organizationId', async () => {
    const app = Fastify();
    (app as any).jwt = { verify: vi.fn(() => ({})) };
    app.addHook('preHandler', tenantValidationMiddleware);
    app.get('/api/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
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
    app.get('/api/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
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
    app.get('/api/users/me', async (_request, reply) => reply.send({}));

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { authorization: 'Bearer bad-token' },
    });
    expect(res.statusCode).toBe(401);
  });
});
