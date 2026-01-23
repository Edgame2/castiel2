/**
 * Revisions Routes
 * 
 * Registers all revision management endpoints for shards.
 */

import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { RevisionsController } from '../controllers/revisions.controller.js';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { ShardRepository } from '@castiel/api-core';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { ACLService } from '../services/acl.service.js';
import { ACLCacheService } from '../services/acl-cache.service.js';
import { requireAuth } from '../middleware/authorization.js';

/**
 * Register revision routes
 */
export async function registerRevisionsRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider,
  cacheService?: any,
  cacheSubscriber?: any
): Promise<void> {
  // Initialize repositories
  const revisionRepository = new RevisionRepository(monitoring);
  const shardRepository = new ShardRepository(monitoring);
  try {
    await revisionRepository.ensureContainer();
    await shardRepository.ensureContainer();
  } catch (error) {
    server.log.warn('Failed to ensure Cosmos DB containers for revisions - routes will still be registered');
    server.log.warn(error);
  }

  // Initialize cache service if available
  let shardCacheService: ShardCacheService | null = null;
  if (cacheService && cacheSubscriber) {
    shardCacheService = new ShardCacheService(cacheService, cacheSubscriber, monitoring);
  }

  // Initialize ACL cache service if available
  let aclCacheService: ACLCacheService | null = null;
  if (cacheService && cacheSubscriber) {
    aclCacheService = new ACLCacheService(cacheService, cacheSubscriber, monitoring);
  }

  // Initialize ACL service
  const aclService = new ACLService(shardRepository, aclCacheService, monitoring);

  // Initialize controller
  const controller = new RevisionsController(
    revisionRepository,
    shardRepository,
    shardCacheService,
    aclService,
    monitoring
  );

  const authDecorator = (server as FastifyInstance & { authenticate?: any }).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️ Revisions routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // List revisions for a shard
  server.get('/api/v1/shards/:shardId/revisions', { onRequest: authGuards }, async (request, reply) => {
    return controller.listRevisions(request as any, reply);
  });

  // Get a specific revision by number
  server.get('/api/v1/shards/:shardId/revisions/:revisionNumber', { onRequest: authGuards }, async (request, reply) => {
    return controller.getRevision(request as any, reply);
  });

  // Get the latest revision
  server.get('/api/v1/shards/:shardId/revisions/latest', { onRequest: authGuards }, async (request, reply) => {
    return controller.getLatestRevision(request as any, reply);
  });

  // Compare two revisions
  server.post('/api/v1/shards/:shardId/revisions/compare', { onRequest: authGuards }, async (request, reply) => {
    return controller.compareRevisions(request as any, reply);
  });

  // Revert shard to a specific revision
  server.post('/api/v1/shards/:shardId/revert/:revisionNumber', { onRequest: authGuards }, async (request, reply) => {
    return controller.revertToRevision(request as any, reply);
  });

  // Get revision statistics
  server.get('/api/v1/shards/:shardId/revisions/stats', { onRequest: authGuards }, async (request, reply) => {
    return controller.getRevisionStats(request as any, reply);
  });

  monitoring.trackEvent('revisions-routes-registered', {
    cacheEnabled: shardCacheService !== null,
    aclEnabled: true,
  });
}
