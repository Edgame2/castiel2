/**
 * Audit Event Consumer
 * Consumes events from RabbitMQ and creates audit log entries
 */

import amqp from 'amqplib';
import { IngestionService } from '../../services/IngestionService';
import { getConfig } from '../../config';
import { mapEventToLog } from '../eventMapper';
import { AuditableEvent } from '../types';
import { log } from '../../utils/logger';

export class AuditEventConsumer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private ingestionService: IngestionService;
  private isShuttingDown = false;
  
  constructor(ingestionService: IngestionService) {
    this.ingestionService = ingestionService;
  }
  
  /**
   * Start consuming events
   */
  async start(): Promise<void> {
    const config = getConfig();
    const { url, exchange, queue, bindings } = config.rabbitmq;
    
    if (!url) {
      log.warn('RabbitMQ URL not configured, skipping event consumer');
      return;
    }
    
    try {
      // Connect to RabbitMQ
      const conn = await amqp.connect(url);
      this.connection = conn;
      this.channel = await conn.createChannel();
      
      // Handle connection errors
      conn.on('error', (err) => {
        if (!this.isShuttingDown) {
          log.error('RabbitMQ connection error', err);
          this.reconnect();
        }
      });
      
      conn.on('close', () => {
        if (!this.isShuttingDown) {
          log.warn('RabbitMQ connection closed, reconnecting...');
          this.reconnect();
        }
      });
      
      const channel = this.channel;
      
      // Assert exchange (topic type for routing patterns)
      await channel.assertExchange(exchange, 'topic', {
        durable: true,
      });
      
      // Assert queue
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': `${exchange}.dlx`,
          'x-message-ttl': 86400000, // 24 hours
        },
      });
      
      // Bind queue to exchange with routing patterns
      for (const pattern of bindings) {
        await channel.bindQueue(queue, exchange, pattern);
        log.debug('Bound queue to pattern', { queue, exchange, pattern });
      }
      
      // Set prefetch for controlled consumption
      await channel.prefetch(10);
      
      // Start consuming
      await channel.consume(queue, async (msg) => {
        if (!msg) return;
        
        try {
          await this.handleMessage(msg);
          this.channel?.ack(msg);
        } catch (error) {
          log.error('Error processing event', error, {
            routingKey: msg.fields.routingKey,
          });
          // Reject and don't requeue (will go to DLQ if configured)
          this.channel?.nack(msg, false, false);
        }
      }, {
        noAck: false,
      });
      
      log.info('Audit event consumer started', { 
        exchange, 
        queue, 
        bindings,
      });
    } catch (error) {
      log.error('Failed to start audit event consumer', error);
      throw error;
    }
  }
  
  /**
   * Handle an incoming message
   */
  private async handleMessage(msg: amqp.ConsumeMessage): Promise<void> {
    const routingKey = msg.fields.routingKey;
    const content = msg.content.toString();
    
    let event: AuditableEvent;
    try {
      event = JSON.parse(content);
    } catch (error) {
      log.error('Failed to parse event', error, { routingKey, content });
      throw error;
    }
    
    // Ensure event has required fields
    if (!event.type) {
      event.type = routingKey; // Use routing key as fallback
    }
    
    if (!event.timestamp) {
      event.timestamp = new Date();
    }
    
    // Skip if no organization ID and not a global event
    if (!event.organizationId && !routingKey.startsWith('system.')) {
      log.warn('Event missing organizationId, skipping', { 
        type: event.type, 
        routingKey,
      });
      return;
    }
    
    // Map event to log input
    const logInput = mapEventToLog(event);
    
    // Ingest the log
    await this.ingestionService.ingest(logInput, {
      organizationId: event.organizationId,
      userId: event.userId,
    });
    
    log.debug('Event processed', { 
      type: event.type, 
      organizationId: event.organizationId,
    });
  }
  
  /**
   * Reconnect after connection loss
   */
  private async reconnect(): Promise<void> {
    if (this.isShuttingDown) return;
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      await this.start();
    } catch (error) {
      log.error('Failed to reconnect', error);
      // Retry again
      this.reconnect();
    }
  }
  
  /**
   * Stop consuming events
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;
    
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await (this.connection as any).close();
        this.connection = null;
      }
      
      log.info('Audit event consumer stopped');
    } catch (error) {
      log.error('Error stopping audit event consumer', error);
    }
  }
}
