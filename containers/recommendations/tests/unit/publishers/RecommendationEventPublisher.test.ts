/**
 * Unit tests for RecommendationEventPublisher
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as RecommendationEventPublisher from '../../../src/events/publishers/RecommendationEventPublisher';
import { loadConfig } from '../../../src/config';

vi.mock('@coder/shared', () => ({
  EventPublisher: vi.fn().mockImplementation(function (this: any) {
    this.publish = vi.fn().mockResolvedValue(undefined);
  }),
}));

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('RecommendationEventPublisher', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: { url: 'amqp://test', exchange: 'test_events' },
    } as any);
    await RecommendationEventPublisher.closeEventPublisher();
  });

  describe('initializeEventPublisher', () => {
    it('returns without creating publisher when rabbitmq.url is empty', async () => {
      vi.mocked(loadConfig).mockReturnValueOnce({
        rabbitmq: { url: '', exchange: 'events' },
      } as any);
      await RecommendationEventPublisher.initializeEventPublisher();
      const { EventPublisher } = await import('@coder/shared');
      expect(EventPublisher).not.toHaveBeenCalled();
    });
  });

  describe('publishRecommendationEvent', () => {
    it('does not throw when publisher is null', async () => {
      await RecommendationEventPublisher.closeEventPublisher();
      await expect(
        RecommendationEventPublisher.publishRecommendationEvent('test.event', 'tenant-1', {})
      ).resolves.toBeUndefined();
    });
  });

  describe('publishRemediationWorkflowCreated', () => {
    it('resolves without throwing', async () => {
      await expect(
        RecommendationEventPublisher.publishRemediationWorkflowCreated('tenant-1', {
          workflowId: 'wf-1',
          opportunityId: 'opp-1',
          assignedTo: 'user-1',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('publishRemediationStepCompleted', () => {
    it('resolves without throwing', async () => {
      await expect(
        RecommendationEventPublisher.publishRemediationStepCompleted('tenant-1', {
          workflowId: 'wf-1',
          stepNumber: 1,
          completedBy: 'user-1',
          allStepsComplete: false,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('publishRemediationWorkflowCompleted', () => {
    it('resolves without throwing', async () => {
      await expect(
        RecommendationEventPublisher.publishRemediationWorkflowCompleted('tenant-1', {
          workflowId: 'wf-1',
          opportunityId: 'opp-1',
          status: 'completed',
        })
      ).resolves.toBeUndefined();
    });
  });
});
