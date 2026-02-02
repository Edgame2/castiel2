/**
 * Unit tests for UserManagementEventPublisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as publisherModule from '../../../src/events/publishers/UserManagementEventPublisher';
import { log } from '../../../src/utils/logger';

const mockPublish = vi.fn().mockResolvedValue(undefined);
const mockConnectEventPublisher = vi.fn().mockResolvedValue(undefined);
const mockCloseConnection = vi.fn().mockResolvedValue(undefined);
const mockGetEventPublisher = vi.fn(() => ({ publish: mockPublish }));

vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(),
  loadConfig: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@coder/shared', () => ({
  getEventPublisher: (...args: unknown[]) => mockGetEventPublisher(...args),
  connectEventPublisher: (...args: unknown[]) => mockConnectEventPublisher(...args),
  closeConnection: (...args: unknown[]) => mockCloseConnection(...args),
}));

const mockGetConfig = vi.mocked(config).getConfig;

describe('UserManagementEventPublisher', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetEventPublisher.mockReturnValue({ publish: mockPublish });
    await publisherModule.closeEventPublisher();
  });

  afterEach(async () => {
    await publisherModule.closeEventPublisher();
  });

  describe('initializeEventPublisher', () => {
    it('returns early and logs warn when RabbitMQ URL is not configured', async () => {
      mockGetConfig.mockReturnValue({
        rabbitmq: { url: '', exchange: 'coder.events' },
      } as any);

      await publisherModule.initializeEventPublisher();

      expect(log.warn).toHaveBeenCalledWith(
        'RabbitMQ URL not configured, events will not be published',
        expect.objectContaining({ service: 'user-management' })
      );
      expect(mockConnectEventPublisher).not.toHaveBeenCalled();
    });

    it('calls connectEventPublisher and logs info when URL is configured', async () => {
      mockGetConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'coder.events' },
      } as any);

      await publisherModule.initializeEventPublisher();

      expect(mockConnectEventPublisher).toHaveBeenCalledWith(
        { url: 'amqp://localhost', exchange: 'coder.events' },
        'user-management'
      );
      expect(log.info).toHaveBeenCalledWith(
        'Event publisher initialized',
        expect.objectContaining({ service: 'user-management', exchange: 'coder.events' })
      );
    });

    it('logs error when connectEventPublisher throws', async () => {
      mockGetConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'coder.events' },
      } as any);
      mockConnectEventPublisher.mockRejectedValueOnce(new Error('Connection failed'));

      await publisherModule.initializeEventPublisher();

      expect(log.error).toHaveBeenCalledWith(
        'Failed to initialize event publisher',
        expect.any(Error),
        expect.objectContaining({ service: 'user-management' })
      );
    });
  });

  describe('closeEventPublisher', () => {
    it('calls closeConnection and logs info', async () => {
      await publisherModule.closeEventPublisher();

      expect(mockCloseConnection).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith(
        'Event publisher closed',
        expect.objectContaining({ service: 'user-management' })
      );
    });
  });

  describe('createBaseEvent', () => {
    it('returns partial event with type, timestamp, userId, organizationId, actorId, data, metadata', () => {
      const event = publisherModule.createBaseEvent(
        'user.profile_updated',
        'user-1',
        'org-1',
        'corr-1',
        { userId: 'user-1', changes: {} }
      );

      expect(event.type).toBe('user.profile_updated');
      expect(event.timestamp).toBeDefined();
      expect(event.userId).toBe('user-1');
      expect(event.organizationId).toBe('org-1');
      expect(event.actorId).toBe('user-1');
      expect(event.data).toEqual({ userId: 'user-1', changes: {} });
      expect(event.metadata).toEqual({ correlationId: 'corr-1' });
    });

    it('uses system as actorId when userId is undefined', () => {
      const event = publisherModule.createBaseEvent('user.deactivated', undefined, 'org-1');
      expect(event.actorId).toBe('system');
    });
  });

  describe('extractEventMetadata', () => {
    it('extracts ipAddress, userAgent, sessionId from request', () => {
      const request = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '10.0.0.1' },
      };
      (request as any).user = { sessionId: 's1' };

      const meta = publisherModule.extractEventMetadata(request);

      expect(meta.ipAddress).toBe('192.168.1.1');
      expect(meta.userAgent).toBe('Mozilla/5.0');
      expect(meta.sessionId).toBe('s1');
    });
  });

  describe('publishEventSafely', () => {
    it('logs debug and returns when getPublisher returns null', async () => {
      mockGetEventPublisher.mockReturnValue(null);

      await publisherModule.publishEventSafely({
        type: 'user.profile_updated',
        timestamp: new Date().toISOString(),
        organizationId: 'org-1',
        userId: 'user-1',
        data: {},
      } as any);

      expect(log.debug).toHaveBeenCalledWith(
        'Event publisher not initialized, skipping event',
        expect.objectContaining({ type: 'user.profile_updated', service: 'user-management' })
      );
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('calls publisher.publish when getPublisher returns publisher', async () => {
      mockGetConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'coder.events' },
      } as any);
      mockGetEventPublisher.mockReturnValue({ publish: mockPublish });

      await publisherModule.publishEventSafely({
        type: 'user.profile_updated',
        timestamp: new Date().toISOString(),
        organizationId: 'org-1',
        userId: 'user-1',
        data: { userId: 'user-1', changes: { name: 'New Name' } },
      } as any);

      expect(mockPublish).toHaveBeenCalledWith(
        'user.profile_updated',
        'org-1',
        { userId: 'user-1', changes: { name: 'New Name' } }
      );
    });

    it('uses global as tenantId when organizationId is undefined', async () => {
      mockGetEventPublisher.mockReturnValue({ publish: mockPublish });

      await publisherModule.publishEventSafely({
        type: 'user.deactivated',
        timestamp: new Date().toISOString(),
        userId: 'user-1',
        data: {},
      } as any);

      expect(mockPublish).toHaveBeenCalledWith('user.deactivated', 'global', {});
    });

    it('logs error when publisher.publish throws', async () => {
      mockGetEventPublisher.mockReturnValue({ publish: vi.fn().mockRejectedValue(new Error('Publish failed')) });

      await publisherModule.publishEventSafely({
        type: 'user.profile_updated',
        timestamp: new Date().toISOString(),
        organizationId: 'org-1',
        userId: 'user-1',
        data: {},
      } as any);

      expect(log.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({ type: 'user.profile_updated', userId: 'user-1', service: 'user-management' })
      );
    });
  });
});
