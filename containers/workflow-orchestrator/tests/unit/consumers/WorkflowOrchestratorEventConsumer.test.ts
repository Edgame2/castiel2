/**
 * Unit tests for WorkflowOrchestratorEventConsumer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as consumerModule from '../../../src/events/consumers/WorkflowOrchestratorEventConsumer';
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

vi.mock('../../../src/services/WorkflowOrchestratorService', () => ({
  WorkflowOrchestratorService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      startOpportunityAnalysisWorkflow: vi.fn().mockResolvedValue(undefined),
      handleStepCompletion: vi.fn().mockResolvedValue(undefined),
      handleStepFailure: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('../../../src/services/HitlApprovalService', () => ({
  createFromEvent: vi.fn().mockResolvedValue({ id: 'approval-1', status: 'pending' }),
}));

const mockLoadConfig = vi.mocked(config).loadConfig;

describe('WorkflowOrchestratorEventConsumer', () => {
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
        expect.objectContaining({ service: 'workflow-orchestrator' })
      );
      expect(log.info).not.toHaveBeenCalled();
    });

    it('creates consumer, registers handlers, calls start and logs info when URL is configured', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: {
          url: 'amqp://localhost',
          exchange: 'coder_events',
          queue: 'workflow_queue',
          bindings: [],
        },
      } as any);

      await consumerModule.initializeEventConsumer();

      expect(log.info).toHaveBeenCalledWith(
        'Event consumer initialized and started',
        expect.objectContaining({ service: 'workflow-orchestrator' })
      );
      expect(EventConsumer).toHaveBeenCalled();
      const instance = vi.mocked(EventConsumer).mock.results[vi.mocked(EventConsumer).mock.results.length - 1]
        ?.value as { on: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> };
      expect(instance.on).toHaveBeenCalledWith('integration.opportunity.updated', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('shard.updated', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('risk.evaluation.completed', expect.any(Function));
      expect(instance.on).toHaveBeenCalledWith('hitl.approval.requested', expect.any(Function));
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
        expect.objectContaining({ service: 'workflow-orchestrator' })
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
