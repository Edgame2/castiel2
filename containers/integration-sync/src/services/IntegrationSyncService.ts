/**
 * Integration Sync Service
 * Manages sync tasks, bidirectional synchronization, and webhook management
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  SyncTask,
  SyncExecution,
  SyncConflict,
  Webhook,
  SyncTaskStatus,
  SyncDirection,
  ConflictResolutionStrategy,
} from '../types/integration-sync.types';
import { publishIntegrationSyncEvent } from '../events/publishers/IntegrationSyncEventPublisher';
import { v4 as uuidv4 } from 'uuid';

export class IntegrationSyncService {
  private config: ReturnType<typeof loadConfig>;
  private integrationManagerClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private secretManagementClient: ServiceClient;
  private runningTasks = new Set<string>();
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    // Initialize service clients
    this.integrationManagerClient = new ServiceClient({
      baseURL: this.config.services.integration_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.secretManagementClient = new ServiceClient({
      baseURL: this.config.services.secret_management?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'integration-sync',
      serviceName: 'integration-sync',
      tenantId,
    });
  }

  /**
   * Create sync task
   */
  async createSyncTask(
    tenantId: string,
    integrationId: string,
    direction: SyncDirection,
    entityType?: string,
    filters?: Record<string, any>
  ): Promise<SyncTask> {
    const taskId = uuidv4();

    try {
      log.info('Creating sync task', {
        taskId,
        integrationId,
        direction,
        tenantId,
        service: 'integration-sync',
      });

      const task: SyncTask = {
        taskId,
        tenantId,
        integrationId,
        direction,
        status: 'pending',
        entityType,
        filters,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      const container = getContainer('integration_sync_tasks');
      await container.items.create(
        {
          id: taskId,
          tenantId,
          ...task,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      // Publish sync started event
      await publishIntegrationSyncEvent('integration.sync.started', tenantId, {
        taskId,
        integrationId,
        direction,
      });

      return task;
    } catch (error: any) {
      log.error('Failed to create sync task', error, {
        taskId,
        integrationId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }

  /**
   * Execute sync task
   */
  async executeSyncTask(taskId: string, tenantId: string): Promise<SyncExecution> {
    if (this.runningTasks.has(taskId)) {
      throw new Error('Sync task is already running');
    }

    this.runningTasks.add(taskId);
    const executionId = uuidv4();

    try {
      log.info('Executing sync task', {
        taskId,
        executionId,
        tenantId,
        service: 'integration-sync',
      });

      // Get task
      const task = await this.getSyncTask(taskId, tenantId);
      if (!task) {
        throw new Error('Sync task not found');
      }

      if (task.status === 'running') {
        throw new Error('Sync task is already running');
      }

      // Update task status
      task.status = 'running';
      task.startedAt = new Date();
      await this.updateSyncTask(task, tenantId);

      // Create execution record
      const execution: SyncExecution = {
        executionId,
        taskId,
        tenantId,
        status: 'running',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        startedAt: new Date(),
      };

      const executionContainer = getContainer('integration_executions');
      await executionContainer.items.create(
        {
          id: executionId,
          tenantId,
          ...execution,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      // Execute actual sync logic
      const token = this.getServiceToken(tenantId);
      
      // Step 1: Get integration connection details from integration-manager
      let integration: any;
      try {
        integration = await this.integrationManagerClient.get<any>(
          `/api/v1/integrations/${task.integrationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );
      } catch (error: any) {
        log.error('Failed to get integration details', error, {
          integrationId: task.integrationId,
          tenantId,
          service: 'integration-sync',
        });
        throw new Error(`Integration not found: ${task.integrationId}`);
      }

      // Step 2: Get credentials from secret-management
      let credentials: any;
      try {
        credentials = await this.secretManagementClient.get<any>(
          `/api/v1/secrets/${integration.credentialSecretId}/value`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );
      } catch (error: any) {
        log.error('Failed to get integration credentials', error, {
          secretId: integration.credentialSecretId,
          tenantId,
          service: 'integration-sync',
        });
        throw new Error('Failed to retrieve integration credentials');
      }

      // Step 3: Fetch data from external system (via integration-manager adapter)
      let externalData: any[] = [];
      try {
        const fetchResponse = await this.integrationManagerClient.post<any>(
          `/api/v1/integrations/${task.integrationId}/fetch`,
          {
            direction: task.direction,
            entityType: task.entityType,
            filters: task.filters,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );
        externalData = fetchResponse.data || [];
      } catch (error: any) {
        log.error('Failed to fetch data from external system', error, {
          integrationId: task.integrationId,
          tenantId,
          service: 'integration-sync',
        });
        // Continue with empty data - will result in 0 records processed
      }

      // Step 4: Transform and sync data to shards
      let recordsProcessed = 0;
      let recordsCreated = 0;
      let recordsUpdated = 0;
      let recordsFailed = 0;

      for (const item of externalData) {
        try {
          recordsProcessed++;
          
          // Transform external data to shard format
          const shardData = this.transformToShard(item, integration, task.entityType);
          
          // Check if shard already exists (by external ID)
          const existingShard = await this.findShardByExternalId(
            shardData.externalId,
            task.entityType,
            tenantId,
            token
          );

          if (existingShard) {
            // Update existing shard
            await this.shardManagerClient.put<any>(
              `/api/v1/shards/${existingShard.id}`,
              {
                ...existingShard,
                ...shardData,
                updatedAt: new Date(),
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Tenant-ID': tenantId,
                },
              }
            );
            recordsUpdated++;
          } else {
            // Create new shard
            await this.shardManagerClient.post<any>(
              '/api/v1/shards',
              {
                ...shardData,
                createdAt: new Date(),
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Tenant-ID': tenantId,
                },
              }
            );
            recordsCreated++;
          }
        } catch (error: any) {
          recordsFailed++;
          log.error('Failed to sync record', error, {
            item,
            tenantId,
            service: 'integration-sync',
          });
          
          // Store conflict if bidirectional sync
          if (task.direction === 'bidirectional') {
            await this.storeConflict(task.taskId, tenantId, item, error.message);
          }
        }
      }

      // Update execution with actual results
      execution.recordsProcessed = recordsProcessed;
      execution.recordsCreated = recordsCreated;
      execution.recordsUpdated = recordsUpdated;
      execution.recordsFailed = recordsFailed;
      execution.status = 'completed';
      execution.completedAt = new Date();

      // Update execution
      await executionContainer.item(executionId, tenantId).replace({
        id: executionId,
        tenantId,
        ...execution,
        updatedAt: new Date(),
      });

      // Update task
      task.status = 'completed';
      task.completedAt = new Date();
      task.recordsProcessed = execution.recordsProcessed;
      task.recordsCreated = execution.recordsCreated;
      task.recordsUpdated = execution.recordsUpdated;
      task.recordsFailed = execution.recordsFailed;
      await this.updateSyncTask(task, tenantId);

      // Publish completion event
      await publishIntegrationSyncEvent('integration.sync.completed', tenantId, {
        taskId,
        executionId,
        recordsProcessed: execution.recordsProcessed,
      });

      return execution;
    } catch (error: any) {
      log.error('Sync task execution failed', error, {
        taskId,
        executionId,
        tenantId,
        service: 'integration-sync',
      });

      // Update task status
      try {
        const task = await this.getSyncTask(taskId, tenantId);
        if (task) {
          task.status = 'failed';
          task.error = error.message;
          task.completedAt = new Date();
          await this.updateSyncTask(task, tenantId);
        }
      } catch (updateError) {
        log.error('Failed to update task status', updateError, { service: 'integration-sync' });
      }

      // Publish failure event
      await publishIntegrationSyncEvent('integration.sync.failed', tenantId, {
        taskId,
        executionId,
        error: error.message,
      });

      throw error;
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  /**
   * Transform external data to shard format
   */
  private transformToShard(externalItem: any, integration: any, entityType?: string): any {
    // Basic transformation - can be enhanced with integration-specific mappings
    return {
      shardType: entityType || 'opportunity',
      name: externalItem.name || externalItem.title || externalItem.id,
      data: externalItem,
      externalId: externalItem.id || externalItem.externalId,
      externalSource: integration.type,
      metadata: {
        integrationId: integration.id,
        syncedAt: new Date(),
      },
    };
  }

  /**
   * Find shard by external ID
   */
  private async findShardByExternalId(
    externalId: string,
    entityType: string,
    tenantId: string,
    token: string
  ): Promise<any | null> {
    try {
      // Query shards by external ID
      const response = await this.shardManagerClient.get<any>(
        `/api/v1/shards?filter=externalId eq '${externalId}' and shardType eq '${entityType}'`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error: any) {
      log.error('Failed to find shard by external ID', error, {
        externalId,
        entityType,
        tenantId,
        service: 'integration-sync',
      });
      return null;
    }
  }

  /**
   * Store sync conflict
   */
  private async storeConflict(
    taskId: string,
    tenantId: string,
    item: any,
    error: string
  ): Promise<void> {
    try {
      const conflict: SyncConflict = {
        conflictId: uuidv4(),
        taskId,
        tenantId,
        entityId: item.id || item.externalId || '',
        entityType: item.type || 'unknown',
        sourceData: item,
        targetData: null,
        resolutionStrategy: 'manual',
        resolved: false,
        createdAt: new Date(),
      };

      const container = getContainer('integration_conflicts');
      await container.items.create(
        {
          id: conflict.conflictId,
          tenantId,
          ...conflict,
        },
        { partitionKey: tenantId }
      );
    } catch (error: any) {
      log.error('Failed to store conflict', error, {
        taskId,
        tenantId,
        service: 'integration-sync',
      });
    }
  }

  /**
   * Handle bidirectional sync (when shard is updated)
   */
  async handleBidirectionalSync(shardId: string, tenantId: string): Promise<void> {
    try {
      log.info('Handling bidirectional sync', {
        shardId,
        tenantId,
        service: 'integration-sync',
      });

      const token = this.getServiceToken(tenantId);

      // Step 1: Get shard
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${shardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!shard || !shard.externalId || !shard.externalSource) {
        // Shard not linked to external integration, skip
        return;
      }

      // Step 2: Find integration by type
      const integrations = await this.integrationManagerClient.get<any>(
        `/api/v1/integrations?filter=type eq '${shard.externalSource}'`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!integrations.data || integrations.data.length === 0) {
        log.warn('No integration found for bidirectional sync', {
          externalSource: shard.externalSource,
          tenantId,
          service: 'integration-sync',
        });
        return;
      }

      const integration = integrations.data[0];

      // Step 3: Sync changes to external system
      try {
        await this.integrationManagerClient.post<any>(
          `/api/v1/integrations/${integration.id}/push`,
          {
            externalId: shard.externalId,
            data: shard.data,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        // Publish data synced event
        await publishIntegrationSyncEvent('integration.data.synced', tenantId, {
          shardId,
          direction: 'outbound',
          integrationId: integration.id,
        });
      } catch (error: any) {
        log.error('Failed to push changes to external system', error, {
          shardId,
          integrationId: integration.id,
          tenantId,
          service: 'integration-sync',
        });
        
        // Store conflict
        await this.storeConflict('bidirectional', tenantId, shard, error.message);
      }
    } catch (error: any) {
      log.error('Bidirectional sync failed', error, {
        shardId,
        tenantId,
        service: 'integration-sync',
      });
    }
  }

  /**
   * Get sync task by ID
   */
  async getSyncTask(taskId: string, tenantId: string): Promise<SyncTask | null> {
    try {
      const container = getContainer('integration_sync_tasks');
      const { resource } = await container.item(taskId, tenantId).read<SyncTask>();
      return resource || null;
    } catch (error: any) {
      log.error('Failed to get sync task', error, {
        taskId,
        tenantId,
        service: 'integration-sync',
      });
      return null;
    }
  }

  /**
   * Update sync task
   */
  private async updateSyncTask(task: SyncTask, tenantId: string): Promise<void> {
    try {
      const container = getContainer('integration_sync_tasks');
      await container.item(task.taskId, tenantId).replace({
        id: task.taskId,
        tenantId,
        ...task,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      log.error('Failed to update sync task', error, {
        taskId: task.taskId,
        tenantId,
        service: 'integration-sync',
      });
    }
  }

  /**
   * Resolve sync conflict
   */
  async resolveConflict(
    conflictId: string,
    tenantId: string,
    resolution: ConflictResolutionStrategy,
    resolvedBy: string
  ): Promise<SyncConflict> {
    try {
      const container = getContainer('integration_conflicts');
      const { resource: conflict } = await container.item(conflictId, tenantId).read<SyncConflict>();

      if (!conflict) {
        throw new Error('Conflict not found');
      }

      conflict.resolutionStrategy = resolution;
      conflict.resolved = true;
      conflict.resolvedAt = new Date();
      conflict.resolvedBy = resolvedBy;

      await container.item(conflictId, tenantId).replace({
        id: conflictId,
        tenantId,
        ...conflict,
        updatedAt: new Date(),
      });

      return conflict;
    } catch (error: any) {
      log.error('Failed to resolve conflict', error, {
        conflictId,
        tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }
}
