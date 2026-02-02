/**
 * Unit tests for MLAuditConsumer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MLAuditConsumer } from '../../../src/events/consumers/MLAuditConsumer';
import { getConfig } from '../../../src/config';

vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../src/metrics', () => ({
  rabbitmqMessagesConsumedTotal: { inc: vi.fn() },
}));

vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn().mockResolvedValue({
      createChannel: vi.fn().mockResolvedValue({
        assertExchange: vi.fn(),
        assertQueue: vi.fn(),
        bindQueue: vi.fn(),
        prefetch: vi.fn(),
        consume: vi.fn(),
        ack: vi.fn(),
        nack: vi.fn(),
      }),
      on: vi.fn(),
      close: vi.fn(),
    }),
  },
}));

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: vi.fn(() => ({
    getContainerClient: vi.fn(() => ({
      getBlockBlobClient: vi.fn(() => ({
        uploadData: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  })),
}));

describe('MLAuditConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('returns without connecting when data_lake.connection_string is missing', async () => {
      vi.mocked(getConfig).mockReturnValue({
        data_lake: undefined,
        rabbitmq: { url: 'amqp://localhost', exchange: 'e' },
      } as any);
      const consumer = new MLAuditConsumer();
      await consumer.start();
      const amqp = await import('amqplib');
      expect(amqp.default.connect).not.toHaveBeenCalled();
    });

    it('returns without connecting when rabbitmq.ml_audit.queue or bindings missing', async () => {
      vi.mocked(getConfig).mockReturnValue({
        data_lake: { connection_string: 'x', container: 'c', audit_path_prefix: 'audit/' },
        rabbitmq: { url: 'amqp://localhost', exchange: 'e', ml_audit: { queue: '', bindings: [] } },
      } as any);
      const consumer = new MLAuditConsumer();
      await consumer.start();
      const amqp = await import('amqplib');
      expect(amqp.default.connect).not.toHaveBeenCalled();
    });
  });
});
