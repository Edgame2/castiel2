/**
 * EventPublisher unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventPublisher } from '../../../src/events/EventPublisher';

const mockPublish = vi.fn().mockReturnValue(true);
const mockChannelClose = vi.fn().mockResolvedValue(undefined);
const mockConnectionClose = vi.fn().mockResolvedValue(undefined);
const mockAssertExchange = vi.fn().mockResolvedValue(undefined);
const mockCreateChannel = vi.fn();

function createMockChannel() {
  return {
    publish: mockPublish,
    close: mockChannelClose,
    assertExchange: mockAssertExchange,
  };
}

function createMockConnection() {
  const conn = {
    createChannel: mockCreateChannel.mockResolvedValue(createMockChannel()),
    on: vi.fn(),
    close: mockConnectionClose,
  };
  return conn;
}

const mockConnect = vi.fn();

vi.mock('amqplib', () => ({
  connect: (url: string) => mockConnect(url),
}));

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

describe('EventPublisher', () => {
  const config = { url: 'amqp://localhost' };
  const serviceName = 'test-service';

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateChannel.mockResolvedValue(createMockChannel());
    mockConnect.mockResolvedValue(createMockConnection());
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('sets default exchange and exchangeType', () => {
      const publisher = new EventPublisher(config, serviceName);
      expect(publisher.isConnected()).toBe(false);
    });

    it('uses custom exchange when provided', async () => {
      const publisher = new EventPublisher(
        { url: 'amqp://localhost', exchange: 'custom.events', exchangeType: 'direct' },
        serviceName
      );
      await publisher.connect();
      expect(mockAssertExchange).toHaveBeenCalledWith('custom.events', 'direct', { durable: true });
      await publisher.close();
    });
  });

  describe('connect', () => {
    it('connects and asserts exchange', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.connect();
      expect(mockConnect).toHaveBeenCalledWith('amqp://localhost');
      expect(mockAssertExchange).toHaveBeenCalledWith('coder.events', 'topic', { durable: true });
      expect(publisher.isConnected()).toBe(true);
      await publisher.close();
    });

    it('is idempotent when already connected', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.connect();
      await publisher.connect();
      expect(mockConnect).toHaveBeenCalledTimes(1);
      await publisher.close();
    });

    it('throws when connect always fails', async () => {
      mockConnect.mockRejectedValue(new Error('broker down'));

      const publisher = new EventPublisher(config, serviceName);

      await expect(publisher.connect()).rejects.toThrow(/Failed to connect to RabbitMQ/);
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('publishes event with correct routing key and payload', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.connect();
      mockPublish.mockReturnValue(true);

      await publisher.publish('auth.user.created', TENANT_ID, { userId: 'u1' });

      expect(mockPublish).toHaveBeenCalledTimes(1);
      const [exchange, routingKey, buffer, options] = mockPublish.mock.calls[0];
      expect(exchange).toBe('coder.events');
      expect(routingKey).toBe('auth.user.created');
      const payload = JSON.parse(buffer.toString());
      expect(payload.type).toBe('auth.user.created');
      expect(payload.tenantId).toBe(TENANT_ID);
      expect(payload.data).toEqual({ userId: 'u1' });
      expect(options.persistent).toBe(true);
      expect(options.type).toBe('auth.user.created');
      expect(options.headers.tenantId).toBe(TENANT_ID);

      await publisher.close();
    });

    it('connects if not connected when publish is called', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.publish('test.resource.updated', TENANT_ID, {});
      expect(mockConnect).toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalled();
      await publisher.close();
    });

    it('throws when channel buffer full (publish returns false)', async () => {
      mockPublish.mockReturnValue(false);
      const publisher = new EventPublisher(config, serviceName);
      await publisher.connect();

      await expect(
        publisher.publish('test.resource.updated', TENANT_ID, {})
      ).rejects.toThrow('Failed to publish event - channel buffer full');

      await publisher.close();
    });
  });

  describe('close', () => {
    it('closes channel and connection', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.connect();
      await publisher.close();
      expect(mockChannelClose).toHaveBeenCalled();
      expect(mockConnectionClose).toHaveBeenCalled();
      expect(publisher.isConnected()).toBe(false);
    });

    it('is safe to call when not connected', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.close();
      expect(mockChannelClose).not.toHaveBeenCalled();
      expect(mockConnectionClose).not.toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('returns false before connect', () => {
      const publisher = new EventPublisher(config, serviceName);
      expect(publisher.isConnected()).toBe(false);
    });

    it('returns true after connect', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.connect();
      expect(publisher.isConnected()).toBe(true);
      await publisher.close();
    });

    it('returns false after close', async () => {
      const publisher = new EventPublisher(config, serviceName);
      await publisher.connect();
      await publisher.close();
      expect(publisher.isConnected()).toBe(false);
    });
  });
});
