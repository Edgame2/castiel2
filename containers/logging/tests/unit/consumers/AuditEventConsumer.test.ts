/**
 * Unit tests for AuditEventConsumer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditEventConsumer } from '../../../src/events/consumers/AuditEventConsumer';
import { IngestionService } from '../../../src/services/IngestionService';
import { getConfig } from '../../../src/config';

vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(() => ({
    rabbitmq: { url: '', exchange: 'events', queue: 'queue', bindings: ['#'] },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn().mockResolvedValue({
      createChannel: vi.fn().mockResolvedValue({
        assertExchange: vi.fn(),
        assertQueue: vi.fn().mockResolvedValue({ queue: 'queue' }),
        bindQueue: vi.fn(),
        prefetch: vi.fn(),
        consume: vi.fn(),
        ack: vi.fn(),
        nack: vi.fn(),
        close: vi.fn(),
      }),
      on: vi.fn(),
      close: vi.fn(),
    }),
  },
}));

describe('AuditEventConsumer', () => {
  let mockIngestionService: IngestionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIngestionService = {
      ingestFromEvent: vi.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('constructor', () => {
    it('creates consumer with ingestion service', () => {
      const consumer = new AuditEventConsumer(mockIngestionService);
      expect(consumer).toBeDefined();
    });
  });

  describe('start', () => {
    it('returns without connecting when rabbitmq.url is empty', async () => {
      vi.mocked(getConfig).mockReturnValue({
        rabbitmq: { url: '', exchange: 'e', queue: 'q', bindings: [] },
      } as any);
      const consumer = new AuditEventConsumer(mockIngestionService);
      await consumer.start();
      const amqp = await import('amqplib');
      expect(amqp.default.connect).not.toHaveBeenCalled();
    });
  });
});
