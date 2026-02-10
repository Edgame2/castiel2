/**
 * Unit tests for IntegrationSyncEventPublisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as publisherModule from '../../../src/events/publishers/IntegrationSyncEventPublisher';
import { log } from '../../../src/utils/logger';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockLoadConfig = vi.mocked(config).loadConfig;

describe('IntegrationSyncEventPublisher', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await publisherModule.closeEventPublisher();
  });

  afterEach(async () => {
    await publisherModule.closeEventPublisher();
  });

  describe('initializeEventPublisher', () => {
    it('returns early and logs warn when RabbitMQ URL is not configured', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: '', exchange: 'test_events', queue: 'q', bindings: [] },
      } as any);

      await publisherModule.initializeEventPublisher();

      expect(log.warn).toHaveBeenCalledWith(
        'RabbitMQ URL not configured, event publishing disabled',
        expect.objectContaining({ service: 'integration-sync' })
      );
      expect(log.info).not.toHaveBeenCalled();
    });

    it('creates EventPublisher and logs info when URL is configured', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'coder_events', queue: 'q', bindings: [] },
      } as any);

      await publisherModule.initializeEventPublisher();

      expect(log.info).toHaveBeenCalledWith(
        'Event publisher initialized',
        expect.objectContaining({ service: 'integration-sync' })
      );
    });

    it('throws and logs error when EventPublisher construction fails', async () => {
      const shared = await import('@coder/shared');
      vi.mocked(shared.EventPublisher).mockImplementationOnce(function () {
        throw new Error('Connection failed');
      });
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);

      await expect(publisherModule.initializeEventPublisher()).rejects.toThrow('Connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to initialize event publisher',
        expect.objectContaining({ service: 'integration-sync', error: expect.any(Error) })
      );
    });
  });

  describe('closeEventPublisher', () => {
    it('clears publisher so subsequent publish is skipped', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();
      await publisherModule.closeEventPublisher();

      await publisherModule.publishIntegrationSyncEvent('integration.sync.completed', 'tenant-1', {});

      expect(log.warn).toHaveBeenCalledWith(
        'Event publisher not initialized, skipping event',
        expect.objectContaining({ eventType: 'integration.sync.completed', service: 'integration-sync' })
      );
    });
  });

  describe('publishIntegrationSyncEvent', () => {
    it('logs warn and returns when publisher is not initialized', async () => {
      await publisherModule.publishIntegrationSyncEvent('integration.sync.completed', 'tenant-1', { taskId: 't1' });

      expect(log.warn).toHaveBeenCalledWith(
        'Event publisher not initialized, skipping event',
        expect.objectContaining({ eventType: 'integration.sync.completed', service: 'integration-sync' })
      );
    });

    it('calls publisher.publish when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const shared = await import('@coder/shared');
      const instance = vi.mocked(shared.EventPublisher).mock.results[vi.mocked(shared.EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishIntegrationSyncEvent(
        'integration.sync.completed',
        'tenant-1',
        { taskId: 't1', status: 'success' },
        { correlationId: 'c1', userId: 'u1' }
      );

      expect(instance.publish).toHaveBeenCalledWith(
        'integration.sync.completed',
        'tenant-1',
        { taskId: 't1', status: 'success' },
        { correlationId: 'c1', userId: 'u1' }
      );
    });

    it('logs error when publisher.publish throws', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const shared = await import('@coder/shared');
      const instance = vi.mocked(shared.EventPublisher).mock.results[vi.mocked(shared.EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };
      instance.publish.mockRejectedValueOnce(new Error('Publish failed'));

      await publisherModule.publishIntegrationSyncEvent('integration.sync.completed', 'tenant-1', {});

      expect(log.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.objectContaining({ eventType: 'integration.sync.completed', service: 'integration-sync', error: 'Publish failed' })
      );
    });
  });
});
