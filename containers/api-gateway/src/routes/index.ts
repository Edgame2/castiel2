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
  // Client path = gateway path = /api/v1/<service-path> per documentation/endpoints/API_RULES.md.
  // All route path values MUST use /api/v1/... prefix; use pathRewrite only when backend expects a different path.
  const routeMappings: Array<{ path: string; service: string; serviceUrl: string; stripPrefix?: boolean; pathRewrite?: string }> = [];

  if (config.services.ml_service?.url) {
    routeMappings.push({ path: '/api/v1/ml', service: 'ml_service', serviceUrl: config.services.ml_service.url, stripPrefix: false });
  }
  if (config.services.risk_catalog?.url) {
    routeMappings.push({ path: '/api/v1/action-catalog', service: 'risk_catalog', serviceUrl: config.services.risk_catalog.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/risk-catalog', service: 'risk_catalog', serviceUrl: config.services.risk_catalog.url, stripPrefix: false });
  }
  if (config.services.user_management?.url) {
    routeMappings.push({ path: '/api/v1/tenants', service: 'user_management', serviceUrl: config.services.user_management.url, stripPrefix: false });
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
    routeMappings.push({ path: '/api/v1/webhooks', service: 'integration_manager', serviceUrl: config.services.integration_manager.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/sync', service: 'integration_manager', serviceUrl: config.services.integration_manager.url, stripPrefix: false });
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
  // Phase 2: Missing gateway routes (register before /api/v1 for path precedence)
  if (config.services.forecasting?.url) {
    routeMappings.push({ path: '/api/v1/forecasts', service: 'forecasting', serviceUrl: config.services.forecasting.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/accuracy', service: 'forecasting', serviceUrl: config.services.forecasting.url, stripPrefix: false });
  }
  if (config.services.reasoning_engine?.url) {
    routeMappings.push({ path: '/api/v1/reasoning', service: 'reasoning_engine', serviceUrl: config.services.reasoning_engine.url, stripPrefix: false });
  }
  if (config.services.validation_engine?.url) {
    routeMappings.push({ path: '/api/v1/validation', service: 'validation_engine', serviceUrl: config.services.validation_engine.url, stripPrefix: false });
  }
  if (config.services.workflow_orchestrator?.url) {
    routeMappings.push({ path: '/api/v1/workflows', service: 'workflow_orchestrator', serviceUrl: config.services.workflow_orchestrator.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/hitl', service: 'workflow_orchestrator', serviceUrl: config.services.workflow_orchestrator.url, stripPrefix: false });
  }
  if (config.services.security_scanning?.url) {
    routeMappings.push({ path: '/api/v1/security', service: 'security_scanning', serviceUrl: config.services.security_scanning.url, stripPrefix: false });
  }
  if (config.services.quality_monitoring?.url) {
    routeMappings.push({ path: '/api/v1/quality', service: 'quality_monitoring', serviceUrl: config.services.quality_monitoring.url, stripPrefix: false });
  }
  if (config.services.pattern_recognition?.url) {
    routeMappings.push({ path: '/api/v1/patterns', service: 'pattern_recognition', serviceUrl: config.services.pattern_recognition.url, stripPrefix: false });
  }
  if (config.services.data_enrichment?.url) {
    routeMappings.push({ path: '/api/v1/enrichment', service: 'data_enrichment', serviceUrl: config.services.data_enrichment.url, stripPrefix: false });
  }
  if (config.services.llm_service?.url) {
    routeMappings.push({ path: '/api/v1/llm', service: 'llm_service', serviceUrl: config.services.llm_service.url, stripPrefix: false });
  }
  if (config.services.learning_service?.url) {
    routeMappings.push({ path: '/api/v1/learning', service: 'learning_service', serviceUrl: config.services.learning_service.url, stripPrefix: false });
  }
  if (config.services.context_service?.url) {
    routeMappings.push({ path: '/api/v1/contexts', service: 'context_service', serviceUrl: config.services.context_service.url, stripPrefix: false });
  }
  if (config.services.utility_services?.url) {
    routeMappings.push({ path: '/api/v1/utility', service: 'utility_services', serviceUrl: config.services.utility_services.url, stripPrefix: false });
  }
  if (config.services.ai_analytics?.url) {
    routeMappings.push({ path: '/api/v1/ai-analytics', service: 'ai_analytics', serviceUrl: config.services.ai_analytics.url, stripPrefix: false });
  }
  if (config.services.signal_intelligence?.url) {
    routeMappings.push({ path: '/api/v1/signals', service: 'signal_intelligence', serviceUrl: config.services.signal_intelligence.url, stripPrefix: false });
  }
  // Client path = /api/v1/... (API_RULES). Register /api/v1/* routes before catch-all /api/v1.
  if (config.services.auth?.url) {
    routeMappings.push({ path: '/api/v1/auth', service: 'auth', serviceUrl: config.services.auth.url, stripPrefix: false });
  }
  if (config.services.user_management?.url) {
    routeMappings.push({ path: '/api/v1/users', service: 'user_management', serviceUrl: config.services.user_management.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/teams', service: 'user_management', serviceUrl: config.services.user_management.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/invitations', service: 'user_management', serviceUrl: config.services.user_management.url, stripPrefix: false });
  }
  if (config.services.notification?.url) {
    routeMappings.push({ path: '/api/v1/notifications', service: 'notification', serviceUrl: config.services.notification.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/preferences', service: 'notification', serviceUrl: config.services.notification.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/templates', service: 'notification', serviceUrl: config.services.notification.url, stripPrefix: false });
  }
  if (config.services.dashboard?.url) {
    routeMappings.push({ path: '/api/v1/dashboards', service: 'dashboard', serviceUrl: config.services.dashboard.url, stripPrefix: false });
  }
  if (config.services.ai_conversation?.url) {
    routeMappings.push({ path: '/api/v1/conversations', service: 'ai_conversation', serviceUrl: config.services.ai_conversation.url, stripPrefix: false });
  }
  if (config.services.secret_management?.url) {
    routeMappings.push({ path: '/api/v1/secrets', service: 'secret_management', serviceUrl: config.services.secret_management.url, pathRewrite: '/api/secrets' });
    routeMappings.push({ path: '/api/v1/vaults', service: 'secret_management', serviceUrl: config.services.secret_management.url, pathRewrite: '/api/vaults' });
  }
  if (config.services.logging?.url) {
    routeMappings.push({ path: '/api/v1/logs', service: 'logging', serviceUrl: config.services.logging.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/export', service: 'logging', serviceUrl: config.services.logging.url, stripPrefix: false });
    routeMappings.push({ path: '/api/v1/config', service: 'logging', serviceUrl: config.services.logging.url, stripPrefix: false });
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

