import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';

/**
 * Embedding Management Routes
 * Manual embedding generation and management endpoints
 */

/**
 * POST /api/v1/shards/:shardId/embeddings/generate
 * Generate embeddings for a specific shard
 */
interface GenerateEmbeddingRequest {
  Params: {
    shardId: string;
  };
  Body: {
    force?: boolean; // Force re-generation even if embeddings exist
  };
}

/**
 * POST /api/v1/shard-types/:shardTypeId/embeddings/regenerate
 * Regenerate embeddings for all shards of a specific type
 */
interface RegenerateShardTypeRequest {
  Params: {
    shardTypeId: string;
  };
  Body: {
    force?: boolean;
  };
}

/**
 * GET /api/v1/tenants/:tenantId/embeddings/stats
 * Get embedding statistics for a tenant
 */
interface EmbeddingStatsRequest {
  Params: {
    tenantId: string;
  };
}

/**
 * POST /api/v1/shards/embeddings/batch
 * Batch generate embeddings for multiple shards
 */
interface BatchGenerateRequest {
  Body: {
    shardIds: string[];
    force?: boolean;
  };
}

export async function registerEmbeddingRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<void> {
  const shardEmbeddingService = (server as any).shardEmbeddingService;
  const shardRepository = (server as any).shardRepository;
  const embeddingCache = (server as any).embeddingCache;

  if (!shardEmbeddingService) {
    server.log.warn('⚠️ Embedding routes not registered - ShardEmbeddingService not available');
    return;
  }

  /**
   * Generate embeddings for a specific shard
   */
  server.post<GenerateEmbeddingRequest>(
    '/shards/:shardId/embeddings/generate',
    {
      schema: {
        description: 'Generate embeddings for a specific shard',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardId'],
          properties: {
            shardId: { type: 'string', description: 'Shard ID' },
          },
        },
        body: {
          type: 'object',
          properties: {
            force: { 
              type: 'boolean', 
              description: 'Force re-generation even if embeddings exist',
              default: false 
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              shardId: { type: 'string' },
              vectorsGenerated: { type: 'number' },
              model: { type: 'string' },
              executionTimeMs: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<GenerateEmbeddingRequest>, reply: FastifyReply) => {
      const startTime = Date.now();
      const { shardId } = request.params;
      const { force = false } = request.body || {};

      try {
        // Get user info from JWT
        const user = (request as any).user;
        if (!user || !user.id || !user.tenantId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Fetch the shard
        if (!shardRepository) {
          return reply.code(500).send({ error: 'Shard repository not available' });
        }

        const shard = await shardRepository.findById(shardId, user.tenantId);
        if (!shard) {
          return reply.code(404).send({ error: 'Shard not found' });
        }

        // Check if embeddings already exist and force flag is false
        if (!force && shard.vectors && shard.vectors.length > 0) {
          const latestVector = shard.vectors[shard.vectors.length - 1];
          return reply.code(200).send({
            success: true,
            shardId,
            vectorsGenerated: 0,
            message: 'Embeddings already exist. Use force=true to regenerate.',
            existingVectors: shard.vectors.length,
            latestModel: latestVector.model,
            latestGeneratedAt: latestVector.generatedAt,
          });
        }

        // Generate embeddings
        const result = await shardEmbeddingService.generateEmbeddingsForShard(
          shard,
          user.tenantId,
          { force }
        );

        const executionTimeMs = Date.now() - startTime;

        monitoring.trackEvent('embedding.manual_generation', {
          shardId,
          tenantId: user.tenantId,
          vectorsGenerated: result.vectors?.length || 0,
          model: result.model,
          force,
          executionTimeMs,
        });

        return reply.code(200).send({
          success: true,
          shardId,
          vectorsGenerated: result.vectors?.length || 0,
          model: result.model,
          executionTimeMs,
        });
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'generateEmbedding',
          shardId,
        });

        server.log.error({ error, shardId }, 'Failed to generate embeddings for shard');
        return reply.code(500).send({
          error: 'Failed to generate embeddings',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Regenerate embeddings for all shards of a specific type
   */
  server.post<RegenerateShardTypeRequest>(
    '/shard-types/:shardTypeId/embeddings/regenerate',
    {
      schema: {
        description: 'Regenerate embeddings for all shards of a specific type',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardTypeId'],
          properties: {
            shardTypeId: { type: 'string', description: 'Shard Type ID' },
          },
        },
        body: {
          type: 'object',
          properties: {
            force: { 
              type: 'boolean', 
              description: 'Force re-generation even if embeddings exist',
              default: false 
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              shardTypeId: { type: 'string' },
              message: { type: 'string' },
              estimatedShards: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<RegenerateShardTypeRequest>, reply: FastifyReply) => {
      const { shardTypeId } = request.params;
      const { force = false } = request.body || {};

      try {
        // Get user info from JWT
        const user = (request as any).user;
        if (!user || !user.id || !user.tenantId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Check user has admin permissions
        if (!user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
          return reply.code(403).send({ 
            error: 'Forbidden', 
            message: 'Only admins can regenerate embeddings for shard types' 
          });
        }

        // Get approximate count of shards for this type
        const shards = await shardRepository.findByShardType(
          shardTypeId,
          user.tenantId,
          { limit: 1 }
        );

        monitoring.trackEvent('embedding.regeneration_started', {
          shardTypeId,
          tenantId: user.tenantId,
          force,
        });

        // Start regeneration in background (async, don't await)
        shardEmbeddingService.regenerateEmbeddingsForShardType(
          shardTypeId,
          user.tenantId,
          { force }
        ).then((result: any) => {
          monitoring.trackEvent('embedding.regeneration_completed', {
            shardTypeId,
            tenantId: user.tenantId,
            shardsProcessed: result.processed,
            shardsSucceeded: result.succeeded,
            shardsFailed: result.failed,
            executionTimeMs: result.executionTimeMs,
          });
        }).catch((error: Error) => {
          monitoring.trackException(error, {
            component: 'EmbeddingRoutes',
            operation: 'regenerateShardType',
            shardTypeId,
          });
        });

        return reply.code(202).send({
          success: true,
          shardTypeId,
          message: 'Regeneration started in background',
          estimatedShards: shards.length,
        });
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'regenerateShardType',
          shardTypeId,
        });

        server.log.error({ error, shardTypeId }, 'Failed to start regeneration for shard type');
        return reply.code(500).send({
          error: 'Failed to start regeneration',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Batch generate embeddings for multiple shards
   */
  server.post<BatchGenerateRequest>(
    '/shards/embeddings/batch',
    {
      schema: {
        description: 'Batch generate embeddings for multiple shards',
        tags: ['Embeddings'],
        body: {
          type: 'object',
          required: ['shardIds'],
          properties: {
            shardIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of shard IDs',
              minItems: 1,
              maxItems: 100,
            },
            force: { 
              type: 'boolean', 
              description: 'Force re-generation even if embeddings exist',
              default: false 
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              shardCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<BatchGenerateRequest>, reply: FastifyReply) => {
      const { shardIds, force = false } = request.body;

      try {
        // Get user info from JWT
        const user = (request as any).user;
        if (!user || !user.id || !user.tenantId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Validate shard IDs
        if (!shardIds || shardIds.length === 0) {
          return reply.code(400).send({ error: 'At least one shard ID required' });
        }

        if (shardIds.length > 100) {
          return reply.code(400).send({ 
            error: 'Too many shards', 
            message: 'Maximum 100 shards per batch request' 
          });
        }

        monitoring.trackEvent('embedding.batch_generation_started', {
          tenantId: user.tenantId,
          shardCount: shardIds.length,
          force,
        });

        // Start batch generation in background
        shardEmbeddingService.batchGenerateEmbeddings(
          shardIds,
          user.tenantId,
          { force }
        ).then((result: any) => {
          monitoring.trackEvent('embedding.batch_generation_completed', {
            tenantId: user.tenantId,
            shardsProcessed: result.processed,
            shardsSucceeded: result.succeeded,
            shardsFailed: result.failed,
            executionTimeMs: result.executionTimeMs,
          });
        }).catch((error: Error) => {
          monitoring.trackException(error, {
            component: 'EmbeddingRoutes',
            operation: 'batchGenerate',
          });
        });

        return reply.code(202).send({
          success: true,
          message: 'Batch generation started in background',
          shardCount: shardIds.length,
        });
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'batchGenerate',
        });

        server.log.error({ error }, 'Failed to start batch generation');
        return reply.code(500).send({
          error: 'Failed to start batch generation',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get embedding statistics for a tenant
   */
  server.get<EmbeddingStatsRequest>(
    '/tenants/:tenantId/embeddings/stats',
    {
      schema: {
        description: 'Get embedding statistics for a tenant',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string', description: 'Tenant ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              totalShards: { type: 'number' },
              shardsWithEmbeddings: { type: 'number' },
              shardsWithoutEmbeddings: { type: 'number' },
              coveragePercentage: { type: 'number' },
              modelDistribution: { type: 'object' },
              averageVectorsPerShard: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<EmbeddingStatsRequest>, reply: FastifyReply) => {
      const { tenantId } = request.params;

      try {
        // Get user info from JWT
        const user = (request as any).user;
        if (!user || !user.id) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Verify user can access this tenant
        if (user.tenantId !== tenantId && !user.roles?.includes('super_admin')) {
          return reply.code(403).send({ 
            error: 'Forbidden', 
            message: 'Cannot access statistics for this tenant' 
          });
        }

        const stats = await shardEmbeddingService.getEmbeddingStats(tenantId);

        monitoring.trackEvent('embedding.stats_viewed', {
          tenantId,
          userId: user.id,
        });

        return reply.code(200).send(stats);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'getStats',
          tenantId,
        });

        server.log.error({ error, tenantId }, 'Failed to get embedding statistics');
        return reply.code(500).send({
          error: 'Failed to get embedding statistics',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get embedding status for a shard
   * GET /api/v1/shards/:shardId/embeddings/status
   */
  server.get<{
    Params: { shardId: string };
  }>(
    '/shards/:shardId/embeddings/status',
    {
      schema: {
        description: 'Get embedding status for a shard',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardId'],
          properties: {
            shardId: { type: 'string', description: 'Shard ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              hasEmbeddings: { type: 'boolean' },
              vectorCount: { type: 'number' },
              latestVectorDate: { type: 'string', format: 'date-time' },
              oldestVectorDate: { type: 'string', format: 'date-time' },
              isRecent: { type: 'boolean' },
              model: { type: 'string' },
              dimensions: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { shardId } = request.params;
      const user = (request as any).user;

      if (!user || !user.userId || !user.tenantId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const status = await shardEmbeddingService.getEmbeddingStatus(shardId, user.tenantId);

        monitoring.trackEvent('embedding.status_viewed', {
          shardId,
          tenantId: user.tenantId,
          hasEmbeddings: status.hasEmbeddings,
        });

        return reply.code(200).send(status);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'getStatus',
          shardId,
        });

        return reply.code(500).send({
          error: 'Failed to get embedding status',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get embedding generation history for a shard
   * GET /api/v1/shards/:shardId/embeddings/history
   */
  server.get<{
    Params: { shardId: string };
    Querystring: { limit?: number };
  }>(
    '/shards/:shardId/embeddings/history',
    {
      schema: {
        description: 'Get embedding generation history for a shard',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardId'],
          properties: {
            shardId: { type: 'string', description: 'Shard ID' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20, maximum: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                jobId: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                completedAt: { type: 'string', format: 'date-time' },
                error: { type: 'string' },
                retryCount: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { shardId } = request.params;
      const { limit = 20 } = request.query;
      const user = (request as any).user;

      if (!user || !user.userId || !user.tenantId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const history = await shardEmbeddingService.getEmbeddingHistory(shardId, user.tenantId, limit);

        monitoring.trackEvent('embedding.history_viewed', {
          shardId,
          tenantId: user.tenantId,
          historyCount: history.length,
        });

        return reply.code(200).send(history);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'getHistory',
          shardId,
        });

        return reply.code(500).send({
          error: 'Failed to get embedding history',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Validate embedding quality for a shard
   * POST /api/v1/shards/:shardId/embeddings/validate
   */
  server.post<{
    Params: { shardId: string };
  }>(
    '/shards/:shardId/embeddings/validate',
    {
      schema: {
        description: 'Validate embedding quality for a shard',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardId'],
          properties: {
            shardId: { type: 'string', description: 'Shard ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              isValid: { type: 'boolean' },
              issues: {
                type: 'array',
                items: { type: 'string' },
              },
              metrics: {
                type: 'object',
                properties: {
                  vectorCount: { type: 'number' },
                  dimensions: { type: 'number', nullable: true },
                  isNormalized: { type: 'boolean' },
                  hasValidModel: { type: 'boolean' },
                  averageMagnitude: { type: 'number', nullable: true },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { shardId } = request.params;
      const user = (request as any).user;

      if (!user || !user.userId || !user.tenantId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const validation = await shardEmbeddingService.validateEmbeddingQuality(shardId, user.tenantId);

        monitoring.trackEvent('embedding.validation_performed', {
          shardId,
          tenantId: user.tenantId,
          isValid: validation.isValid,
          issueCount: validation.issues.length,
        });

        return reply.code(200).send(validation);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'validate',
          shardId,
        });

        return reply.code(500).send({
          error: 'Failed to validate embedding quality',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Force regenerate embeddings for a single shard
   * POST /api/v1/shards/:shardId/embeddings/regenerate
   */
  server.post<{
    Params: { shardId: string };
  }>(
    '/shards/:shardId/embeddings/regenerate',
    {
      schema: {
        description: 'Force regenerate embeddings for a shard',
        tags: ['Embeddings'],
        params: {
          type: 'object',
          required: ['shardId'],
          properties: {
            shardId: { type: 'string', description: 'Shard ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              shardId: { type: 'string' },
              vectorsGenerated: { type: 'number' },
              templateUsed: { type: 'string' },
              processingTimeMs: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { shardId } = request.params;
      const user = (request as any).user;

      if (!user || !user.userId || !user.tenantId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const result = await shardEmbeddingService.regenerateEmbeddingsForShard(shardId, user.tenantId);

        monitoring.trackEvent('embedding.regenerated', {
          shardId,
          tenantId: user.tenantId,
          vectorsGenerated: result.vectorsGenerated,
        });

        return reply.code(200).send({
          success: true,
          ...result,
        });
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'EmbeddingRoutes',
          operation: 'regenerate',
          shardId,
        });

        return reply.code(500).send({
          error: 'Failed to regenerate embeddings',
          message: (error as Error).message,
        });
      }
    }
  );

  // ============================================
  // Embedding Cache Statistics (Admin)
  // ============================================

  /**
   * GET /api/v1/admin/embeddings/cache/stats
   * Get embedding content hash cache statistics (Super Admin only)
   */
  server.get(
    '/admin/embeddings/cache/stats',
    {
      onRequest: [server.authenticate as (request: FastifyRequest, reply: FastifyReply) => Promise<void>],
      schema: {
        description: 'Get embedding content hash cache statistics (Super Admin only)',
        tags: ['Embeddings - Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              stats: {
                type: 'object',
                properties: {
                  totalKeys: { type: 'number' },
                  estimatedSizeMB: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { isGlobalAdmin } = await import('../middleware/authorization.js');
        const { getUser } = await import('../middleware/authenticate.js');
        const user = getUser(request);

        if (!isGlobalAdmin(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Super Admin privileges required',
          });
        }

        if (!embeddingCache) {
          return reply.send({
            enabled: false,
            stats: null,
          });
        }

        const stats = await embeddingCache.getStats();

        monitoring.trackEvent('embedding-cache.stats-requested', {
          tenantId: user.tenantId,
          userId: user.id,
        });

        return reply.send({
          enabled: true,
          stats,
        });
      } catch (error) {
        server.log.error({ error }, 'Failed to get embedding cache stats');
        return reply.status(500).send({
          error: 'Failed to get embedding cache stats',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * DELETE /api/v1/admin/embeddings/cache/clear
   * Clear embedding content hash cache (Super Admin only)
   */
  server.delete(
    '/admin/embeddings/cache/clear',
    {
      onRequest: [server.authenticate as (request: FastifyRequest, reply: FastifyReply) => Promise<void>],
      schema: {
        description: 'Clear embedding content hash cache (Super Admin only)',
        tags: ['Embeddings - Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { isGlobalAdmin } = await import('../middleware/authorization.js');
        const { getUser } = await import('../middleware/authenticate.js');
        const user = getUser(request);

        if (!isGlobalAdmin(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Super Admin privileges required',
          });
        }

        if (!embeddingCache) {
          return reply.status(400).send({
            error: 'Embedding cache not enabled',
            message: 'Embedding content hash cache is not available',
          });
        }

        await embeddingCache.clearAll();

        monitoring.trackEvent('embedding-cache.cleared', {
          tenantId: user.tenantId,
          userId: user.id,
        });

        return reply.send({
          success: true,
          message: 'Embedding cache cleared successfully',
        });
      } catch (error) {
        server.log.error({ error }, 'Failed to clear embedding cache');
        return reply.status(500).send({
          error: 'Failed to clear embedding cache',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  server.log.info('✅ Embedding routes registered');
}
