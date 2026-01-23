/**
 * API Versioning Middleware
 * Handles API version detection, validation, and deprecation warnings
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ApiVersioningService,
  extractApiVersion,
  getDefaultVersion,
  type ApiVersion,
} from '../utils/api-versioning.js';

export interface ApiVersioningMiddlewareOptions {
  versioningService: ApiVersioningService;
  monitoring: IMonitoringProvider;
  /**
   * Whether to require version header (default: false, falls back to default version)
   */
  requireVersion?: boolean;
  /**
   * Whether to add version headers to responses (default: true)
   */
  addVersionHeaders?: boolean;
  /**
   * Whether to track version usage (default: true)
   */
  trackUsage?: boolean;
}

/**
 * Create API versioning middleware
 */
export function createApiVersioningMiddleware(
  options: ApiVersioningMiddlewareOptions
) {
  const {
    versioningService,
    monitoring,
    requireVersion = false,
    addVersionHeaders = true,
    trackUsage = true,
  } = options;

  return async function apiVersioningMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Extract version from request
    const requestedVersion = extractApiVersion(request);
    const effectiveVersion: ApiVersion = requestedVersion || getDefaultVersion();

    // Validate version
    if (!versioningService.isVersionSupported(effectiveVersion)) {
      reply.status(400).send({
        error: 'Unsupported API Version',
        message: `API version '${effectiveVersion}' is not supported. Supported versions: ${versioningService.getSupportedVersions().join(', ')}`,
        requestedVersion: effectiveVersion,
        supportedVersions: versioningService.getSupportedVersions(),
      });
      return;
    }

    // Check if version is sunset
    if (versioningService.isVersionSunset(effectiveVersion)) {
      reply.status(410).send({
        error: 'API Version Sunset',
        message: `API version '${effectiveVersion}' has been sunset and is no longer supported.`,
        requestedVersion: effectiveVersion,
        currentVersion: versioningService.getCurrentVersion(),
      });
      return;
    }

    // Add version to request context for use in handlers
    (request as any).apiVersion = effectiveVersion;

    // Check for deprecation and add warning header
    if (versioningService.isVersionDeprecated(effectiveVersion)) {
      const warning = versioningService.getDeprecationWarning(effectiveVersion);
      if (warning) {
        // RFC 7234 format: "299 - "Deprecated API" "Sunset: <date>"
        const versionInfo = versioningService.getVersionInfo(effectiveVersion);
        let warningHeader = `299 - "Deprecated API"`;
        if (versionInfo?.sunsetAt) {
          warningHeader += ` "Sunset: ${versionInfo.sunsetAt.toISOString()}"`;
        }
        reply.header('Warning', warningHeader);
        reply.header('X-API-Version-Deprecated', 'true');
        if (versionInfo?.replacementVersion) {
          reply.header('X-API-Version-Replacement', versionInfo.replacementVersion);
        }
      }

      // Track deprecation usage
      monitoring.trackEvent('api.version.deprecated-usage', {
        version: effectiveVersion,
        endpoint: request.url,
        method: request.method,
        tenantId: (request as any).user?.tenantId,
        userId: (request as any).user?.id,
      });
    }

    // Add version headers to response
    if (addVersionHeaders) {
      reply.header('X-API-Version', effectiveVersion);
      reply.header('X-API-Version-Current', versioningService.getCurrentVersion());
      
      const versionInfo = versioningService.getVersionInfo(effectiveVersion);
      if (versionInfo?.status) {
        reply.header('X-API-Version-Status', versionInfo.status);
      }
    }

    // Track version usage
    if (trackUsage) {
      versioningService.trackVersionUsage({
        version: effectiveVersion,
        endpoint: request.url || '',
        method: request.method,
        tenantId: (request as any).user?.tenantId,
        userId: (request as any).user?.id,
      });
    }
  };
}

/**
 * Register API versioning middleware globally
 */
export function registerApiVersioningMiddleware(
  server: any,
  options: ApiVersioningMiddlewareOptions
): void {
  const middleware = createApiVersioningMiddleware(options);

  // Apply to all /api/* routes
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only apply to API routes
    if (request.url.startsWith('/api/')) {
      await middleware(request, reply);
    }
  });
}
