/**
 * Unit tests for SyncTaskEventConsumer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as consumerModule from '../../../src/events/consumers/SyncTaskEventConsumer';
import { log } from '../../../src/utils/logger';
import { EventConsumer } from '@coder/shared';

vi.mock('../../../src/config', () => ({
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

vi.mock('../../../src/services/IntegrationSyncService', () => ({
  IntegrationSyncService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      createSyncTask: vi.fn().mockResolvedValue({ taskId: 'task-1' }),
      executeSyncTask: vi.fn().mockResolvedValue(undefined),
      updateSyncExecutionStats: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('../../../src/services/TokenRefreshService', () => ({
  TokenRefreshService: vi.fn().mockImplementation(function (this: unknown) {
    return { refreshConnectionTokens: vi.fn().mockResolvedValue(undefined) };
  }),
}));

const mockGetContainer = vi.fn();
vi.mock('@coder/shared/database', () => ({
  getContainer: (...args: unknown[]) => mockGetContainer(...args),
}));

const mockLoadConfig = vi.mocked(config).loadConfig;

describe('SyncTaskEventConsumer', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetContainer.mockReturnValue({
      items: {
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
        })),
      },
    });
    await consumerModule.closeEventConsumer();
  });

  afterEach(async () => {
    await consumerModule.closeEventConsumer();
  });

  describe('initializeEventConsumer', () => {
    it('returns early and logs warn when RabbitMQ URL is not configured', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: '', exchange: 'test_events', queue: 'q', bindings: [] },
      } as any);

      await consumerModule.initializeEventConsumer();

      expect(log.warn).toHaveBeenCalledWith(
        'RabbitMQ URL not configured, event consumption disabled',
        expect.objectContaining({ service: 'integration-sync' })
      );
      expect(log.info).not.toHaveBeenCalled();
    });

    it('creates consumer, registers handlers, calls start and logs info when URL is configured', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: {
          url: 'amqp://localhost',
          exchange: 'coder_events',
          queue: 'integration_sync',
          bindings: [],
        },
      } as any);

      await consumerModule.initializeEventConsumer();

      expect(log.info).toHaveBeenCalledWith(
        'Sync task event consumer initialized and started',
        expect.objectContaining({ service: 'integration-sync' })
      );
      expect(EventConsumer).toHaveBeenCalled();
      const instance = vi.mocked(EventConsumer).mock.results[vi.mocked(EventConsumer).mock.results.length - 1]
        ?.value as { on: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> };
      expect(instance.on).toHaveBeenCalledWith('integration.sync.scheduled', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('integration.webhook.received', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('integration.token.refresh-requested', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('integration.data.mapped', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('integration.data.mapping.failed', expect.any(Function));
      expect(instance.start).toHaveBeenCalled();
    });

    it('throws and logs error when EventConsumer construction fails', async () => {
      vi.mocked(EventConsumer).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);

      await expect(consumerModule.initializeEventConsumer()).rejects.toThrow('Connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to initialize sync task event consumer',
        expect.any(Error),
        expect.objectContaining({ service: 'integration-sync' })
      );
    });
  });

  describe('closeEventConsumer', () => {
    it('calls consumer.stop() and clears consumer when consumer was initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await consumerModule.initializeEventConsumer();

      const instance = vi.mocked(EventConsumer).mock.results[vi.mocked(EventConsumer).mock.results.length - 1]
        ?.value as { stop: ReturnType<typeof vi.fn> };

      await consumerModule.closeEventConsumer();

      expect(instance.stop).toHaveBeenCalled();
    });
  });
});
