/**
 * Unit tests for WorkflowEventPublisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../../../src/config';
import * as publisherModule from '../../../src/events/publishers/WorkflowEventPublisher';
import { log } from '../../../src/utils/logger';

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn().mockReturnValue({ end: vi.fn() }),
    })),
  },
}));

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

describe('WorkflowEventPublisher', () => {
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
        expect.objectContaining({ service: 'workflow-orchestrator' })
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
        expect.objectContaining({ service: 'workflow-orchestrator' })
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

      await publisherModule.publishWorkflowEvent('workflow.step.completed', 'tenant-1', {});

      expect(log.warn).toHaveBeenCalledWith(
        'Event publisher not initialized, skipping event',
        expect.objectContaining({ eventType: 'workflow.step.completed', service: 'workflow-orchestrator' })
      );
    });
  });

  describe('publishWorkflowEvent', () => {
    it('logs warn and returns when publisher is not initialized', async () => {
      await publisherModule.publishWorkflowEvent('workflow.step.completed', 'tenant-1', {});

      expect(log.warn).toHaveBeenCalledWith(
        'Event publisher not initialized, skipping event',
        expect.objectContaining({ eventType: 'workflow.step.completed', service: 'workflow-orchestrator' })
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

      await publisherModule.publishWorkflowEvent('workflow.step.completed', 'tenant-1', { workflowId: 'w1' }, { correlationId: 'c1' });

      expect(instance.publish).toHaveBeenCalledWith('workflow.step.completed', 'tenant-1', { workflowId: 'w1' }, { correlationId: 'c1' });
    });
  });

  describe('publishJobTrigger', () => {
    it('logs warn and returns when publisher is not initialized', async () => {
      await publisherModule.publishJobTrigger('risk-clustering');

      expect(log.warn).toHaveBeenCalledWith(
        'Event publisher not initialized, skipping job trigger',
        expect.objectContaining({ job: 'risk-clustering', service: 'workflow-orchestrator' })
      );
    });

    it('calls publisher.publish with workflow.job.trigger when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const shared = await import('@coder/shared');
      const instance = vi.mocked(shared.EventPublisher).mock.results[vi.mocked(shared.EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      await publisherModule.publishJobTrigger('risk-clustering', { schedule: '0 * * * *' });

      expect(instance.publish).toHaveBeenCalledWith(
        'workflow.job.trigger',
        '00000000-0000-0000-0000-000000000001',
        expect.objectContaining({
          job: 'risk-clustering',
          metadata: { schedule: '0 * * * *' },
          triggeredBy: 'scheduler',
        })
      );
    });
  });

  describe('publishHitlApprovalCompleted', () => {
    it('logs warn and returns when publisher is not initialized', async () => {
      await publisherModule.publishHitlApprovalCompleted('tenant-1', {
        opportunityId: 'o1',
        approvalId: 'a1',
        approved: true,
        decidedBy: 'u1',
        decidedAt: new Date().toISOString(),
      });

      expect(log.warn).toHaveBeenCalledWith(
        'Event publisher not initialized, skipping hitl.approval.completed',
        expect.objectContaining({ approvalId: 'a1', service: 'workflow-orchestrator' })
      );
    });

    it('calls publisher.publish with hitl.approval.completed when publisher is initialized', async () => {
      mockLoadConfig.mockReturnValue({
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      await publisherModule.initializeEventPublisher();

      const shared = await import('@coder/shared');
      const instance = vi.mocked(shared.EventPublisher).mock.results[vi.mocked(shared.EventPublisher).mock.results.length - 1]
        ?.value as { publish: ReturnType<typeof vi.fn> };

      const data = {
        opportunityId: 'o1',
        approvalId: 'a1',
        approved: true,
        decidedBy: 'u1',
        decidedAt: '2025-01-01T00:00:00.000Z',
      };
      await publisherModule.publishHitlApprovalCompleted('tenant-1', data);

      expect(instance.publish).toHaveBeenCalledWith('hitl.approval.completed', 'tenant-1', { ...data, tenantId: 'tenant-1' });
    });
  });
});
