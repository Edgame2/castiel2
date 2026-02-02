/**
 * Unit tests for auth utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyServiceAuth, verifyServiceAuthorized } from '../../../src/utils/auth';

describe('verifyServiceAuth', () => {
  const validToken = 'valid-service-token';

  beforeEach(() => {
    process.env.SERVICE_AUTH_TOKEN = validToken;
  });

  afterEach(() => {
    delete process.env.SERVICE_AUTH_TOKEN;
  });

  it('should return serviceToken, requestingService, organizationId when token is valid', () => {
    const request = {
      headers: {
        'x-service-token': validToken,
        'x-requesting-service': 'test-service',
        'x-organization-id': 'org-123',
      },
    } as any;

    const result = verifyServiceAuth(request);

    expect(result.serviceToken).toBe(validToken);
    expect(result.requestingService).toBe('test-service');
    expect(result.organizationId).toBe('org-123');
  });

  it('should throw AccessDeniedError when service token is missing', () => {
    const request = {
      headers: {
        'x-requesting-service': 'test-service',
      },
    } as any;

    expect(() => verifyServiceAuth(request)).toThrow(/Invalid service token|AccessDeniedError/);
  });

  it('should throw AccessDeniedError when service token is invalid', () => {
    const request = {
      headers: {
        'x-service-token': 'wrong-token',
        'x-requesting-service': 'test-service',
      },
    } as any;

    expect(() => verifyServiceAuth(request)).toThrow(/Invalid service token|AccessDeniedError/);
  });

  it('should throw AccessDeniedError when requesting service is missing', () => {
    const request = {
      headers: {
        'x-service-token': validToken,
      },
    } as any;

    expect(() => verifyServiceAuth(request)).toThrow(/Missing requesting service|AccessDeniedError/);
  });
});

describe('verifyServiceAuthorized', () => {
  it('should not throw when requesting service is in allowed list', () => {
    expect(() =>
      verifyServiceAuthorized('secret-management', ['secret-management', 'api-gateway'])
    ).not.toThrow();
  });

  it('should throw AccessDeniedError when requesting service is not in allowed list', () => {
    expect(() =>
      verifyServiceAuthorized('unknown-service', ['secret-management'])
    ).toThrow(/not authorized|AccessDeniedError/);
  });
});
