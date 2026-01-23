import type { FastifyInstance } from 'fastify';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
import type { ConversationEventSubscriberService } from '../services/conversation-event-subscriber.service.js';
/**
 * Server-Sent Events (SSE) route for real-time updates
 * Clients connect with: GET /sse?token=<access_token>
 *
 * Optional query parameters:
 * - events: comma-separated list of event types to subscribe to
 * - shardTypeIds: comma-separated list of shard type IDs to filter
 * - shardIds: comma-separated list of shard IDs to filter
 * - conversationIds: comma-separated list of conversation IDs to subscribe to
 */
export declare function registerSSERoutes(server: FastifyInstance, tokenValidationCache: TokenValidationCacheService | null, conversationEventSubscriber?: ConversationEventSubscriberService): Promise<void>;
//# sourceMappingURL=sse.routes.d.ts.map