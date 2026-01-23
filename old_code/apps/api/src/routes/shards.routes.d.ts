import { FastifyInstance } from 'fastify';
import { CacheSubscriberService } from '../services/cache-subscriber.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { CacheService } from '../services/cache.service.js';
/**
 * Register Shards routes
 */
export declare function registerShardsRoutes(fastify: FastifyInstance, monitoring: IMonitoringProvider, cacheService: CacheService, cacheSubscriber: CacheSubscriberService): Promise<void>;
//# sourceMappingURL=shards.routes.d.ts.map