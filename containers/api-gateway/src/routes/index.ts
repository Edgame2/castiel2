/**
 * Route Registration
 * Registers all gateway routes
 */

import { FastifyInstance } from 'fastify';
import { ProxyService } from '../services/ProxyService';
import { tenantValidationMiddleware } from '../middleware/tenantValidation';
import { loadConfig } from '../config';

/**
 * Register gateway routes
 */
export async function registerRoutes(
  server: FastifyInstance,
  proxyService: ProxyService,
  config: ReturnType<typeof loadConfig>
): Promise<void> {
  // Register route mappings from config
  const routeMappings = [
    { path: '/api/auth', service: 'auth', serviceUrl: config.services.auth.url, stripPrefix: true },
    { path: '/api/users', service: 'user_management', serviceUrl: config.services.user_management.url, stripPrefix: true },
    { path: '/api/secrets', service: 'secret_management', serviceUrl: config.services.secret_management.url, stripPrefix: true },
    { path: '/api/logging', service: 'logging', serviceUrl: config.services.logging.url, stripPrefix: true },
    { path: '/api/notifications', service: 'notification', serviceUrl: config.services.notification.url, stripPrefix: true },
    { path: '/api/ai', service: 'ai_service', serviceUrl: config.services.ai_service.url, stripPrefix: true },
    { path: '/api/embeddings', service: 'embeddings', serviceUrl: config.services.embeddings.url, stripPrefix: true },
    { path: '/api/dashboard', service: 'dashboard', serviceUrl: config.services.dashboard.url, stripPrefix: true },
  ];

  if (config.services.ml_service?.url) {
    routeMappings.push({ path: '/api/v1/ml', service: 'ml_service', serviceUrl: config.services.ml_service.url, stripPrefix: false });
  }
  if (config.services.risk_catalog?.url) {
    routeMappings.push({ path: '/api/v1/action-catalog', service: 'risk_catalog', serviceUrl: config.services.risk_catalog.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/risk-catalog', service: 'risk_catalog', serviceUrl: config.services.risk_catalog.url, stripPrefix: false });
  }
  if (config.services.recommendations?.url) {
    routeMappings.push({ path: '/api/v1/feedback', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/tenants', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/feedback-config', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/feedback-types', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
  }
  if (config.services.integration_manager?.url) {
    routeMappings.push({ path: '/api/v1/admin/settings', service: 'integration_manager', serviceUrl: config.services.integration_manager.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/integrations', service: 'integration_manager', serviceUrl: config.services.integration_manager.url, stripPrefix: false });
  }
  if (config.services.shard_manager?.url) {
    routeMappings.push({ path: '/api/v1/admin/shard-types', service: 'shard_manager', serviceUrl: config.services.shard_manager.url, stripPrefix: false });
  }
  if (config.services.integration_processors?.url) {
    routeMappings.push({ path: '/api/v1/admin/monitoring', service: 'integration_processors', serviceUrl: config.services.integration_processors.url, stripPrefix: false });
  }
  if (config.services.risk_analytics?.url) {
    routeMappings.push({ path: '/api/v1', service: 'risk_analytics', serviceUrl: config.services.risk_analytics.url, stripPrefix: false });
  }
  if (config.services.configuration_service?.url) {
    routeMappings.push({ path: '/api/v1/system', service: 'configuration_service', serviceUrl: config.services.configuration_service.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/configuration', service: 'configuration_service', serviceUrl: config.services.configuration_service.url, stripPrefix: false });
  }

  // Register all routes
  for (const mapping of routeMappings) {
    proxyService.registerRoute(mapping);
  }

  // Register catch-all proxy route for /api/*
  server.all('/api/*', {
    preHandler: [tenantValidationMiddleware],
  }, async (request, reply) => {
    const mapping = proxyService.findRoute(request.url);
    
    if (!mapping) {
      reply.code(404).send({ error: 'Route not found' });
      return;
    }

    await proxyService.proxyRequest(request, reply, mapping);
  });

  // Root endpoint
  server.get('/', async (request, reply) => {
    reply.send({
      service: 'API Gateway',
      version: '1.0.0',
      status: 'running',
      routes: proxyService.getRoutes().map(r => ({
        path: r.path,
        service: r.service,
      })),
    });
  });
}

