/**
 * Rate limit middleware unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimitAuthRoutes } from '../../../src/middleware/rateLimit';

const mockRedis = {
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../../src/config/index.js', () => ({
  getConfig: vi.fn(),
}));
vi.mock('../../../src/utils/redis', () => ({
  redis: mockRedis,
}));
vi.mock('../../../src/utils/logger.js', () => ({ log: { warn: vi.fn(), error: vi.fn() } }));

describe('rateLimitAuthRoutes', () => {
  let getConfig: ReturnType<typeof vi.fn>;
  let request: { method: string; url: string; headers: Record<string, string>; ip?: string };
  let reply: { status: ReturnType<typeof vi.fn>; header: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getConfig: getConfigFn } = await import('../../../src/config/index.js');
    getConfig = getConfigFn as ReturnType<typeof vi.fn>;
    request = {
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: {},
      ip: '127.0.0.1',
    };
    reply = {
      status: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(undefined);
  });

  it('does nothing when rate_limit.enabled is false', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: false } });
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).not.toHaveBeenCalled();
    expect(mockRedis.incr).not.toHaveBeenCalled();
  });

  it('does nothing when rate_limit is undefined', async () => {
    getConfig.mockReturnValue({});
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).not.toHaveBeenCalled();
    expect(mockRedis.incr).not.toHaveBeenCalled();
  });

  it('does nothing when path is not in rate-limited list', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    request.method = 'GET';
    request.url = '/api/v1/auth/me';
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).not.toHaveBeenCalled();
    expect(mockRedis.incr).not.toHaveBeenCalled();
  });

  it('does not send 429 when count is at or below max_per_window', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    mockRedis.incr.mockResolvedValue(30);
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).not.toHaveBeenCalled();
    expect(mockRedis.incr).toHaveBeenCalledWith('auth_rlimit:ip:127.0.0.1');
  });

  it('sends 429 with Retry-After when count exceeds max_per_window', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    mockRedis.incr.mockResolvedValue(31);
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).toHaveBeenCalledWith(429);
    expect(reply.header).toHaveBeenCalledWith('Retry-After', '60');
    expect(reply.send).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again later.',
      retryAfter: 60,
    });
  });

  it('uses x-forwarded-for when present for client IP', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    request.headers['x-forwarded-for'] = '10.0.0.1, 10.0.0.2';
    mockRedis.incr.mockResolvedValue(31);
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(mockRedis.incr).toHaveBeenCalledWith('auth_rlimit:ip:10.0.0.1');
  });

  it('calls expire only when count is 1 (first request in window)', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    mockRedis.incr.mockResolvedValue(1);
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
    mockRedis.incr.mockResolvedValue(2);
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
  });

  it('fails open when Redis throws', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    mockRedis.incr.mockRejectedValue(new Error('Redis connection failed'));
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('rate-limits POST /api/v1/auth/register', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    request.url = '/api/v1/auth/register';
    mockRedis.incr.mockResolvedValue(31);
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).toHaveBeenCalledWith(429);
  });

  it('strips query string from path before matching', async () => {
    getConfig.mockReturnValue({ rate_limit: { enabled: true, window_seconds: 60, max_per_window: 30 } });
    request.url = '/api/v1/auth/login?redirect=/dashboard';
    mockRedis.incr.mockResolvedValue(31);
    await rateLimitAuthRoutes(request as any, reply as any);
    expect(reply.status).toHaveBeenCalledWith(429);
  });
});
