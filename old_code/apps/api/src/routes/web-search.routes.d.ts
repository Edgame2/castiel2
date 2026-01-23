/**
 * Web Search Routes
 * REST API endpoints for web search and deep search functionality
 */
import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { WebSearchModule } from '../services/web-search/module.js';
/**
 * Register web search routes
 */
export declare function registerWebSearchRoutes(server: FastifyInstance, monitoring: IMonitoringProvider, webSearchModule: WebSearchModule): Promise<void>;
export default registerWebSearchRoutes;
//# sourceMappingURL=web-search.routes.d.ts.map