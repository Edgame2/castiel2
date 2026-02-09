/**
 * Rate Limit Middleware Unit Tests
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { createRateLimitMiddleware } from '../../../src/middleware/rateLimit';
import { createInMemoryStore } from '../../../src/middleware/rateLimitStore';

describe('createRateLimitMiddleware', () => {
  const config = { max: 2, timeWindow: 60000 };
  const store = createInMemoryStore();

  it('adds X-RateLimit headers', async () => {
    const middleware = createRateLimitMiddleware(config, store);
    const app = Fastify();
    app.addHook('onRequest', middleware);
    app.get('/api/ratelimit-headers', async (_request, reply) => reply.send({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/api/ratelimit-headers' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('skips rate limit for /health', async () => {
    const middleware = createRateLimitMiddleware(config, store);
    const app = Fastify();
    app.addHook('onRequest', middleware);
    app.get('/health', async (_request, reply) => reply.send({ ok: true }));
    app.get('/other', async (_request, reply) => reply.send({ ok: true }));

    const res1 = await app.inject({ method: 'GET', url: '/health' });
    expect(res1.statusCode).toBe(200);
    const res2 = await app.inject({ method: 'GET', url: '/health' });
    expect(res2.statusCode).toBe(200);
  });

  it('skips rate limit for /ready', async () => {
    const middleware = createRateLimitMiddleware(config, store);
    const app = Fastify();
    app.addHook('onRequest', middleware);
    app.get('/ready', async (_request, reply) => reply.send({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
  });

  it('allows requests within limit', async () => {
    const middleware = createRateLimitMiddleware(
      { max: 10, timeWindow: 60000 },
      createInMemoryStore()
    );
    const app = Fastify();
    app.addHook('onRequest', middleware);
    app.get('/api/test', async (_request, reply) => reply.send({ ok: true }));

    const res1 = await app.inject({ method: 'GET', url: '/api/test' });
    expect(res1.statusCode).toBe(200);
    const res2 = await app.inject({ method: 'GET', url: '/api/test' });
    expect(res2.statusCode).toBe(200);
  });

  it('returns 429 when over limit', async () => {
    const middleware = createRateLimitMiddleware(
      { max: 2, timeWindow: 60000 },
      createInMemoryStore()
    );
    const app = Fastify();
    app.addHook('onRequest', middleware);
    app.get('/api/test', async (_request, reply) => reply.send({ ok: true }));

    await app.inject({ method: 'GET', url: '/api/test' });
    await app.inject({ method: 'GET', url: '/api/test' });
    const res3 = await app.inject({ method: 'GET', url: '/api/test' });
    expect(res3.statusCode).toBe(429);
    const body = JSON.parse(res3.body);
    expect(body.error).toMatch(/Too many requests/i);
  });

});
