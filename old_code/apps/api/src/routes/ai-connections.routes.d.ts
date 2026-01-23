/**
 * AI Connections Management Routes
 *
 * Manages connections to AI models (system-wide and tenant-specific)
 * Integrates with Azure Key Vault for secure credential storage
 */
import { FastifyInstance } from 'fastify';
import { AIConnectionService } from '../services/ai/index.js';
import { UnifiedAIClient } from '../services/ai/unified-ai-client.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare function registerAIConnectionsRoutes(fastify: FastifyInstance, connectionService: AIConnectionService, unifiedAIClient?: UnifiedAIClient, monitoring?: IMonitoringProvider): void;
//# sourceMappingURL=ai-connections.routes.d.ts.map