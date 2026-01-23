import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { CacheService } from './cache.service.js';
/**
 * Cache subscriber service
 * Listens for cache invalidation events from other service instances
 * Ensures cache consistency across multiple instances
 */
export declare class CacheSubscriberService {
    private redis;
    private cacheService;
    private monitoring;
    private subscriber;
    private isSubscribed;
    constructor(redis: Redis, cacheService: CacheService, monitoring: IMonitoringProvider);
    /**
     * Initialize and subscribe to cache invalidation channels
     */
    initialize(): Promise<void>;
    /**
     * Subscribe to cache invalidation channels
     */
    private subscribeToChannels;
    /**
     * Handle incoming invalidation message
     */
    private handleMessage;
    /**
     * Build cache key pattern from invalidation message
     */
    private buildInvalidationPattern;
    /**
     * Subscribe to additional channel
     */
    subscribe(channel: string): Promise<void>;
    /**
     * Unsubscribe from channel
     */
    unsubscribe(channel: string): Promise<void>;
    /**
     * Publish cache invalidation event
     * This should be called when data is modified in this instance
     */
    publishInvalidation(tenantId: string, resourceType: 'shard' | 'user' | 'acl' | 'vsearch', resourceId?: string): Promise<void>;
    /**
     * Check if subscriber is active
     */
    isActive(): boolean;
    /**
     * Disconnect subscriber
     */
    disconnect(): Promise<void>;
}
//# sourceMappingURL=cache-subscriber.service.d.ts.map