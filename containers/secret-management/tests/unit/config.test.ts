/**
 * Unit tests for configuration loading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig, getConfig } from '../../src/config';

describe('Configuration Loading', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load default configuration', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    const config = loadConfig();

    expect(config.module.name).toBe('secret-management');
    expect(config.module.version).toBe('1.0.0');
    expect(config.server.port).toBe(3003);
    expect(config.encryption.masterKey).toBe('a'.repeat(64));
  });

  it('should override with environment variables', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';

    const config = loadConfig();

    expect(config.server.port).toBe(4000);
    expect(config.server.env).toBe('production');
  });

  it('should throw error if SECRET_MASTER_KEY is missing', () => {
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    delete process.env.SECRET_MASTER_KEY;

    expect(() => loadConfig()).toThrow('SECRET_MASTER_KEY');
  });

  it('should throw error if SECRET_MASTER_KEY is invalid length', () => {
    process.env.SECRET_MASTER_KEY = 'invalid';
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    expect(() => loadConfig()).toThrow('64 hex characters');
  });

  it('should throw error if SERVICE_AUTH_TOKEN is missing', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    delete process.env.SERVICE_AUTH_TOKEN;

    expect(() => loadConfig()).toThrow('SERVICE_AUTH_TOKEN');
  });

  it('should use cached config on subsequent calls', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    const config1 = getConfig();
    const config2 = getConfig();

    expect(config1).toBe(config2);
  });
});



