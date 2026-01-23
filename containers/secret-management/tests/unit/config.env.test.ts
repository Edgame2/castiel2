/**
 * Unit tests for environment variable resolution in config
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig } from '../../src/config';

describe('Environment Variable Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should resolve environment variables with default values', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    // PORT not set, should use default from YAML

    const config = loadConfig();

    expect(config.server.port).toBe(3003); // Default from YAML
  });

  it('should override YAML defaults with environment variables', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = '4000';

    const config = loadConfig();

    expect(config.server.port).toBe(4000); // Overridden by env var
  });

  it('should resolve nested environment variables', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.LOGGING_SERVICE_URL = 'http://custom-logging:3014';

    const config = loadConfig();

    expect(config.services.logging?.url).toBe('http://custom-logging:3014');
  });

  it('should use default value when env var not set', () => {
    process.env.SECRET_MASTER_KEY = 'a'.repeat(64);
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    delete process.env.LOGGING_SERVICE_URL;

    const config = loadConfig();

    // Should use default from YAML or be undefined
    expect(config.logging.serviceUrl).toBeUndefined();
  });
});



