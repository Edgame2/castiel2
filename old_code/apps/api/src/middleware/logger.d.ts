import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { APIPerformanceMonitoringService } from '../services/api-performance-monitoring.service.js';
/**
 * Request logger middleware
 * Logs all incoming requests and tracks metrics
 * Enhanced with API performance monitoring
 */
export declare function requestLogger(monitoring: IMonitoringProvider, performanceMonitoring?: APIPerformanceMonitoringService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=logger.d.ts.map