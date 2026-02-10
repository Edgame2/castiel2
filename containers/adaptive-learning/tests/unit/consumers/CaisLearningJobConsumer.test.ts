/**
 * CaisLearningJobConsumer unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../../src/config';
import { CaisLearningService } from '../../../src/services/CaisLearningService';
import * as WorkflowJobPublisher from '../../../src/events/publishers/WorkflowJobPublisher';

vi.mock('@coder/shared', () => ({
  EventConsumer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../src/services/CaisLearningService', () => ({
  CaisLearningService: vi.fn().mockImplementation(function (this: { runLearningJob: ReturnType<typeof vi.fn> }) {
    this.runLearningJob = vi.fn().mockResolvedValue({ tenantsProcessed: 0, weightsUpdated: 0 });
  }),
}));

vi.mock('../../../src/events/publishers/WorkflowJobPublisher', () => ({
  initializeWorkflowJobPublisher: vi.fn().mockResolvedValue(undefined),
  publishJobCompleted: vi.fn().mockResolvedValue(undefined),
  publishJobFailed: vi.fn().mockResolvedValue(undefined),
}));

describe('CaisLearningJobConsumer', () => {
  let mockOn: ReturnType<typeof vi.fn>;
  let mockStart: ReturnType<typeof vi.fn>;
  let mockStop: ReturnType<typeof vi.fn>;
  let triggerHandler: (event: { data?: { job?: string; metadata?: Record<string, unknown> } }) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockOn = vi.fn((_routingKey: string, handler: (event: unknown) => Promise<void>) => {
      triggerHandler = handler;
    });
    mockStart = vi.fn().mockResolvedValue(undefined);
    mockStop = vi.fn().mockResolvedValue(undefined);
    (EventConsumer as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: unknown) {
      return { on: mockOn, start: mockStart, stop: mockStop };
    });
  });

  it('skips initialization when batch_jobs not configured', async () => {
    vi.mocked(loadConfig).mockReturnValue({ rabbitmq: {} } as never);
    const mod = await import('../../../src/events/consumers/CaisLearningJobConsumer');
    await mod.initializeCaisLearningJobConsumer();
    expect(EventConsumer).not.toHaveBeenCalled();
  });

  it('registers workflow.job.trigger handler and starts consumer when configured', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: {
        url: 'amqp://localhost',
        exchange: 'events',
        batch_jobs: { queue: 'batch_queue', routing_keys: ['workflow.job.trigger'] },
      },
    } as never);
    const mod = await import('../../../src/events/consumers/CaisLearningJobConsumer');
    await mod.initializeCaisLearningJobConsumer();
    expect(WorkflowJobPublisher.initializeWorkflowJobPublisher).toHaveBeenCalled();
    expect(mockOn).toHaveBeenCalledWith('workflow.job.trigger', expect.any(Function));
    expect(mockStart).toHaveBeenCalled();
  });

  it('handler ignores events when job is not cais-learning', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: {
        url: 'amqp://localhost',
        exchange: 'events',
        batch_jobs: { queue: 'q', routing_keys: ['workflow.job.trigger'] },
      },
    } as never);
    await import('../../../src/events/consumers/CaisLearningJobConsumer').then((m) => m.initializeCaisLearningJobConsumer());
    expect(triggerHandler).toBeDefined();
    const runLearningJob = vi.fn();
    (CaisLearningService as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: { runLearningJob: ReturnType<typeof vi.fn> }) {
      this.runLearningJob = runLearningJob;
    });
    await triggerHandler!({ data: { job: 'other-job' } });
    expect(runLearningJob).not.toHaveBeenCalled();
  });

  it('handler runs CaisLearningService and publishes completed on success', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: {
        url: 'amqp://localhost',
        exchange: 'events',
        batch_jobs: { queue: 'q', routing_keys: ['workflow.job.trigger'] },
      },
    } as never);
    await import('../../../src/events/consumers/CaisLearningJobConsumer').then((m) => m.initializeCaisLearningJobConsumer());
    const runLearningJob = vi.fn().mockResolvedValue({ tenantsProcessed: 1, weightsUpdated: 1 });
    (CaisLearningService as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: { runLearningJob: ReturnType<typeof vi.fn> }) {
      this.runLearningJob = runLearningJob;
    });
    await triggerHandler!({ data: { job: 'cais-learning' } });
    expect(runLearningJob).toHaveBeenCalled();
    expect(WorkflowJobPublisher.publishJobCompleted).toHaveBeenCalledWith('cais-learning', expect.any(String));
  });

  it('handler publishes failed on runLearningJob error', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: {
        url: 'amqp://localhost',
        exchange: 'events',
        batch_jobs: { queue: 'q', routing_keys: ['workflow.job.trigger'] },
      },
    } as never);
    await import('../../../src/events/consumers/CaisLearningJobConsumer').then((m) => m.initializeCaisLearningJobConsumer());
    (CaisLearningService as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: { runLearningJob: ReturnType<typeof vi.fn> }) {
      this.runLearningJob = vi.fn().mockRejectedValue(new Error('job failed'));
    });
    await triggerHandler!({ data: { job: 'cais-learning' } });
    expect(WorkflowJobPublisher.publishJobFailed).toHaveBeenCalledWith('cais-learning', 'job failed', expect.any(String));
  });
});
