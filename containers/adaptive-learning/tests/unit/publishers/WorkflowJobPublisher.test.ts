/**
 * WorkflowJobPublisher unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../../src/config';

vi.mock('@coder/shared', () => ({
  EventPublisher: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

describe('WorkflowJobPublisher', () => {
  let mockConnect: ReturnType<typeof vi.fn>;
  let mockPublish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect = vi.fn().mockResolvedValue(undefined);
    mockPublish = vi.fn().mockResolvedValue(undefined);
    (EventPublisher as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: unknown) {
      return { connect: mockConnect, publish: mockPublish };
    });
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: { url: 'amqp://localhost', exchange: 'coder_events' },
    } as never);
  });

  it('does not connect when rabbitmq url missing', async () => {
    vi.mocked(loadConfig).mockReturnValue({ rabbitmq: {} } as never);
    const mod = await import('../../../src/events/publishers/WorkflowJobPublisher');
    await mod.initializeWorkflowJobPublisher();
    expect(EventPublisher).not.toHaveBeenCalled();
  });

  it('connects when rabbitmq url present', async () => {
    const mod = await import('../../../src/events/publishers/WorkflowJobPublisher');
    await mod.initializeWorkflowJobPublisher();
    expect(EventPublisher).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'amqp://localhost', exchange: 'coder_events', exchangeType: 'topic' }),
      'adaptive-learning'
    );
    expect(mockConnect).toHaveBeenCalled();
  });

  it('publishJobCompleted publishes workflow.job.completed', async () => {
    await import('../../../src/events/publishers/WorkflowJobPublisher').then((m) => m.initializeWorkflowJobPublisher());
    const mod = await import('../../../src/events/publishers/WorkflowJobPublisher');
    await mod.publishJobCompleted('cais-learning', '2025-02-01T12:00:00Z');
    expect(mockPublish).toHaveBeenCalledWith(
      'workflow.job.completed',
      expect.any(String),
      expect.objectContaining({ job: 'cais-learning', status: 'success', completedAt: '2025-02-01T12:00:00Z' })
    );
  });

  it('publishJobFailed publishes workflow.job.failed', async () => {
    await import('../../../src/events/publishers/WorkflowJobPublisher').then((m) => m.initializeWorkflowJobPublisher());
    const mod = await import('../../../src/events/publishers/WorkflowJobPublisher');
    await mod.publishJobFailed('cais-learning', 'error message', '2025-02-01T12:00:00Z');
    expect(mockPublish).toHaveBeenCalledWith(
      'workflow.job.failed',
      expect.any(String),
      expect.objectContaining({ job: 'cais-learning', error: 'error message', failedAt: '2025-02-01T12:00:00Z' })
    );
  });
});
