/**
 * Unit tests for ForecastEventConsumer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as consumerModule from '../../../src/events/consumers/ForecastEventConsumer';
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

vi.mock('../../../src/services/ForecastingService', () => ({
  ForecastingService: vi.fn().mockImplementation(function (this: unknown) {
    return { generateForecast: vi.fn().mockResolvedValue(undefined) };
  }),
}));

const mockLoadConfig = vi.mocked(config).loadConfig;

describe('ForecastEventConsumer', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
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
        expect.objectContaining({ service: 'forecasting' })
      );
      expect(log.info).not.toHaveBeenCalled();
    });

    it('creates consumer, registers handlers, calls start and logs info when URL is configured', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: {
          url: 'amqp://localhost',
          exchange: 'coder_events',
          queue: 'forecasting_queue',
          bindings: [],
        },
      } as any);

      await consumerModule.initializeEventConsumer();

      expect(log.info).toHaveBeenCalledWith(
        'Event consumer initialized and started',
        expect.objectContaining({ service: 'forecasting' })
      );
      expect(EventConsumer).toHaveBeenCalled();
      const instance = vi.mocked(EventConsumer).mock.results[vi.mocked(EventConsumer).mock.results.length - 1]
        ?.value as { on: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> };
      expect(instance.on).toHaveBeenCalledWith('opportunity.updated', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('integration.opportunity.updated', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('risk.evaluation.completed', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('integration.sync.completed', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('workflow.forecast.requested', expect.any(Function));
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
        'Failed to initialize event consumer',
        expect.any(Error),
        expect.objectContaining({ service: 'forecasting' })
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

    it('is no-op when consumer was never initialized', async () => {
      await consumerModule.closeEventConsumer();
      expect(EventConsumer).not.toHaveBeenCalled();
    });
  });
});
