/**
 * AI Tools Management Routes
 * Super Admin routes for managing AI function calling tools
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { AIToolExecutorService } from '../services/ai/ai-tool-executor.service.js';
/**
 * Register AI Tools routes
 */
export declare function registerAIToolsRoutes(fastify: FastifyInstance, toolExecutor: AIToolExecutorService, monitoring: IMonitoringProvider): Promise<void>;
//# sourceMappingURL=ai-tools.routes.d.ts.map