/**
 * SCIM Routes
 * SCIM 2.0 compliant endpoints for user and group provisioning
 */

import type { FastifyInstance } from 'fastify';
import { SCIMController } from '../controllers/scim.controller.js';
import { scimAuthenticate } from '../middleware/scim-auth.js';
import type { SCIMService } from '../services/auth/scim.service.js';

/**
 * Register SCIM 2.0 routes
 */
export async function registerSCIMRoutes(
  server: FastifyInstance,
  scimService: SCIMService
): Promise<void> {
  const controller = new SCIMController(scimService);
  const scimAuth = scimAuthenticate(scimService);

  // Public endpoints (no auth required)
  server.get('/scim/v2/ServiceProviderConfig', (request, reply) =>
    controller.getServiceProviderConfig(request, reply)
  );

  server.get('/scim/v2/ResourceTypes', (request, reply) =>
    controller.getResourceTypes(request, reply)
  );

  server.get('/scim/v2/Schemas', (request, reply) =>
    controller.getSchemas(request, reply)
  );

  // Protected endpoints (require SCIM bearer token)
  // Users endpoints
  server.post(
    '/scim/v2/Users',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.createUser(request, reply)
  );

  server.get(
    '/scim/v2/Users',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.listUsers(request, reply)
  );

  server.get(
    '/scim/v2/Users/:id',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.getUser(request, reply)
  );

  server.put(
    '/scim/v2/Users/:id',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.updateUser(request, reply)
  );

  server.patch(
    '/scim/v2/Users/:id',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.patchUser(request, reply)
  );

  server.delete(
    '/scim/v2/Users/:id',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.deleteUser(request, reply)
  );

  // Groups endpoints
  server.post(
    '/scim/v2/Groups',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.createGroup(request, reply)
  );

  server.get(
    '/scim/v2/Groups',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.listGroups(request, reply)
  );

  server.get(
    '/scim/v2/Groups/:id',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.getGroup(request, reply)
  );

  server.patch(
    '/scim/v2/Groups/:id',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.patchGroup(request, reply)
  );

  server.delete(
    '/scim/v2/Groups/:id',
    {
      onRequest: [scimAuth],
    },
    (request, reply) => controller.deleteGroup(request, reply)
  );

  server.log.info('✅ SCIM routes registered');
}


