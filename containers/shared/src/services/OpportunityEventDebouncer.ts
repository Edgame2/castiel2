/**
 * Opportunity Event Debouncer
 * Distributed debouncing using Redis for grouping multiple entity links within 5-second window per opportunity
 * @module @coder/shared/services
 */

import { getRedisClient } from '../cache';

// Simple logger for shared services (avoid circular dependencies)
const log = {
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[OpportunityEventDebouncer] ${message}`, meta || '');
    }
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[OpportunityEventDebouncer] ${message}`, meta || '');
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(`[OpportunityEventDebouncer] ${message}`, error || '', meta || '');
  },
};

/**
 * Debounce buffer entry
 */
interface DebounceBuffer {
  opportunityId: string;
  shardId: string;
  eventData: {
    integrationId: string;
    tenantId: string;
    syncTaskId: string;
    correlationId: string;
    metadata?: Record<string, any>;
  };
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Opportunity Event Debouncer
 * Uses Redis for distributed debouncing across multiple consumer instances
 */
export class OpportunityEventDebouncer {
  private debounceWindowMs: number = 5000; // 5 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;
  private useRedis: boolean = true;
  private fallbackToMemory: boolean = true;
  private memoryBuffer: Map<string, DebounceBuffer> = new Map(); // Fallback in-memory buffer

  constructor(options?: {
    debounceWindowMs?: number;
    useRedis?: boolean;
    fallbackToMemory?: boolean;
  }) {
    this.debounceWindowMs = options?.debounceWindowMs || 5000;
    this.useRedis = options?.useRedis !== false;
    this.fallbackToMemory = options?.fallbackToMemory !== false;

    // Start cleanup interval (every 1 second) to remove expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 1000);
  }

