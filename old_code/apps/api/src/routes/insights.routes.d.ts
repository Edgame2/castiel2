/**
 * AI Insights API Routes
 * REST endpoints for insight generation, conversations, and configuration
 */
import { FastifyInstance } from 'fastify';
import { InsightService } from '../services/insight.service.js';
import { ConversationService } from '../services/conversation.service.js';
import { ContextTemplateService } from '../services/context-template.service.js';
import { EntityResolutionService } from '../services/entity-resolution.service.js';
import { ContextAwareQueryParserService } from '../services/context-aware-query-parser.service.js';
import { ConversationRealtimeService } from '../services/conversation-realtime.service.js';
/**
 * Register AI Insights routes
 */
export declare function insightsRoutes(fastify: FastifyInstance, options: {
    insightService: InsightService;
    conversationService: ConversationService;
    contextTemplateService: ContextTemplateService;
    entityResolutionService?: EntityResolutionService;
    contextAwareQueryParserService?: ContextAwareQueryParserService;
    conversationRealtimeService?: ConversationRealtimeService;
    multimodalAssetService?: any;
    authenticate?: any;
    tokenValidationCache?: any;
    prefix?: string;
}): Promise<void>;
//# sourceMappingURL=insights.routes.d.ts.map