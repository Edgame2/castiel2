/**
 * Unit tests for FeedbackLearningEventPublisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as publisherModule from '../../../src/events/publishers/FeedbackLearningEventPublisher';
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

vi.mock('@coder/shared', () => ({
  EventPublisher: vi.fn().mockImplementation(function (this: unknown) {
    return { publish: vi.fn().mockResolvedValue(undefined), close: vi.fn() };
  }),
}));

const mockLoadConfig = vi.mocked(config).loadConfig;

describe('FeedbackLearningEventPublisher', () => {
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
        expect.objectContaining({ service: 'learning-service' })
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
        expect.objectContaining({ service: 'learning-service' })
      );
    });

    it('throws and logs error when EventPublisher construction fails', async () => {
      const { EventPublisher } = await import('@coder/shared');
      vi.mocked(EventPublisher).mockImplementationOnce(function () {
        throw new Error('Connection failed');
      });
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);

      await expect(publisherModule.initializeEventPublisher()).rejects.toThrow('Connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to initialize event publisher',
        expect.any(Error),
        expect.objectContaining({ service: 'learning-service' })
      );
    });
  });

  describe('closeEventPublisher', () => {
    it('clears publisher so subsequent publish is no-op', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();
      await publisherModule.closeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishFeedbackRecorded('tenant-1', {
        feedbackId: 'fb1',
        modelId: 'm1',
        feedbackType: 'action',
      });

      expect(instance.publish).not.toHaveBeenCalled();
    });
  });

  describe('publishFeedbackRecorded', () => {
    it('does nothing when publisher is not initialized', async () => {
      await publisherModule.publishFeedbackRecorded('tenant-1', {
        feedbackId: 'fb1',
        modelId: 'm1',
        feedbackType: 'action',
      });
      expect(log.warn).not.toHaveBeenCalled();
      expect(log.error).not.toHaveBeenCalled();
    });

    it('calls publisher.publish when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishFeedbackRecorded('tenant-1', {
        feedbackId: 'fb1',
        modelId: 'm1',
        feedbackType: 'action',
        predictionId: 'pred1',
      });

      expect(instance.publish).toHaveBeenCalledWith(
        'feedback.recorded',
        'tenant-1',
        { feedbackId: 'fb1', modelId: 'm1', feedbackType: 'action', predictionId: 'pred1' }
      );
    });

    it('logs error when publisher.publish throws', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };
      instance.publish.mockRejectedValueOnce(new Error('Publish failed'));

      await publisherModule.publishFeedbackRecorded('tenant-1', {
        feedbackId: 'fb1',
        modelId: 'm1',
        feedbackType: 'action',
      });

      expect(log.error).toHaveBeenCalledWith(
        'Failed to publish feedback.recorded',
        expect.any(Error),
        expect.objectContaining({ service: 'learning-service' })
      );
    });
  });

  describe('publishOutcomeRecorded', () => {
    it('calls publisher.publish when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishOutcomeRecorded('tenant-1', {
        outcomeId: 'out1',
        modelId: 'm1',
        outcomeType: 'win',
        success: true,
        predictionId: 'pred1',
      });

      expect(instance.publish).toHaveBeenCalledWith(
        'outcome.recorded',
        'tenant-1',
        { outcomeId: 'out1', modelId: 'm1', outcomeType: 'win', success: true, predictionId: 'pred1' }
      );
    });
  });

  describe('publishFeedbackTrendAlert', () => {
    it('calls publisher.publish when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishFeedbackTrendAlert('tenant-1', {
        modelId: 'm1',
        message: 'Accuracy dropped',
        period: { from: '2025-01-01', to: '2025-01-31' },
      });

      expect(instance.publish).toHaveBeenCalledWith(
        'feedback.trend.alert',
        'tenant-1',
        { modelId: 'm1', message: 'Accuracy dropped', period: { from: '2025-01-01', to: '2025-01-31' } }
      );
    });
  });
});
