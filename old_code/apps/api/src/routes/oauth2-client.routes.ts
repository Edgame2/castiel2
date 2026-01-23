/**
 * OAuth2 Client Management Routes
 * API routes for managing OAuth2 client applications
 */

import type { FastifyInstance } from 'fastify';
import { OAuth2ClientController } from '../controllers/oauth2-client.controller.js';
import { requireAuth, requireRole, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';

/**
 * Register OAuth2 client management routes
 */
export async function registerOAuth2ClientRoutes(
  server: FastifyInstance
): Promise<void> {
  const oauth2ClientService = (server as any).oauth2ClientService;
  if (!oauth2ClientService) {
    server.log.warn('⚠️  OAuth2 client routes not registered - OAuth2ClientService missing');
    return;
  }

  const authDecorator = (server as any).authenticate;
  if (!authDecorator) {
    server.log.warn('⚠️  OAuth2 client routes not registered - authentication decorator missing');
    return;
  }

  const controller = new OAuth2ClientController(oauth2ClientService);

  const tenantAdminGuards = [
    authDecorator,
    requireAuth(),
    requireRole('owner', 'admin', 'global_admin', 'super-admin', 'super_admin'),
    requireTenantOrGlobalAdmin(),
  ];

  // List OAuth2 clients
  server.get(
    '/api/tenants/:tenantId/oauth2/clients',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.listClients(request, reply)
  );

  // Create OAuth2 client
  server.post(
    '/api/tenants/:tenantId/oauth2/clients',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.createClient(request, reply)
  );

  // Get OAuth2 client
  server.get(
    '/api/tenants/:tenantId/oauth2/clients/:clientId',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.getClient(request, reply)
  );

  // Update OAuth2 client
  server.patch(
    '/api/tenants/:tenantId/oauth2/clients/:clientId',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.updateClient(request, reply)
  );

  // Delete OAuth2 client
  server.delete(
    '/api/tenants/:tenantId/oauth2/clients/:clientId',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.deleteClient(request, reply)
  );

  // Rotate client secret
  server.post(
    '/api/tenants/:tenantId/oauth2/clients/:clientId/rotate-secret',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.rotateSecret(request, reply)
  );

  // List available scopes (public endpoint - requires authentication but no specific role)
  server.get(
    '/api/oauth2/scopes',
    {
      onRequest: [authDecorator, requireAuth()],
    },
    (request, reply) => controller.listScopes(request, reply)
  );

  server.log.info('✅ OAuth2 client management routes registered');
}








