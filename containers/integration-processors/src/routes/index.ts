/**
 * Route registration
 * @module integration-processors/routes
 */

import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes.js';
import { metricsRoutes } from './metrics.routes.js';
import { suggestedLinksRoutes } from './suggestedLinks.routes.js';
import { entityLinkingRoutes } from './entityLinking.routes.js';
import { processingRoutes } from './processing.routes.js';
import { monitoringRoutes } from './monitoring.routes.js';
import { MonitoringService } from '../services/MonitoringService.js';

export async function registerRoutes(
  app: FastifyInstance,
  monitoringService?: MonitoringService
): Promise<void> {
  // Health checks (required)
  await app.register(healthRoutes);

  // Metrics (required)
  await app.register(metricsRoutes);

  // Suggested links API (feature) - legacy endpoint, kept for backward compatibility
  await app.register(suggestedLinksRoutes, { prefix: '/api/v1' });

  // Entity linking configuration API
  await app.register(entityLinkingRoutes, { prefix: '/api/v1' });

  // Data processing settings API
  await app.register(processingRoutes, { prefix: '/api/v1' });

  // Admin monitoring API (if monitoring service provided)
  if (monitoringService) {
    await monitoringRoutes(app, monitoringService);
  }
}
