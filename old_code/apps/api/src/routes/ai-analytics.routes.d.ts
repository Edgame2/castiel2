/**
 * AI Analytics API Routes
 * Endpoints for AI usage metrics, quality monitoring, and insights
 */
import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { SemanticCacheService } from '../services/semantic-cache.service.js';
import type { PromptAnalyticsService } from '../services/prompt-analytics.service.js';
import type { ModelRouterService } from '../services/model-router.service.js';
export declare function aiAnalyticsRoutes(fastify: FastifyInstance, options: {
    monitoring: IMonitoringProvider;
    redis: Redis;
    semanticCache?: SemanticCacheService;
    promptAnalytics?: PromptAnalyticsService;
    modelRouter?: ModelRouterService;
}): Promise<void>;
//# sourceMappingURL=ai-analytics.routes.d.ts.map