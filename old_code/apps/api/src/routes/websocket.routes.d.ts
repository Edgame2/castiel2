/**
 * WebSocket routes for real-time updates
 * Clients connect with: ws://host/ws?token=<access_token>
 */
import type { FastifyInstance } from 'fastify';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
/**
 * Register WebSocket routes
 */
export declare function registerWebSocketRoutes(server: FastifyInstance, tokenValidationCache: TokenValidationCacheService | null): Promise<void>;
//# sourceMappingURL=websocket.routes.d.ts.map