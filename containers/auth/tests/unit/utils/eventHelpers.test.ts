/**
 * Event helpers unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractEventMetadata, publishEventSafelyHelper } from '../../../src/utils/eventHelpers';

vi.mock('../../../src/events/publishers/AuthEventPublisher', () => ({
  createBaseEvent: vi.fn(),
  publishEventSafely: vi.fn().mockResolvedValue(undefined),
}));

describe('extractEventMetadata', () => {
  it('should extract ipAddress from request', () => {
    const request = { ip: '192.168.1.1', headers: {} };
    const meta = extractEventMetadata(request);
    expect(meta.ipAddress).toBe('192.168.1.1');
  });

  it('should use x-forwarded-for when ip not set', () => {
    const request = { headers: { 'x-forwarded-for': '10.0.0.1' } };
    const meta = extractEventMetadata(request);
    expect(meta.ipAddress).toBe('10.0.0.1');
  });

  it('should extract userAgent', () => {
    const request = { headers: { 'user-agent': 'Mozilla/5.0' } };
    const meta = extractEventMetadata(request);
    expect(meta.userAgent).toBe('Mozilla/5.0');
  });

  it('should extract sessionId from request', () => {
    const request = { sessionId: 'sess-123', headers: {} };
    const meta = extractEventMetadata(request);
    expect(meta.sessionId).toBe('sess-123');
  });
});

describe('publishEventSafelyHelper', () => {
  it('should call publishEventSafely', async () => {
    const { publishEventSafely } = await import('../../../src/events/publishers/AuthEventPublisher');
    await publishEventSafelyHelper({ type: 'auth.login', id: '1', timestamp: '', version: '1', source: 'auth', data: {} } as any);
    expect(publishEventSafely).toHaveBeenCalled();
  });
});
