/**
 * Secret Management Client Unit Tests
 * Verifies no hardcoded secret-management URL; requires config or env; fails fast when missing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../../src/config';
import { SecretManagementClient } from '../../../src/services/SecretManagementClient';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any) {
    this.get = vi.fn();
    this.post = vi.fn();
  }),
}));

describe('SecretManagementClient', () => {
  const originalEnv = process.env.SECRET_MANAGEMENT_SERVICE_URL;

  afterEach(() => {
    delete process.env.SECRET_MANAGEMENT_SERVICE_URL;
    if (originalEnv !== undefined) {
      process.env.SECRET_MANAGEMENT_SERVICE_URL = originalEnv;
    }
  });

  beforeEach(() => {
    vi.mocked(loadConfig).mockReturnValue({
      services: {},
    } as any);
    delete process.env.SECRET_MANAGEMENT_SERVICE_URL;
  });

  it('should use config.services.secret_management.url when set', () => {
    vi.mocked(loadConfig).mockReturnValue({
      services: {
        secret_management: { url: 'http://secret-manager:3003' },
      },
    } as any);
    expect(() => new SecretManagementClient()).not.toThrow();
  });

  it('should use SECRET_MANAGEMENT_SERVICE_URL when config url is not set', () => {
    process.env.SECRET_MANAGEMENT_SERVICE_URL = 'http://from-env:3003';
    expect(() => new SecretManagementClient()).not.toThrow();
  });

  it('should throw when neither config nor env secret management URL is set', () => {
    expect(() => new SecretManagementClient()).toThrow(
      /Secret management URL required: set SECRET_MANAGEMENT_URL or config\.services\.secret_management\.url/
    );
  });

  it('should throw when URL is empty string from config', () => {
    vi.mocked(loadConfig).mockReturnValue({
      services: {
        secret_management: { url: '' },
      },
    } as any);
    expect(() => new SecretManagementClient()).toThrow(
      /Secret management URL required/
    );
  });
});
