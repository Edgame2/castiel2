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

