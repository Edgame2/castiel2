import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { APIPerformanceMonitoringService } from '../services/api-performance-monitoring.service.js';

/**
 * Request logger middleware
 * Logs all incoming requests and tracks metrics
 * Enhanced with API performance monitoring
 */
export function requestLogger(
  monitoring: IMonitoringProvider,
  performanceMonitoring?: APIPerformanceMonitoringService
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Store start time
    const startTime = Date.now();

    // Log request
    request.log.info({
      method: request.method,
      url: request.url,
      headers: request.headers,
      query: request.query,
      ip: request.ip,
    }, 'Incoming request');

    // Track response on finish
    reply.raw.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Normalize endpoint path (remove query params, IDs, etc. for better grouping)
      const normalizedEndpoint = normalizeEndpoint(request.url);
      
      // Log response
      request.log.info({
        method: request.method,
        url: request.url,
        normalizedEndpoint,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
      }, 'Request completed');

      // Track request in monitoring
      monitoring.trackRequest(
        `${request.method} ${request.routeOptions?.url || request.url}`,
        request.url,
        duration,
        reply.statusCode,
        reply.statusCode < 400
      );

      // Track in performance monitoring service
      if (performanceMonitoring) {
        performanceMonitoring.recordResponseTime(
          normalizedEndpoint,
          request.method,
          duration,
          reply.statusCode
        );
      }
    });
  };
}

/**
 * Normalize endpoint path for better grouping
 * Removes query params, IDs, and other dynamic segments
 */
function normalizeEndpoint(url: string): string {
  // Remove query parameters
  let normalized = url.split('?')[0];
  
  // Remove trailing slash (except root)
  normalized = normalized.replace(/\/$/, '') || '/';
  
  // Replace UUIDs and numeric IDs with placeholders for better grouping
  // Pattern: /api/shard/12345 -> /api/shard/:id
  normalized = normalized.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
  normalized = normalized.replace(/\/\d+/g, '/:id');
  
  return normalized;
}
