/**
 * Event Consumer
 * Consumes events from RabbitMQ
 * @module @coder/shared/events
 */

import * as amqp from 'amqplib';
import { DomainEvent } from '../types/events.types';
import { validateEvent } from './EventSchema';

/**
 * RabbitMQ consumer configuration
 */
export interface RabbitMQConsumerConfig {
  url: string;
  exchange?: string;
  exchangeType?: 'topic' | 'direct' | 'fanout';
  queue?: string;
  routingKeys?: string[]; // e.g., ['auth.*', 'user.created']
  prefetch?: number;
}

/**
 * Event handler function
 */
export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void>;

/**
 * Event Consumer
 * Consumes events from RabbitMQ queue
 */
export class EventConsumer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private config: RabbitMQConsumerConfig;
  private exchange: string;
  private queue: string;
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor(config: RabbitMQConsumerConfig) {
    this.config = {
      exchange: config.exchange || 'coder.events',
      exchangeType: config.exchangeType || 'topic',
      queue: config.queue || `${process.env.SERVICE_NAME || 'service'}.events`,
      routingKeys: config.routingKeys || ['#'], // Default: all events
      prefetch: config.prefetch || 10,
      ...config,
    };
    this.exchange = this.config.exchange!;
    this.queue = this.config.queue!;
  }

  /**
   * Connect to RabbitMQ and setup queue
   */
  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    try {
      const conn = await amqp.connect(this.config.url);
      this.connection = conn;
      this.channel = await conn.createChannel();

      const ch = this.channel;
      // Set prefetch (quality of service)
      await ch.prefetch(this.config.prefetch!);

      // Assert exchange exists
      await ch.assertExchange(this.exchange, this.config.exchangeType!, {
        durable: true,
      });

      // Assert queue exists
      await ch.assertQueue(this.queue, {
        durable: true,
      });

      // Bind queue to exchange with routing keys
      for (const routingKey of this.config.routingKeys!) {
        await ch.bindQueue(this.queue, this.exchange, routingKey);
      }

      // Handle connection errors
      conn.on('error', (error) => {
        console.error('[EventConsumer] Connection error:', error);
        this.connection = null;
        this.channel = null;
      });

      conn.on('close', () => {
        console.log('[EventConsumer] Connection closed');
        this.connection = null;
        this.channel = null;
      });
    } catch (error) {
      this.connection = null;
      this.channel = null;
      throw new Error(`Failed to connect to RabbitMQ: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Start consuming events
   */
  async start(): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('EventConsumer not connected');
    }

    await this.channel.consume(
      this.queue,
      async (msg) => {
        if (!msg) {
          return;
        }

        try {
          // Parse event
          const event = JSON.parse(msg.content.toString()) as DomainEvent;

          // Validate event
          if (!validateEvent(event)) {
            console.error('[EventConsumer] Invalid event structure:', event);
            this.channel!.nack(msg, false, false); // Reject and don't requeue
            return;
          }

          // Find handlers for this event type
          const handlers = this.handlers.get(event.type) || [];
          if (handlers.length === 0) {
            // No handler registered - ack and continue
            this.channel!.ack(msg);
            return;
          }

          // Execute all handlers
          for (const handler of handlers) {
            try {
              await handler(event);
            } catch (error) {
              console.error(`[EventConsumer] Handler error for ${event.type}:`, error);
              // Continue with other handlers
            }
          }

          // Ack message after all handlers succeed
          this.channel!.ack(msg);
        } catch (error) {
          console.error('[EventConsumer] Error processing message:', error);
          // Nack and requeue (up to retry limit)
          this.channel!.nack(msg, false, true);
        }
      },
      {
        noAck: false, // Manual acknowledgment
      }
    );
  }

  /**
   * Stop consuming
   */
  async stop(): Promise<void> {
    if (this.channel) {
      await this.channel.cancel(this.queue);
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.stop();
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

