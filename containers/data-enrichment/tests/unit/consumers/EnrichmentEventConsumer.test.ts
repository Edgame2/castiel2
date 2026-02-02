/**
 * Unit tests for EnrichmentEventConsumer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as EnrichmentEventConsumer from '../../../src/events/consumers/EnrichmentEventConsumer';
import { loadConfig } from '../../../src/config';

vi.mock('@coder/shared', () => ({
  EventConsumer: vi.fn().mockImplementation(function (this: any) {
    this.on = vi.fn();
  }),
}));

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('EnrichmentEventConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeEventConsumer', () => {
    it('returns without creating consumer when rabbitmq.url is empty', async () => {
      vi.mocked(loadConfig).mockReturnValue({
        rabbitmq: { url: '', exchange: 'events', queue: 'q', bindings: [] },
      } as any);
      await EnrichmentEventConsumer.initializeEventConsumer();
      const { EventConsumer } = await import('@coder/shared');
      expect(EventConsumer).not.toHaveBeenCalled();
    });
  });
});
