/**
 * Unit tests for request context utilities
 */

import { describe, it, expect } from 'vitest';
import { getSecretContext, getRequestMetadata } from '../../../src/utils/requestContext';

describe('getSecretContext', () => {
  it('should return context from request.user and headers', () => {
    const request = {
      user: {
        id: 'user-123',
        organizationId: 'org-1',
        teamId: 'team-1',
        projectId: 'proj-1',
      },
      headers: {
        'x-consumer-module': 'api-gateway',
        'x-consumer-resource-id': 'resource-456',
      },
    } as any;

    const result = getSecretContext(request);

    expect(result.userId).toBe('user-123');
    expect(result.organizationId).toBe('org-1');
    expect(result.teamId).toBe('team-1');
    expect(result.projectId).toBe('proj-1');
    expect(result.consumerModule).toBe('api-gateway');
    expect(result.consumerResourceId).toBe('resource-456');
  });

  it('should return anonymous userId when user is missing', () => {
    const request = {
      headers: {},
    } as any;

    const result = getSecretContext(request);

    expect(result.userId).toBe('anonymous');
    expect(result.consumerModule).toBe('secret-management');
  });

  it('should default consumerModule to secret-management when header is missing', () => {
    const request = { user: { id: 'u1' }, headers: {} } as any;

    const result = getSecretContext(request);

    expect(result.consumerModule).toBe('secret-management');
  });
});

describe('getRequestMetadata', () => {
  it('should return ipAddress, userAgent, requestId from request', () => {
    const request = {
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'TestAgent/1.0',
        'x-request-id': 'req-abc',
      },
      id: 'fallback-id',
    } as any;

    const result = getRequestMetadata(request);

    expect(result.ipAddress).toBe('192.168.1.1');
    expect(result.userAgent).toBe('TestAgent/1.0');
    expect(result.requestId).toBe('req-abc');
  });

  it('should use request.id when x-request-id header is missing', () => {
    const request = {
      ip: '127.0.0.1',
      headers: {},
      id: 'fallback-id',
    } as any;

    const result = getRequestMetadata(request);

    expect(result.requestId).toBe('fallback-id');
  });
});
