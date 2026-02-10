/**
 * Event Publisher
 * Publishes events to RabbitMQ
 * @module @coder/shared/events
 */

import * as amqp from 'amqplib';
import type { PublishEventOptions } from '../types/events.types';
import { createEvent } from './EventSchema';

/**
 * RabbitMQ configuration
 */
export interface RabbitMQConfig {
  url: string;
  exchange?: string;
  exchangeType?: 'topic' | 'direct' | 'fanout';
}

/**
 * Event Publisher
 * Publishes events to RabbitMQ topic exchange
 */
export class EventPublisher {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private config: RabbitMQConfig;
  private exchange: string;
  private instanceId: string;

  constructor(config: RabbitMQConfig, serviceName: string) {
    this.config = {
      exchange: config.exchange || 'coder.events',
      exchangeType: config.exchangeType || 'topic',
      ...config,
    };
    this.exchange = this.config.exchange!;
    this.instanceId = `${serviceName}-${process.pid}-${Date.now()}`;
  }

  /**
   * Connect to RabbitMQ with retry (waits for broker to be ready at startup)
   */
  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    const maxRetries = 15;
    const initialDelayMs = 2000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const conn = await amqp.connect(this.config.url);
        this.connection = conn;
        this.channel = await conn.createChannel();

        // Assert exchange exists
        await this.channel.assertExchange(this.exchange, this.config.exchangeType!, {
          durable: true,
        });

        // Handle connection errors
        this.connection.on('error', (error) => {
          console.error('[EventPublisher] Connection error:', error);
          this.connection = null;
          this.channel = null;
        });

        this.connection.on('close', () => {
          console.log('[EventPublisher] Connection closed');
          this.connection = null;
          this.channel = null;
        });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.connection = null;
        this.channel = null;
        if (attempt < maxRetries) {
          const delayMs = initialDelayMs * Math.min(attempt, 4);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    throw new Error(`Failed to connect to RabbitMQ after ${maxRetries} attempts: ${lastError?.message ?? 'Unknown error'}`);
  }

  /**
   * Publish event
   */
  async publish<T>(
    eventType: string,
    tenantId: string,
    data: T,
    options?: PublishEventOptions
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('EventPublisher not connected');
    }

    // Create event
    const event = createEvent(
      eventType,
      tenantId,
      data,
      {
        service: process.env.SERVICE_NAME || 'unknown',
        instance: this.instanceId,
      },
      options
    );

    // Routing key: module.resource.action (e.g., auth.user.created)
    const routingKey = event.type;

    // Publish to exchange
    const published = this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true, // Make messages persistent
        messageId: event.id,
        timestamp: Date.now(),
        type: event.type,
        appId: event.source.service,
        headers: {
          tenantId: event.tenantId,
          version: event.version,
        },
      }
    );

    if (!published) {
      throw new Error('Failed to publish event - channel buffer full');
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
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

