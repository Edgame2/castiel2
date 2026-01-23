/**
 * Project Resolver Routes (Phase 2)
 *
 * API endpoints for project context resolution and relationship management
 */
import { FastifyInstance } from 'fastify';
import { ContextAssemblyService } from '../services/ai-context-assembly.service.js';
import { CacheService } from '../services/cache.service.js';
import { CacheSubscriberService } from '../services/cache-subscriber.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register Project Resolver routes
 */
export declare function registerProjectResolverRoutes(fastify: FastifyInstance, monitoring: IMonitoringProvider, cacheService: CacheService | null, cacheSubscriber: CacheSubscriberService | null, contextAssemblyService: ContextAssemblyService): Promise<void>;
//# sourceMappingURL=project-resolver.routes.d.ts.map