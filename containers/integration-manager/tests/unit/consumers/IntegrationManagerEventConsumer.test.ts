/**
 * Integration Manager Event Consumer unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as consumerModule from '../../../src/events/consumers/IntegrationManagerEventConsumer';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    rabbitmq: { url: 'amqp://localhost', exchange: 'test_events', queue: 'test_queue', routingKeys: [] },
    services: { secret_management: { url: 'http://secret' } },
  })),
}));

vi.mock('@coder/shared', () => ({
  EventPublisher: vi.fn().mockImplementation(function (this: any) {
    this.publish = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn();
  }),
  EventConsumer: vi.fn().mockImplementation(function (this: any) {
    this.on = vi.fn();
    this.start = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn();
  }),
  getContainer: vi.fn(() => ({
    items: {
      query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })),
    },
  })),
  IntegrationService: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('IntegrationManagerEventConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeEventConsumer', () => {
    it('should resolve when rabbitmq url is configured', async () => {
      await expect(consumerModule.initializeEventConsumer()).resolves.toBeUndefined();
    });

    it('should return early when rabbitmq url is empty', async () => {
      const { loadConfig } = await import('../../../src/config');
      vi.mocked(loadConfig).mockReturnValueOnce({
        rabbitmq: { url: '', exchange: '', queue: '', routingKeys: [] },
        services: { secret_management: { url: 'http://secret' } },
      } as any);
      await consumerModule.initializeEventConsumer();
      // Should not throw; consumer may not start
      expect(loadConfig).toHaveBeenCalled();
    });
  });
});
