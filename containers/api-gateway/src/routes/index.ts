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
    { path: '/api/auth', service: 'auth', serviceUrl: config.services.auth.url, stripPrefix: true, pathRewrite: '/api/v1/auth' },
    { path: '/api/users', service: 'user_management', serviceUrl: config.services.user_management.url, pathRewrite: '/api/v1/users' },
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
  if (config.services.user_management?.url) {
    routeMappings.push({ path: '/api/v1/admin/organizations', service: 'user_management', serviceUrl: config.services.user_management.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/organizations', service: 'user_management', serviceUrl: config.services.user_management.url, stripPrefix: false });
    routeMappings.push({ path: '/api/invitations', service: 'user_management', serviceUrl: config.services.user_management.url, pathRewrite: '/api/v1/invitations' });
  }
  if (config.services.recommendations?.url) {
    routeMappings.push({ path: '/api/v1/remediation-workflows', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/recommendations', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/tenant-templates', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/feedback', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/tenants', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/feedback-config', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/feedback-types', service: 'recommendations', serviceUrl: config.services.recommendations.url, stripPrefix: false });
  }
  if (config.services.integration_manager?.url) {
    routeMappings.push({ path: '/api/v1/admin/settings', service: 'integration_manager', serviceUrl: config.services.integration_manager.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/integrations', service: 'integration_manager', serviceUrl: config.services.integration_manager.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/integrations', service: 'integration_manager', serviceUrl: config.services.integration_manager.url, stripPrefix: false });
  }
  if (config.services.shard_manager?.url) {
    routeMappings.push({ path: '/api/v1/shards', service: 'shard_manager', serviceUrl: config.services.shard_manager.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/shard-types', service: 'shard_manager', serviceUrl: config.services.shard_manager.url, stripPrefix: false });
  }
  if (config.services.integration_processors?.url) {
    routeMappings.push({ path: '/api/v1/entity-linking', service: 'integration_processors', serviceUrl: config.services.integration_processors.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/processing', service: 'integration_processors', serviceUrl: config.services.integration_processors.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/admin/monitoring', service: 'integration_processors', serviceUrl: config.services.integration_processors.url, stripPrefix: false });
  }
  if (config.services.adaptive_learning?.url) {
    routeMappings.push({ path: '/api/v1/adaptive-learning', service: 'adaptive_learning', serviceUrl: config.services.adaptive_learning.url, stripPrefix: false });
  }
  // AI: conversations, prompts, multimodal (register before broader /api/v1 so path matching is correct)
  if (config.services.ai_conversation?.url) {
    routeMappings.push({ path: '/api/conversations', service: 'ai_conversation', serviceUrl: config.services.ai_conversation.url, pathRewrite: '/api/v1/conversations' });
  }
  if (config.services.prompt_service?.url) {
    routeMappings.push({ path: '/api/v1/prompts', service: 'prompt_service', serviceUrl: config.services.prompt_service.url, stripPrefix: false });
  }
  if (config.services.multi_modal_service?.url) {
    routeMappings.push({ path: '/api/v1/multimodal', service: 'multi_modal_service', serviceUrl: config.services.multi_modal_service.url, stripPrefix: false });
  }
  if (config.services.web_search?.url) {
    routeMappings.push({ path: '/api/v1/schedules', service: 'web_search', serviceUrl: config.services.web_search.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/web-search', service: 'web_search', serviceUrl: config.services.web_search.url, stripPrefix: false });
  }
  if (config.services.search_service?.url) {
    routeMappings.push({ path: '/api/v1/search', service: 'search_service', serviceUrl: config.services.search_service.url, stripPrefix: false });
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

