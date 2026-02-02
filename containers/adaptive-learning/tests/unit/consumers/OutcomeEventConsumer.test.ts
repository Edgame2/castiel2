/**
 * OutcomeEventConsumer unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../../src/config';
import { OutcomeCollectorService } from '../../../src/services/OutcomeCollectorService';

vi.mock('@coder/shared', () => ({
  EventConsumer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../src/services/OutcomeCollectorService', () => ({
  OutcomeCollectorService: vi.fn().mockImplementation(function (this: unknown) {
    return { recordFromEvent: vi.fn().mockResolvedValue({ id: 'doc-1' }) };
  }),
}));

describe('OutcomeEventConsumer', () => {
  let mockOn: ReturnType<typeof vi.fn>;
  let mockStart: ReturnType<typeof vi.fn>;
  let outcomeHandler: (event: { tenantId?: string; data?: Record<string, unknown> }) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOn = vi.fn((_key: string, handler: (event: unknown) => Promise<void>) => {
      outcomeHandler = handler;
    });
    mockStart = vi.fn().mockResolvedValue(undefined);
    (EventConsumer as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: unknown) {
      return { on: mockOn, start: mockStart };
    });
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: { url: 'amqp://localhost', exchange: 'events', queue: 'outcome_queue', bindings: ['adaptive.learning.outcome.recorded'] },
    } as never);
  });

  it('registers adaptive.learning.outcome.recorded handler and starts consumer', async () => {
    await import('../../../src/events/consumers/OutcomeEventConsumer').then((m) => m.initializeEventConsumer());
    expect(mockOn).toHaveBeenCalledWith('adaptive.learning.outcome.recorded', expect.any(Function));
    expect(mockStart).toHaveBeenCalled();
  });

  it('handler calls recordFromEvent with event data', async () => {
    const recordFromEvent = vi.fn().mockResolvedValue({ id: 'doc-1' });
    (OutcomeCollectorService as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: unknown) {
      return { recordFromEvent };
    });
    await import('../../../src/events/consumers/OutcomeEventConsumer').then((m) => m.initializeEventConsumer());
    expect(outcomeHandler).toBeDefined();
    await outcomeHandler!({
      tenantId: 'tenant-1',
      data: { component: 'risk-evaluation', prediction: 0.75, context: {} },
    });
    expect(recordFromEvent).toHaveBeenCalledWith('tenant-1', {
      component: 'risk-evaluation',
      prediction: 0.75,
      context: {},
    });
  });

  it('does not start when rabbitmq url missing', async () => {
    vi.mocked(loadConfig).mockReturnValue({ rabbitmq: {} } as never);
    await import('../../../src/events/consumers/OutcomeEventConsumer').then((m) => m.initializeEventConsumer());
    expect(EventConsumer).not.toHaveBeenCalled();
  });
});
