/**
 * Proactive Insights Routes
 *
 * API routes for managing proactive insights (list, get, acknowledge, dismiss, action)
 */
import type { FastifyInstance } from 'fastify';
import { ProactiveInsightService } from '../services/proactive-insight.service.js';
import type { ProactiveInsightsAnalyticsService } from '../services/proactive-insights-analytics.service.js';
/**
 * Register Proactive Insights routes
 */
export declare function registerProactiveInsightsRoutes(server: FastifyInstance, proactiveInsightService: ProactiveInsightService, deliveryPreferencesRepository?: any, // ProactiveInsightsDeliveryPreferencesRepository
analyticsService?: ProactiveInsightsAnalyticsService): Promise<void>;
/**
 * Register Delivery Preferences routes
 */
export declare function registerDeliveryPreferencesRoutes(server: FastifyInstance, deliveryPreferencesRepository: any, // ProactiveInsightsDeliveryPreferencesRepository
analyticsService?: ProactiveInsightsAnalyticsService): Promise<void>;
//# sourceMappingURL=proactive-insights.routes.d.ts.map