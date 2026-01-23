// Type safety improvements - removed @ts-nocheck
/**
 * Project Resolver Routes (Phase 2)
 * 
 * API endpoints for project context resolution and relationship management
 */

import { FastifyInstance } from 'fastify';
import { ContextAssemblyService } from '../services/ai-context-assembly.service.js';
import { ShardRepository } from '@castiel/api-core';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { CacheService } from '../services/cache.service.js';
import { CacheSubscriberService } from '../services/cache-subscriber.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import { authenticate } from '../middleware/authenticate.js';
import { UnauthorizedError } from '../middleware/error-handler.js';
import type { InternalRelationship, ExternalRelationship } from '../types/shard.types.js';
import { SyncStatus, SyncDirection, isValidSyncStatus, isValidSyncDirection } from '../types/shard.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register Project Resolver routes
 */
export async function registerProjectResolverRoutes(
  fastify: FastifyInstance,
  monitoring: IMonitoringProvider,
  cacheService: CacheService | null,
  cacheSubscriber: CacheSubscriberService | null,
  contextAssemblyService: ContextAssemblyService
): Promise<void> {
  if (!cacheService) {
    fastify.log.warn('Project resolver routes skipped: CacheService not available');
    return;
  }
  if (!cacheSubscriber) {
    fastify.log.warn('Project resolver routes skipped: CacheSubscriberService not available');
    return;
  }
  // Initialize shard cache service
  const shardCacheService = new ShardCacheService(cacheService, cacheSubscriber, monitoring);
  // Get Phase 2 services from server if available
  const redactionService = (fastify as any).redactionService;
  const auditTrailService = (fastify as any).auditTrailService;
  const shardRepository = new ShardRepository(
    monitoring,
    shardCacheService,
    undefined, // serviceBusService - not needed here
    redactionService,
    auditTrailService
  );

  // Set shard repository on context assembly service
  contextAssemblyService.setShardRepository(shardRepository);

  // Get token cache for authentication
  const tokenCache = (fastify as any).tokenValidationCache || null;
  const authMiddleware = authenticate(tokenCache);

  /**
   * GET /api/v1/projects/:id/context
   * Resolve project context - returns scoped shard set via relationship traversal
   */
  fastify.get<{
    Params: { id: string };
    Querystring: {
      includeExternal?: string;
      minConfidence?: string;
      maxShards?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/v1/projects/:id/context', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const req = request as any;
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedError('Authentication required');
    }

    const projectId = request.params.id;
    const tenantId = req.user.tenantId;

    const options = {
      includeExternal: request.query.includeExternal === 'true',
      minConfidence: request.query.minConfidence ? parseFloat(request.query.minConfidence) : undefined,
      maxShards: request.query.maxShards ? parseInt(request.query.maxShards, 10) : undefined,
      limit: request.query.limit ? parseInt(request.query.limit, 10) : undefined,
      offset: request.query.offset ? parseInt(request.query.offset, 10) : undefined,
    };

    try {
      const result = await contextAssemblyService.resolveProjectContext(
        projectId,
        tenantId,
        {
          ...options,
          userId: req.user.id, // Include userId for ACL checks
        }
      );

      return reply.status(200).send({
        project: result.project,
        linkedShards: result.linkedShards,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        pagination: {
          limit: options.limit || 100,
          offset: options.offset || 0,
        },
      });
    } catch (error: any) {
      fastify.log.error(`Error resolving project context: ${error.message}`);
      return reply.status(error.statusCode || 500).send({
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * PATCH /api/v1/projects/:id/internal-relationships
   * Add or update internal relationships for a project
   */
  fastify.patch<{
    Params: { id: string };
    Body: {
      relationships: Array<{
        shardId: string;
        shardTypeId?: string;
        shardTypeName?: string;
        shardName?: string;
        metadata?: {
          confidence?: number;
          source?: 'crm' | 'llm' | 'messaging' | 'manual';
          [key: string]: any;
        };
      }>;
    };
  }>('/api/v1/projects/:id/internal-relationships', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const req = request as any;
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedError('Authentication required');
    }

    const projectId = request.params.id;
    const tenantId = req.user.tenantId;
    const { relationships } = request.body;

    if (!Array.isArray(relationships) || relationships.length === 0) {
      return reply.status(400).send({
        error: 'relationships array is required and must not be empty',
      });
    }

    try {
      // Get project shard
      const project = await shardRepository.findById(projectId, tenantId);
      if (!project || project.shardTypeId !== 'c_project') {
        return reply.status(404).send({
          error: 'Project not found',
        });
      }

      // Build internal relationships
      const internalRelationships: InternalRelationship[] = relationships.map(rel => ({
        shardId: rel.shardId,
        shardTypeId: rel.shardTypeId || '',
        shardTypeName: rel.shardTypeName,
        shardName: rel.shardName || '',
        createdAt: new Date(),
        metadata: rel.metadata,
      }));

      // Merge with existing relationships
      const existingRelationships = project.internal_relationships || [];
      const mergedRelationships = [...existingRelationships];

      // Update or add relationships
      for (const newRel of internalRelationships) {
        const existingIndex = mergedRelationships.findIndex(r => r.shardId === newRel.shardId);
        if (existingIndex >= 0) {
          mergedRelationships[existingIndex] = newRel;
        } else {
          mergedRelationships.push(newRel);
        }
      }

      // Update project shard
      await shardRepository.update(projectId, tenantId, {
        internal_relationships: mergedRelationships,
      });

      return reply.status(200).send({
        message: 'Internal relationships updated',
        relationshipCount: mergedRelationships.length,
      });
    } catch (error: any) {
      fastify.log.error(`Error updating internal relationships: ${error.message}`);
      return reply.status(error.statusCode || 500).send({
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * PATCH /api/v1/projects/:id/external-relationships
   * Add or update external relationships for a project
   */
  fastify.patch<{
    Params: { id: string };
    Body: {
      relationships: Array<{
        system: string;
        systemType: string;
        externalId: string;
        label?: string;
        syncStatus?: string;
        syncDirection?: string;
        metadata?: Record<string, any>;
      }>;
    };
  }>('/api/v1/projects/:id/external-relationships', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const req = request as any;
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedError('Authentication required');
    }

    const projectId = request.params.id;
    const tenantId = req.user.tenantId;
    const { relationships } = request.body;

    if (!Array.isArray(relationships) || relationships.length === 0) {
      return reply.status(400).send({
        error: 'relationships array is required and must not be empty',
      });
    }

    try {
      // Get project shard
      const project = await shardRepository.findById(projectId, tenantId);
      if (!project || project.shardTypeId !== 'c_project') {
        return reply.status(404).send({
          error: 'Project not found',
        });
      }

      // Build external relationships
      const externalRelationships: ExternalRelationship[] = relationships.map(rel => ({
        id: uuidv4(),
        system: rel.system,
        systemType: rel.systemType,
        externalId: rel.externalId,
        label: rel.label,
        syncStatus: isValidSyncStatus(rel.syncStatus || 'synced') ? (rel.syncStatus as SyncStatus) : SyncStatus.SYNCED,
        syncDirection: isValidSyncDirection(rel.syncDirection || '') ? (rel.syncDirection as SyncDirection) : undefined,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        createdBy: req.user.id || 'system',
        metadata: rel.metadata,
      }));

      // Merge with existing relationships
      const existingRelationships = project.external_relationships || [];
      const mergedRelationships = [...existingRelationships];

      // Update or add relationships
      for (const newRel of externalRelationships) {
        const existingIndex = mergedRelationships.findIndex(
          r => r.system === newRel.system && r.externalId === newRel.externalId
        );
        if (existingIndex >= 0) {
          mergedRelationships[existingIndex] = newRel;
        } else {
          mergedRelationships.push(newRel);
        }
      }

      // Update project shard
      await shardRepository.update(projectId, tenantId, {
        external_relationships: mergedRelationships,
      });

      return reply.status(200).send({
        message: 'External relationships updated',
        relationshipCount: mergedRelationships.length,
      });
    } catch (error: any) {
      fastify.log.error(`Error updating external relationships: ${error.message}`);
      return reply.status(error.statusCode || 500).send({
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * GET /api/v1/projects/:id/insights
   * Get project insights with provenance
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/v1/projects/:id/insights', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const req = request as any;
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedError('Authentication required');
    }

    const projectId = request.params.id;
    const tenantId = req.user.tenantId;

    try {
      // Get project context to find linked shards
      const context = await contextAssemblyService.resolveProjectContext(
        projectId,
        tenantId,
        { includeExternal: false }
      );

      // Find insight shards (c_insight_kpi) linked to project
      const insightShards = context.linkedShards.filter(
        shard => shard.shardTypeId === 'c_insight_kpi'
      );

      // Filter insights with provenance (must have internal_relationships)
      const insightsWithProvenance = insightShards.filter(shard => {
        return shard.internal_relationships && shard.internal_relationships.length > 0;
      });

      // Build response with provenance references
      const insights = insightsWithProvenance.map(shard => ({
        id: shard.id,
        shardTypeId: shard.shardTypeId,
        structuredData: shard.structuredData,
        provenance: shard.internal_relationships?.map(rel => ({
          shardId: rel.shardId,
          shardTypeId: rel.shardTypeId,
          shardName: rel.shardName,
          confidence: rel.metadata?.confidence,
        })) || [],
        createdAt: shard.createdAt,
        updatedAt: shard.updatedAt,
      }));

      return reply.status(200).send({
        projectId,
        insights,
        totalCount: insights.length,
        filteredCount: insightShards.length - insights.length, // Insights without provenance
      });
    } catch (error: any) {
      fastify.log.error(`Error getting project insights: ${error.message}`);
      return reply.status(error.statusCode || 500).send({
        error: error.message || 'Internal server error',
      });
    }
  });
}

