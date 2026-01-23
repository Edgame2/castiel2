/**
 * ACL Routes
 * 
 * Registers all ACL management endpoints for access control operations.
 */

import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ACLController } from '../controllers/acl.controller.js';
import { ACLService } from '../services/acl.service.js';
import { ACLCacheService } from '../services/acl-cache.service.js';
import { ShardRepository } from '@castiel/api-core';
import { requireAuth } from '../middleware/authorization.js';

/**
 * Register ACL routes
 */
export async function registerACLRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider,
  cacheService?: any,
  cacheSubscriber?: any
): Promise<void> {
  // Initialize ACL cache service if cache is available
  let aclCacheService: ACLCacheService | null = null;
  if (cacheService && cacheSubscriber) {
    aclCacheService = new ACLCacheService(cacheService, cacheSubscriber, monitoring);
    monitoring.trackEvent('acl-cache-service-initialized');
  } else {
    monitoring.trackEvent('acl-cache-service-unavailable', {
      reason: 'Cache services not provided',
    });
  }

  // Initialize shard repository
  const shardRepository = new ShardRepository(monitoring);
  try {
    await shardRepository.ensureContainer();
  } catch (error) {
    server.log.warn('Failed to ensure Cosmos DB container for ACL - routes will still be registered');
    server.log.warn(error);
  }

  // Initialize ACL service
  const aclService = new ACLService(shardRepository, aclCacheService, monitoring);

  // Initialize controller
  const controller = new ACLController(aclService, monitoring);

  const authDecorator = (server as FastifyInstance & { authenticate?: any }).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️ ACL routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // Grant permissions to a user or role
  server.post('/api/v1/acl/grant', { onRequest: authGuards }, async (request, reply) => {
    return controller.grantPermission(request as any, reply);
  });

  // Revoke permissions from a user or role
  server.post('/api/v1/acl/revoke', { onRequest: authGuards }, async (request, reply) => {
    return controller.revokePermission(request as any, reply);
  });

  // Update ACL for a shard (add/remove entries)
  server.put('/api/v1/acl/:shardId', { onRequest: authGuards }, async (request, reply) => {
    return controller.updateACL(request as any, reply);
  });

  // Get user permissions for a shard
  server.get('/api/v1/acl/:shardId/permissions', { onRequest: authGuards }, async (request, reply) => {
    return controller.getUserPermissions(request as any, reply);
  });

  // Check if user has permission on a shard
  server.post('/api/v1/acl/check', { onRequest: authGuards }, async (request, reply) => {
    return controller.checkPermission(request as any, reply);
  });

  // Batch check permissions for multiple shards
  server.post('/api/v1/acl/batch-check', { onRequest: authGuards }, async (request, reply) => {
    return controller.batchCheckPermissions(request as any, reply);
  });

  // Get ACL statistics (admin only)
  server.get('/api/v1/acl/stats', { onRequest: authGuards }, async (request, reply) => {
    return controller.getStats(request as any, reply);
  });

  // Invalidate ACL cache for a shard (admin only)
  server.post('/api/v1/acl/:shardId/invalidate-cache', { onRequest: authGuards }, async (request, reply) => {
    return controller.invalidateShardCache(request as any, reply);
  });

  monitoring.trackEvent('acl-routes-registered', {
    cacheEnabled: aclCacheService !== null,
  });
}
