/**
 * Auth Event Publisher unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as publisher from '../../../src/events/publishers/AuthEventPublisher';

vi.mock('@coder/shared', () => ({
  EventPublisher: vi.fn().mockImplementation(function (this: any) {
    this.publish = vi.fn().mockResolvedValue(undefined);
  }),
  getChannel: vi.fn().mockResolvedValue(undefined),
  closeConnection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(() => ({ rabbitmq: { url: 'amqp://localhost', exchange: 'coder.events' } })),
}));
vi.mock('../../../src/utils/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('AuthEventPublisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBaseEvent', () => {
    it('should create event with required fields', () => {
      const event = publisher.createBaseEvent('auth.login', 'user-1', 'tenant-1', 'corr-1', { ip: '1.2.3.4' });
      expect(event.id).toBeDefined();
      expect(event.type).toBe('auth.login');
      expect(event.timestamp).toBeDefined();
      expect(event.version).toBe('1.0');
      expect(event.source).toBe('auth-service');
      expect(event.userId).toBe('user-1');
      expect(event.tenantId).toBe('tenant-1');
      expect(event.correlationId).toBe('corr-1');
      expect(event.data).toEqual({ ip: '1.2.3.4' });
    });
  });

  describe('extractEventMetadata', () => {
    it('should extract ipAddress and userAgent from request', () => {
      const request = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      const meta = publisher.extractEventMetadata(request);
      expect(meta.ipAddress).toBe('192.168.1.1');
      expect(meta.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('initializeEventPublisher', () => {
    it('should resolve when rabbitmq url configured', async () => {
      await expect(publisher.initializeEventPublisher()).resolves.toBeUndefined();
    });
  });

  describe('closeEventPublisher', () => {
    it('should resolve', async () => {
      await expect(publisher.closeEventPublisher()).resolves.toBeUndefined();
    });
  });
});
