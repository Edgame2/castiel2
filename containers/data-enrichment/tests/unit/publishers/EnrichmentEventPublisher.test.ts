/**
 * Unit tests for EnrichmentEventPublisher
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as EnrichmentEventPublisher from '../../../src/events/publishers/EnrichmentEventPublisher';
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

describe('EnrichmentEventPublisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      rabbitmq: { url: 'amqp://test', exchange: 'events' },
    } as any);
    return EnrichmentEventPublisher.closeEventPublisher();
  });

  describe('initializeEventPublisher', () => {
    it('returns without creating publisher when rabbitmq.url is empty', async () => {
      vi.mocked(loadConfig).mockReturnValueOnce({
        rabbitmq: { url: '', exchange: 'events' },
      } as any);
      await EnrichmentEventPublisher.initializeEventPublisher();
      const { EventPublisher } = await import('@coder/shared');
      expect(EventPublisher).not.toHaveBeenCalled();
    });
  });

  describe('publishEnrichmentEvent', () => {
    it('does not throw when publisher is null', async () => {
      await EnrichmentEventPublisher.closeEventPublisher();
      await expect(
        EnrichmentEventPublisher.publishEnrichmentEvent('enrichment.completed', 'tenant-1', {})
      ).resolves.toBeUndefined();
    });
  });

  describe('closeEventPublisher', () => {
    it('resolves without throwing', async () => {
      await expect(EnrichmentEventPublisher.closeEventPublisher()).resolves.toBeUndefined();
    });
  });
});