  /**
   * Schedule opportunity event (with debouncing)
   * Returns true if event should be published immediately, false if debounced
   */
  async scheduleOpportunityEvent(
    opportunityId: string,
    shardId: string,
    eventData: {
      integrationId: string;
      tenantId: string;
      syncTaskId: string;
      correlationId: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ shouldPublish: boolean; bufferKey: string }> {
    const bufferKey = `opportunity_debounce:${eventData.tenantId}:${opportunityId}`;
    const expiresAt = Date.now() + this.debounceWindowMs;

    try {
      if (this.useRedis) {
        // Try Redis first
        try {
          const redis = await getRedisClient().getClient();
          const existingJson = await redis.get(bufferKey);
          
          if (existingJson) {
            const existing: DebounceBuffer = JSON.parse(existingJson);
            
            if (existing.expiresAt > Date.now()) {
              // Update existing buffer (reset debounce window)
              const updated: DebounceBuffer = {
                opportunityId,
                shardId,
                eventData,
                expiresAt,
              };
              await redis.setex(bufferKey, Math.ceil(this.debounceWindowMs / 1000), JSON.stringify(updated));
              
              log.debug('Opportunity event debounced (Redis)', {
                opportunityId,
                bufferKey,
                expiresAt: new Date(expiresAt).toISOString(),
                service: 'opportunity-debouncer',
              });
              
              return { shouldPublish: false, bufferKey };
            }
          }
          
          // Create new buffer entry
          const buffer: DebounceBuffer = {
            opportunityId,
            shardId,
            eventData,
            expiresAt,
          };
          await redis.setex(bufferKey, Math.ceil(this.debounceWindowMs / 1000), JSON.stringify(buffer));
          
          // Schedule cleanup after debounce window
          setTimeout(async () => {
            await this.flushAndPublish(bufferKey);
          }, this.debounceWindowMs);
          
          log.debug('Opportunity event scheduled (Redis)', {
            opportunityId,
            bufferKey,
            expiresAt: new Date(expiresAt).toISOString(),
            service: 'opportunity-debouncer',
          });
          
          return { shouldPublish: false, bufferKey };
        } catch (redisError) {
          // Redis error - will fall through to fallback
          throw redisError;
        }
      }
    } catch (error) {
      log.warn('Redis debouncing failed, falling back to memory', {
        error: error instanceof Error ? error.message : String(error),
        opportunityId,
        service: 'opportunity-debouncer',
      });
      
      if (!this.fallbackToMemory) {
        // If Redis fails and no fallback, publish immediately
        return { shouldPublish: true, bufferKey };
      }
    }

    // Fallback to in-memory debouncing
    if (this.fallbackToMemory) {
      const existing = this.memoryBuffer.get(bufferKey);
      
      if (existing && existing.expiresAt > Date.now()) {
        // Update existing buffer (reset debounce window)
        existing.shardId = shardId;
        existing.eventData = eventData;
        existing.expiresAt = expiresAt;
        
        log.debug('Opportunity event debounced (memory fallback)', {
          opportunityId,
          bufferKey,
          expiresAt: new Date(expiresAt).toISOString(),
          service: 'opportunity-debouncer',
        });
        
        return { shouldPublish: false, bufferKey };
      } else {
        // Create new buffer entry
        const buffer: DebounceBuffer = {
          opportunityId,
          shardId,
          eventData,
          expiresAt,
        };
        this.memoryBuffer.set(bufferKey, buffer);
        
        // Schedule cleanup after debounce window
        setTimeout(async () => {
          await this.flushAndPublish(bufferKey);
        }, this.debounceWindowMs);
        
        log.debug('Opportunity event scheduled (memory fallback)', {
          opportunityId,
          bufferKey,
          expiresAt: new Date(expiresAt).toISOString(),
          service: 'opportunity-debouncer',
        });
        
        return { shouldPublish: false, bufferKey };
      }
    }

    // No debouncing available - publish immediately
    return { shouldPublish: true, bufferKey };
  }

  /**
   * Flush and publish opportunity event
   * Called when debounce window expires or on shutdown
   */
  async flushAndPublish(bufferKey: string): Promise<DebounceBuffer | null> {
    try {
      let buffer: DebounceBuffer | null = null;

      if (this.useRedis) {
        try {
          const redis = await getRedisClient().getClient();
          const bufferJson = await redis.get(bufferKey);
          
          if (bufferJson) {
            buffer = JSON.parse(bufferJson);
            await redis.del(bufferKey);
          }
        } catch (error) {
          log.warn('Failed to get buffer from Redis', {
            error: error instanceof Error ? error.message : String(error),
            bufferKey,
            service: 'opportunity-debouncer',
          });
        }
      }

      // Fallback to memory
      if (!buffer && this.fallbackToMemory) {
        buffer = this.memoryBuffer.get(bufferKey) || null;
        if (buffer) {
          this.memoryBuffer.delete(bufferKey);
        }
      }

      if (buffer && buffer.expiresAt <= Date.now()) {
        // Buffer expired, return it for publishing
        return buffer;
      }

      return null;
    } catch (error) {
      log.error('Failed to flush opportunity event buffer', error, {
        bufferKey,
        service: 'opportunity-debouncer',
      });
      return null;
    }
  }

  /**
   * Get all pending opportunity events (for shutdown flush)
   */
  async getAllPendingEvents(): Promise<DebounceBuffer[]> {
    const pending: DebounceBuffer[] = [];

    try {
      if (this.useRedis) {
        try {
          // Note: Redis keys() is expensive, but acceptable for shutdown
          // In production, consider using Redis SCAN for better performance
          const redis = await getRedisClient().getClient();
          const keys = await redis.keys('opportunity_debounce:*');
          
          for (const key of keys) {
            const bufferJson = await redis.get(key);
            if (bufferJson) {
              const buffer: DebounceBuffer = JSON.parse(bufferJson);
              if (buffer.expiresAt > Date.now()) {
                pending.push(buffer);
              }
            }
          }
        } catch (error) {
          log.warn('Failed to get pending events from Redis', {
            error: error instanceof Error ? error.message : String(error),
            service: 'opportunity-debouncer',
          });
        }
      }
    } catch (error) {
      log.warn('Failed to get pending events from Redis', {
        error: error instanceof Error ? error.message : String(error),
        service: 'opportunity-debouncer',
      });
    }

    // Add memory buffer entries
    for (const buffer of this.memoryBuffer.values()) {
      if (buffer.expiresAt > Date.now()) {
        pending.push(buffer);
      }
    }

    return pending;
  }

  /**
   * Cleanup expired entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();

    // Cleanup memory buffer
    for (const [key, buffer] of this.memoryBuffer.entries()) {
      if (buffer.expiresAt <= now) {
        this.memoryBuffer.delete(key);
      }
    }

    // Note: Redis entries expire automatically via TTL, but we can clean up manually if needed
  }

  /**
   * Stop debouncer (cleanup)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryBuffer.clear();
  }
}
