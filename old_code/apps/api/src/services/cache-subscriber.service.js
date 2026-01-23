import { CACHE_CHANNELS } from '@castiel/shared-types';
/**
 * Cache subscriber service
 * Listens for cache invalidation events from other service instances
 * Ensures cache consistency across multiple instances
 */
export class CacheSubscriberService {
    redis;
    cacheService;
    monitoring;
    subscriber = null;
    isSubscribed = false;
    constructor(redis, cacheService, monitoring) {
        this.redis = redis;
        this.cacheService = cacheService;
        this.monitoring = monitoring;
    }
    /**
     * Initialize and subscribe to cache invalidation channels
     */
    async initialize() {
        try {
            // Create a duplicate Redis client for subscription
            // ioredis requires a separate client for pub/sub
            this.subscriber = this.redis.duplicate();
            // Setup message handlers
            this.subscriber.on('message', (channel, message) => {
                this.handleMessage(channel, message);
            });
            this.subscriber.on('pmessage', (_pattern, channel, message) => {
                this.handleMessage(channel, message);
            });
            // Subscribe to all cache invalidation channels
            await this.subscribeToChannels();
            this.isSubscribed = true;
            this.monitoring.trackEvent('cache.subscriber.initialized');
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'cache.subscriber.initialize',
            });
            throw error;
        }
    }
    /**
     * Subscribe to cache invalidation channels
     */
    async subscribeToChannels() {
        if (!this.subscriber) {
            throw new Error('Subscriber not initialized');
        }
        // Subscribe to pattern channels (all tenants)
        const patterns = [
            'cache:invalidate:shard:*',
            'cache:invalidate:user:*',
            'cache:invalidate:acl:*',
            'cache:invalidate:vsearch:*'
        ];
        await this.subscriber.psubscribe(...patterns);
        this.monitoring.trackEvent('cache.subscriber.subscribed', { patternCount: patterns.length });
    }
    /**
     * Handle incoming invalidation message
     */
    async handleMessage(channel, message) {
        try {
            const data = JSON.parse(message);
            this.monitoring.trackEvent('cache.invalidation.received', {
                channel,
                resourceType: data.resourceType,
                tenantId: data.tenantId,
            });
            // Determine the cache key pattern to invalidate
            const pattern = this.buildInvalidationPattern(data);
            if (pattern) {
                // Invalidate cache entries matching the pattern
                const deleted = await this.cacheService.invalidatePattern(pattern);
                this.monitoring.trackMetric('cache.invalidation.keys', deleted, {
                    channel,
                    resourceType: data.resourceType,
                    tenantId: data.tenantId,
                });
            }
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'cache.subscriber.handleMessage',
                channel,
            });
            this.monitoring.trackException(error, { operation: 'cache.subscriber.handle-message', channel });
        }
    }
    /**
     * Build cache key pattern from invalidation message
     */
    buildInvalidationPattern(data) {
        const { tenantId, resourceType, resourceId } = data;
        switch (resourceType) {
            case 'shard':
                if (resourceId) {
                    // Invalidate specific shard
                    return `tenant:${tenantId}:shard:${resourceId}:*`;
                }
                else {
                    // Invalidate all shards for tenant
                    return `tenant:${tenantId}:shard:*`;
                }
            case 'user':
                if (resourceId) {
                    // Invalidate specific user
                    return `tenant:${tenantId}:user:${resourceId}:*`;
                }
                else {
                    // Invalidate all users for tenant
                    return `tenant:${tenantId}:user:*`;
                }
            case 'acl':
                // Invalidate all ACL checks for tenant
                return `tenant:${tenantId}:acl:*`;
            case 'vsearch':
                // Invalidate all vector search results for tenant
                return `tenant:${tenantId}:vsearch:*`;
            default:
                this.monitoring.trackEvent('cache.subscriber.unknown-resource-type', { resourceType });
                return null;
        }
    }
    /**
     * Subscribe to additional channel
     */
    async subscribe(channel) {
        if (!this.subscriber) {
            throw new Error('Subscriber not initialized');
        }
        if (channel.includes('*')) {
            await this.subscriber.psubscribe(channel);
        }
        else {
            await this.subscriber.subscribe(channel);
        }
        this.monitoring.trackEvent('cache.subscriber.subscribed-to-channel', { channel });
    }
    /**
     * Unsubscribe from channel
     */
    async unsubscribe(channel) {
        if (!this.subscriber) {
            return;
        }
        if (channel.includes('*')) {
            await this.subscriber.punsubscribe(channel);
        }
        else {
            await this.subscriber.unsubscribe(channel);
        }
        this.monitoring.trackEvent('cache.subscriber.unsubscribed-from-channel', { channel });
    }
    /**
     * Publish cache invalidation event
     * This should be called when data is modified in this instance
     */
    async publishInvalidation(tenantId, resourceType, resourceId) {
        try {
            let channel;
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
            const message = {
                tenantId,
                resourceType,
                resourceId,
                timestamp: new Date().toISOString(),
            };
            await this.cacheService.publishInvalidation(channel, message);
            this.monitoring.trackEvent('cache.invalidation.published', {
                channel,
                resourceType,
                tenantId,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'cache.subscriber.publish',
                resourceType,
                tenantId,
            });
            // Error already tracked by monitoring.trackException above
        }
    }
    /**
     * Check if subscriber is active
     */
    isActive() {
        return this.isSubscribed && this.subscriber !== null;
    }
    /**
     * Disconnect subscriber
     */
    async disconnect() {
        if (this.subscriber) {
            await this.subscriber.quit();
            this.subscriber = null;
            this.isSubscribed = false;
            this.monitoring.trackEvent('cache.subscriber.disconnected');
        }
    }
}
//# sourceMappingURL=cache-subscriber.service.js.map