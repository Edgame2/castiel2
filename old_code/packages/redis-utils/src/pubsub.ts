import { Redis } from 'ioredis';
import { CACHE_CHANNELS } from '@castiel/shared-types';
import type { RedisConnectionManager } from './connection.js';

/**
 * Event handler for cache invalidation
 */
export type CacheInvalidationHandler = (channel: string, message: string) => void | Promise<void>;

/**
 * Redis Pub/Sub Service
 * Handles cross-instance cache invalidation
 */
export class RedisPubSubService {
  private connectionManager: RedisConnectionManager;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private handlers: Map<string, Set<CacheInvalidationHandler>> = new Map();
  private subscriptions: Set<string> = new Set();

  constructor(connectionManager: RedisConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Initialize pub/sub clients
   */
  async initialize(): Promise<void> {
    const mainClient = await this.connectionManager.getClient();

    // Create a duplicate client for subscription (ioredis requirement)
    this.subscriber = mainClient.duplicate();
    this.publisher = mainClient;

    // Handle incoming messages
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });

    // Handle pattern messages
    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      this.handleMessage(channel, message);
    });

    console.log('[PubSub] Initialized');
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, handler: CacheInvalidationHandler): Promise<void> {
    if (!this.subscriber) {
      throw new Error('PubSub not initialized. Call initialize() first.');
    }

    // Add handler
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);

    // Subscribe if not already subscribed
    if (!this.subscriptions.has(channel)) {
      if (channel.includes('*')) {
        await this.subscriber.psubscribe(channel);
      } else {
        await this.subscriber.subscribe(channel);
      }
      this.subscriptions.add(channel);
      console.log(`[PubSub] Subscribed to channel: ${channel}`);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, handler?: CacheInvalidationHandler): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    if (handler) {
      // Remove specific handler
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(channel);
        }
      }
    } else {
      // Remove all handlers
      this.handlers.delete(channel);
    }

    // Unsubscribe if no more handlers
    if (!this.handlers.has(channel) && this.subscriptions.has(channel)) {
      if (channel.includes('*')) {
        await this.subscriber.punsubscribe(channel);
      } else {
        await this.subscriber.unsubscribe(channel);
      }
      this.subscriptions.delete(channel);
      console.log(`[PubSub] Unsubscribed from channel: ${channel}`);
    }
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.publisher) {
      throw new Error('PubSub not initialized. Call initialize() first.');
    }

    try {
      const result = await this.publisher.publish(channel, message);
      console.log(`[PubSub] Published to ${channel}: ${message} (${result} subscribers)`);
      return result;
    } catch (error) {
      console.error(`[PubSub] Error publishing to ${channel}:`, error);
      return 0;
    }
  }

  /**
   * Publish cache invalidation event
   */
  async invalidate(tenantId: string, resourceType: 'shard' | 'user' | 'acl' | 'vsearch', resourceId?: string): Promise<void> {
    let channel: string;

    switch (resourceType) {
      case 'shard':
        channel = resourceId
          ? CACHE_CHANNELS.invalidateShard(tenantId, resourceId)
          : `cache:invalidate:shard:${tenantId}:*`;
        break;
      case 'user':
        channel = resourceId
          ? CACHE_CHANNELS.invalidateUser(tenantId, resourceId)
          : `cache:invalidate:user:${tenantId}:*`;
        break;
      case 'acl':
        channel = CACHE_CHANNELS.invalidateAcl(tenantId);
        break;
      case 'vsearch':
        channel = CACHE_CHANNELS.invalidateVectorSearch(tenantId);
        break;
    }

    await this.publish(channel, JSON.stringify({
      tenantId,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(channel: string, message: string): Promise<void> {
    console.log(`[PubSub] Received message on ${channel}: ${message}`);

    // Get handlers for exact channel
    const exactHandlers = this.handlers.get(channel);
    if (exactHandlers) {
      for (const handler of exactHandlers) {
        try {
          await handler(channel, message);
        } catch (error) {
          console.error(`[PubSub] Error in handler for ${channel}:`, error);
        }
      }
    }

    // Get handlers for pattern matches
    for (const [pattern, handlers] of this.handlers.entries()) {
      if (pattern.includes('*') && this.matchPattern(pattern, channel)) {
        for (const handler of handlers) {
          try {
            await handler(channel, message);
          } catch (error) {
            console.error(`[PubSub] Error in pattern handler for ${pattern}:`, error);
          }
        }
      }
    }
  }

  /**
   * Simple pattern matching
   */
  private matchPattern(pattern: string, channel: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(channel);
  }

  /**
   * Get list of active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Disconnect pub/sub clients
   */
  async disconnect(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.publisher = null;
    this.handlers.clear();
    this.subscriptions.clear();
    console.log('[PubSub] Disconnected');
  }
}
