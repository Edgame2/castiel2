/**
 * Unit tests for LLMReasoningEventPublisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as publisherModule from '../../../src/events/publishers/LLMReasoningEventPublisher';
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

describe('LLMReasoningEventPublisher', () => {
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
        rabbitmq: { url: '', exchange: 'coder_events', queue: 'q', bindings: [] },
      } as any);

      await publisherModule.initializeEventPublisher();

      expect(log.warn).toHaveBeenCalledWith(
        'RabbitMQ URL not configured, event publishing disabled',
        expect.objectContaining({ service: 'llm-service' })
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
        expect.objectContaining({ service: 'llm-service' })
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
        expect.objectContaining({ service: 'llm-service' })
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

      await publisherModule.publishReasoningRequested('tenant-1', {
        requestId: 'r1',
        reasoningType: 'explanation',
        opportunityId: 'o1',
      });

      expect(instance.publish).not.toHaveBeenCalled();
    });
  });

  describe('publishReasoningRequested', () => {
    it('calls publisher.publish when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishReasoningRequested('tenant-1', {
        requestId: 'r1',
        reasoningType: 'explanation',
        opportunityId: 'o1',
        predictionId: 'p1',
        correlationId: 'c1',
      });

      expect(instance.publish).toHaveBeenCalledWith(
        'llm.reasoning.requested',
        'tenant-1',
        { requestId: 'r1', reasoningType: 'explanation', opportunityId: 'o1', predictionId: 'p1', correlationId: 'c1' }
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

      await publisherModule.publishReasoningRequested('tenant-1', {
        requestId: 'r1',
        reasoningType: 'explanation',
        opportunityId: 'o1',
      });

      expect(log.error).toHaveBeenCalledWith(
        'Failed to publish llm.reasoning.requested',
        expect.any(Error),
        expect.objectContaining({ service: 'llm-service' })
      );
    });
  });

  describe('publishReasoningCompleted', () => {
    it('calls publisher.publish when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishReasoningCompleted('tenant-1', {
        requestId: 'r1',
        output: { text: 'done' },
        latency: 100,
        correlationId: 'c1',
      });

      expect(instance.publish).toHaveBeenCalledWith(
        'llm.reasoning.completed',
        'tenant-1',
        { requestId: 'r1', output: { text: 'done' }, latency: 100, correlationId: 'c1' }
      );
    });
  });

  describe('publishReasoningFailed', () => {
    it('calls publisher.publish when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const { EventPublisher } = await import('@coder/shared');
      const instance = vi.mocked(EventPublisher).mock.results[vi.mocked(EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishReasoningFailed('tenant-1', {
        requestId: 'r1',
        error: 'Something failed',
        correlationId: 'c1',
      });

      expect(instance.publish).toHaveBeenCalledWith(
        'llm.reasoning.failed',
        'tenant-1',
        { requestId: 'r1', error: 'Something failed', correlationId: 'c1' }
      );
    });
  });
});
