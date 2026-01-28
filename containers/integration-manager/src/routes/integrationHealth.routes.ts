/**
 * Integration Health & Monitoring API routes
 * @module integration-manager/routes/integrationHealth
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware, getContainer } from '@coder/shared';
import { IntegrationService } from '../services/IntegrationService';
import { SyncTaskService } from '../services/SyncTaskService';
import { SyncStatus, IntegrationStatus, ConnectionStatus } from '../types/integration.types';
import { log } from '../utils/logger';

export async function integrationHealthRoutes(
  app: FastifyInstance,
  integrationService: IntegrationService,
  syncTaskService: SyncTaskService
): Promise<void> {
  // Get integration health
  app.get<{ Params: { id: string } }>(
    '/api/v1/integrations/:id/health',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration health status',
        tags: ['Integrations', 'Health'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              health: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;

        const integration = await integrationService.getById(id, tenantId);

        // Get recent sync tasks for success rate calculation
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const recentTasks = await syncTaskService.list(tenantId, {
          integrationId: id,
          limit: 1000, // Get enough to calculate rates
        });

        // Calculate success rates
        const tasks7d = recentTasks.items.filter(
          (task) => task.startedAt >= sevenDaysAgo && task.status !== SyncStatus.RUNNING
        );
        const tasks30d = recentTasks.items.filter(
          (task) => task.startedAt >= thirtyDaysAgo && task.status !== SyncStatus.RUNNING
        );

        const success7d = tasks7d.filter((task) => task.status === SyncStatus.SUCCESS).length;
        const success30d = tasks30d.filter((task) => task.status === SyncStatus.SUCCESS).length;

        const successRate7d = tasks7d.length > 0 ? success7d / tasks7d.length : 1.0;
        const successRate30d = tasks30d.length > 0 ? success30d / tasks30d.length : 1.0;

        // Calculate total records synced
        const totalRecordsSynced = recentTasks.items.reduce(
          (sum, task) => sum + (task.stats?.recordsProcessed || 0),
          0
        );

        // Determine overall health status
        let status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected' = 'healthy';
        const issues: string[] = [];

        if (integration.connectionStatus === ConnectionStatus.ERROR || integration.status === IntegrationStatus.ERROR) {
          status = 'unhealthy';
          issues.push('Connection error');
        } else if (integration.connectionStatus !== ConnectionStatus.ACTIVE) {
          status = 'disconnected';
          issues.push('Not connected');
        } else if (successRate7d < 0.8) {
          status = 'degraded';
          issues.push('Low success rate (7d)');
        } else if (integration.lastSyncAt && now.getTime() - integration.lastSyncAt.getTime() > 24 * 60 * 60 * 1000) {
          status = 'degraded';
          issues.push('No recent sync');
        }

        // API quota (placeholder - would come from integration provider settings)
        const apiQuotaUsed = 0;
        const apiQuotaLimit = 10000;

        return reply.send({
          health: {
            status,
            lastSync: integration.lastSyncAt || null,
            successRate7d,
            successRate30d,
            totalRecordsSynced,
            apiQuotaUsed,
            apiQuotaLimit,
            connectionStatus:
              integration.connectionStatus === ConnectionStatus.ACTIVE
                ? 'connected'
                : integration.connectionStatus === ConnectionStatus.ERROR
                  ? 'error'
                  : 'disconnected',
            issues,
          },
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'HEALTH_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get integration health',
          },
        });
      }
    }
  );

  // Get sync execution details
  app.get<{ Params: { id: string; syncId: string } }>(
    '/api/v1/integrations/:id/sync-history/:syncId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get sync execution details',
        tags: ['Integrations', 'Health'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            syncId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              syncExecution: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, syncId } = request.params;
        const tenantId = request.user!.tenantId;

        // Verify integration exists
        await integrationService.getById(id, tenantId);

        // Get sync task
        const task = await syncTaskService.getById(syncId, tenantId);

        // Verify it belongs to this integration
        if (task.integrationId !== id) {
          return reply.status(404).send({
            error: {
              code: 'SYNC_NOT_FOUND',
              message: 'Sync execution not found for this integration',
            },
          });
        }

        // Calculate duration
        const duration =
          task.durationMs ||
          (task.completedAt && task.startedAt
            ? task.completedAt.getTime() - task.startedAt.getTime()
            : undefined);

        // Extract entities synced from entity stats
        const entitiesSynced = task.entityStats?.map((es) => es.entity) || [];

        // Calculate average record processing time
        const avgRecordProcessingTime =
          task.stats.recordsProcessed > 0 && duration ? duration / task.stats.recordsProcessed : undefined;

        return reply.send({
          syncExecution: {
            id: task.id,
            startedAt: task.startedAt,
            completedAt: task.completedAt,
            duration,
            status:
              task.status === SyncStatus.RUNNING
                ? 'running'
                : task.status === SyncStatus.SUCCESS
                  ? 'completed'
                  : task.status === SyncStatus.FAILED
                    ? 'failed'
                    : 'completed',
            recordsProcessed: task.stats.recordsProcessed,
            recordsFailed: task.stats.recordsFailed,
            entitiesSynced,
            errors: task.errors || [],
            metrics: {
              avgRecordProcessingTime,
              peakMemoryUsage: undefined, // Would come from monitoring
              apiCallsMade: undefined, // Would come from monitoring
            },
          },
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SYNC_DETAILS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get sync execution details',
          },
        });
      }
    }
  );

  // Get error logs
  app.get<{
    Params: { id: string };
    Querystring: {
      limit?: number;
      offset?: number;
      errorType?: string;
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/api/v1/integrations/:id/errors',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get error logs for integration',
        tags: ['Integrations', 'Health'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
            errorType: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              errors: { type: 'array' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;
        const { limit = 50, offset = 0, errorType, startDate, endDate } = request.query;

        // Verify integration exists
        await integrationService.getById(id, tenantId);

        // Get failed sync tasks
        const result = await syncTaskService.list(tenantId, {
          integrationId: id,
          status: SyncStatus.FAILED,
          limit: limit + offset,
        });

        // Extract errors from sync tasks
        const allErrors: any[] = [];
        for (const task of result.items) {
          if (task.errors && task.errors.length > 0) {
            for (const error of task.errors) {
              // Apply filters
              if (errorType && !error.message?.toLowerCase().includes(errorType.toLowerCase())) {
                continue;
              }

              if (startDate && task.startedAt < new Date(startDate)) {
                continue;
              }

              if (endDate && task.startedAt > new Date(endDate)) {
                continue;
              }

              allErrors.push({
                id: `${task.id}-${error.recordId || 'unknown'}`,
                timestamp: task.startedAt,
                errorType: error.entity ? 'entity_error' : 'mapping_error',
                message: error.message,
                affectedEntity: error.entity,
                recordId: error.recordId,
                syncTaskId: task.id,
                retryAttempts: 0, // Would come from retry tracking
                status: 'pending', // Would be tracked separately
                details: error.details,
              });
            }
          }
        }

        // Sort by timestamp descending
        allErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply pagination
        const errors = allErrors.slice(offset, offset + limit);

        return reply.send({
          errors,
          total: allErrors.length,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ERROR_LOGS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get error logs',
          },
        });
      }
    }
  );

  // Get data quality metrics
  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/api/v1/integrations/:id/data-quality',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get data quality metrics for integration',
        tags: ['Integrations', 'Health'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              metrics: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;
        const { startDate, endDate } = request.query;

        // Verify integration exists
        await integrationService.getById(id, tenantId);

        // Get sync tasks in date range
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
        const end = endDate ? new Date(endDate) : new Date();

        const result = await syncTaskService.list(tenantId, {
          integrationId: id,
          limit: 1000,
        });

        // Filter by date range
        const tasksInRange = result.items.filter(
          (task) => task.startedAt >= start && task.startedAt <= end
        );

        // Calculate metrics
        const totalRecords = tasksInRange.reduce((sum, task) => sum + (task.stats?.recordsProcessed || 0), 0);
        const failedRecords = tasksInRange.reduce((sum, task) => sum + (task.stats?.recordsFailed || 0), 0);
        const validationFailures = tasksInRange.reduce(
          (sum, task) => sum + (task.errors?.filter((e) => e.message?.includes('validation')).length || 0),
          0
        );

        const validationFailureRate = totalRecords > 0 ? validationFailures / totalRecords : 0;

        // Calculate missing required fields (would require shard inspection)
        const missingRequiredFields = 0; // Placeholder

        // Calculate invalid data types (would require shard inspection)
        const invalidDataTypes = 0; // Placeholder

        // Calculate duplicate records (would require shard inspection)
        const duplicateRecords = 0; // Placeholder

        // Calculate data completeness score
        const dataCompletenessScore = totalRecords > 0 ? (totalRecords - failedRecords) / totalRecords : 1.0;

        return reply.send({
          metrics: {
            validationFailureRate,
            missingRequiredFields,
            invalidDataTypes,
            duplicateRecords,
            dataCompletenessScore,
            totalRecords,
            failedRecords,
            period: {
              startDate: start,
              endDate: end,
            },
          },
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'DATA_QUALITY_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get data quality metrics',
          },
        });
      }
    }
  );

  // Get performance metrics
  app.get<{
    Params: { id: string };
    Querystring: {
      timeRange?: '1h' | '24h' | '7d' | '30d';
    };
  }>(
    '/api/v1/integrations/:id/performance',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get performance metrics for integration',
        tags: ['Integrations', 'Health'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d'], default: '7d' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              metrics: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;
        const { timeRange = '7d' } = request.query;

        // Verify integration exists
        await integrationService.getById(id, tenantId);

        // Calculate time range
        const now = new Date();
        const timeRanges: Record<string, number> = {
          '1h': 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        };
        const start = new Date(now.getTime() - timeRanges[timeRange]);

        // Get sync tasks in time range
        const result = await syncTaskService.list(tenantId, {
          integrationId: id,
          limit: 1000,
        });

        const tasksInRange = result.items.filter((task) => task.startedAt >= start);

        // Calculate metrics
        const syncDurations = tasksInRange
          .map((task) => task.durationMs || (task.completedAt && task.startedAt ? task.completedAt.getTime() - task.startedAt.getTime() : undefined))
          .filter((d): d is number => d !== undefined);

        const avgSyncDuration = syncDurations.length > 0
          ? syncDurations.reduce((sum, d) => sum + d, 0) / syncDurations.length
          : 0;

        const recordsPerSync = tasksInRange
          .map((task) => task.stats?.recordsProcessed || 0)
          .filter((r) => r > 0);

        const avgRecordsPerSync = recordsPerSync.length > 0
          ? recordsPerSync.reduce((sum, r) => sum + r, 0) / recordsPerSync.length
          : 0;

        const errorRates = tasksInRange.map((task) => {
          const total = task.stats?.recordsProcessed || 0;
          const failed = task.stats?.recordsFailed || 0;
          return total > 0 ? failed / total : 0;
        });

        const avgErrorRate = errorRates.length > 0
          ? errorRates.reduce((sum, r) => sum + r, 0) / errorRates.length
          : 0;

        // API latency (placeholder - would come from monitoring)
        const avgApiLatency = undefined;

        return reply.send({
          metrics: {
            avgSyncDuration,
            avgRecordsPerSync,
            avgErrorRate,
            avgApiLatency,
            timeRange,
            period: {
              startDate: start,
              endDate: now,
            },
          },
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'PERFORMANCE_METRICS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get performance metrics',
          },
        });
      }
    }
  );
}
