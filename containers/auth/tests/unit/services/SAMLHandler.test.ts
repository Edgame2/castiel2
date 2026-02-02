/**
 * SAML Handler Unit Tests
 * Verifies secret management URL is required (config or env); no hardcoded fallback; fails fast when missing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSAMLRequest } from '../../../src/services/SAMLHandler';
import { getDatabaseClient } from '@coder/shared';

const { mockLoadConfig, defaultConfig } = vi.hoisted(() => {
  const fn = vi.fn();
  const defaultConfig = {
    services: {} as any,
    server: { base_url: 'http://localhost:3021' },
    redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  };
  fn.mockReturnValue(defaultConfig);
  return { mockLoadConfig: fn, defaultConfig };
});

vi.mock('../../../src/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
  getConfig: () => mockLoadConfig(),
  clearConfigCache: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(function (this: any) {
    this.get = vi.fn().mockResolvedValue(null);
    this.set = vi.fn().mockResolvedValue('OK');
    this.setex = vi.fn().mockResolvedValue('OK');
    this.del = vi.fn().mockResolvedValue(1);
    this.on = vi.fn();
    this.quit = vi.fn().mockResolvedValue('OK');
  }),
}));

describe('SAMLHandler', () => {
  const originalEnv = process.env.SECRET_MANAGEMENT_SERVICE_URL;

  afterEach(() => {
    delete process.env.SECRET_MANAGEMENT_SERVICE_URL;
    if (originalEnv !== undefined) {
      process.env.SECRET_MANAGEMENT_SERVICE_URL = originalEnv;
    }
  });

  beforeEach(() => {
    mockLoadConfig.mockReturnValue({
      ...defaultConfig,
      services: {},
      server: { base_url: 'http://localhost:3021' },
    });
    delete process.env.SECRET_MANAGEMENT_SERVICE_URL;
    vi.mocked(getDatabaseClient).mockReturnValue({
      sSOConfiguration: {
        findUnique: vi.fn().mockResolvedValue({
          organizationId: 'org-1',
          isActive: true,
          secretId: 'secret-1',
          entityId: 'entity-1',
          ssoUrl: 'https://idp.example.com/sso',
          organization: { slug: 'org1' },
        }),
      },
    } as any);
  });

  it('should throw when secret management URL is missing and getSSOCredentials is used', async () => {
    await expect(generateSAMLRequest('org-1')).rejects.toThrow(
      /Secret management URL required: set SECRET_MANAGEMENT_URL or config\.services\.secret_management\.url/
    );
  });

  it('should not throw URL error when config provides secret_management.url', async () => {
    mockLoadConfig.mockReturnValue({
      ...defaultConfig,
      services: {
        secret_management: { url: 'http://secret-manager:3003' },
      },
      server: { base_url: 'http://localhost:3021' },
    });
    process.env.SERVICE_AUTH_TOKEN = 'test-token';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        secretId: 'secret-1',
        organizationId: 'org-1',
        credentials: {
          certificate: 'cert',
          privateKey: 'key',
        },
      }),
    }) as any;
    await expect(generateSAMLRequest('org-1')).resolves.toMatchObject({
      samlRequest: expect.any(String),
      redirectUrl: 'https://idp.example.com/sso',
      relayState: 'org:org-1',
    });
  });
});
