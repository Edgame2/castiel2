/**
 * Redis utility unit tests
 * Tests the mocked redis interface used in auth tests (setup mocks the real redis module).
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/utils/redis', () => {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };
  return { redis: mockRedis, default: mockRedis };
});

describe('redis mock', () => {
  it('should expose get, set, setex, del', async () => {
    const { redis } = await import('../../../src/utils/redis');
    expect(typeof redis.get).toBe('function');
    expect(typeof redis.set).toBe('function');
    expect(typeof redis.setex).toBe('function');
    expect(typeof redis.del).toBe('function');
  });

  it('get should return a promise', async () => {
    const { redis } = await import('../../../src/utils/redis');
    const result = redis.get('key');
    expect(result).toBeInstanceOf(Promise);
    await result;
  });
});
