/**
 * RabbitMQ Event Consumer
 * Local implementation for the logging module
 */

import amqplib, { Channel, ConsumeMessage } from 'amqplib';
import { log } from '../utils/logger';
import { getConfig } from '../config';

export interface EventHandler {
  (event: any): Promise<void>;
}

export class EventConsumer {
  private exchange: string;
  private queue: string;
  private routingPatterns: string[];
  private connection: amqplib.ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(exchange: string, queue: string, routingPatterns: string[] = ['#']) {
    this.exchange = exchange;
    this.queue = queue;
    this.routingPatterns = routingPatterns;
  }

  /**
   * Start consuming events
   */
  async start(handler: EventHandler): Promise<void> {
    const config = getConfig();
    
    try {
      // Connect to RabbitMQ
      this.connection = await amqplib.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });

      // Assert queue
      await this.channel.assertQueue(this.queue, {
        durable: true,
      });

      // Bind queue to exchange with routing patterns
      for (const pattern of this.routingPatterns) {
        await this.channel.bindQueue(this.queue, this.exchange, pattern);
        log.debug('Bound queue to exchange', { queue: this.queue, exchange: this.exchange, pattern });
      }

      // Set prefetch to control concurrency
      await this.channel.prefetch(10);

      // Store channel reference for use in callback
      const channel = this.channel;

      // Consume messages
      await this.channel.consume(this.queue, async (msg: ConsumeMessage | null) => {
        if (!msg) {
          return;
        }

        try {
          const event = JSON.parse(msg.content.toString());
          await handler(event);
          channel.ack(msg);
        } catch (error) {
          log.error('Error processing event', error, {
            exchange: this.exchange,
            queue: this.queue,
            routingKey: msg.fields.routingKey,
          });
          // Nack without requeue to avoid infinite loops
          // Consider sending to DLQ in production
          channel.nack(msg, false, false);
        }
      }, {
        noAck: false,
      });

      log.info('Event consumer started', { exchange: this.exchange, queue: this.queue });
    } catch (error) {
      log.error('Failed to start event consumer', error, { exchange: this.exchange, queue: this.queue });
      throw error;
    }
  }

  /**
   * Stop consuming events
   */
  async stop(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      log.info('Event consumer stopped', { exchange: this.exchange, queue: this.queue });
    } catch (error) {
      log.error('Error stopping event consumer', error);
    }
  }
}

