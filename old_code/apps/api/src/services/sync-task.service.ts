import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import {
  SyncTaskRepository,
  SyncExecutionRepository,
  SyncConflictRepository,
  ConversionSchemaRepository,
  ConversionSchemaService,
} from '@castiel/api-core';
import {
  ShardRepository,
  IntegrationAdapterRegistry,
  IntegrationShardService,
  IntegrationDeduplicationService,
  BidirectionalSyncEngine,
} from '@castiel/api-core';
import {
  SyncTask,
  CreateSyncTaskInput,
  UpdateSyncTaskInput,
  SyncTaskListOptions,
  SyncTaskListResult,
  SyncExecution,
  SyncExecutionListOptions,
  SyncExecutionListResult,
  SyncTrigger,
  SyncResults,
  SyncError,
  SyncPhase,
  SyncConflict,
  ResolveConflictInput,
} from '../types/sync-task.types.js';
import { TransformationContext } from '../types/conversion-schema.types.js';
import { IntegrationConnection } from '../types/integration.types.js';
import { IntegrationConnectionRepository, IntegrationRepository } from '../repositories/integration.repository.js';
import { AdapterManagerService } from './adapter-manager.service.js';
import type { IntegrationAdapter } from '../types/adapter.types.js';
import type { BaseIntegrationAdapter, FetchOptions, FetchResult, BatchFetchOptions } from '../integrations/base-adapter.js';

/**
 * Retry configuration for sync operations
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Batch processing configuration
 */
interface BatchConfig {
  batchSize: number;
  delayBetweenBatchesMs: number;
}

interface SyncTaskServiceOptions {
  monitoring: IMonitoringProvider;
  redis?: Redis;
  syncTaskRepository: SyncTaskRepository;
  syncExecutionRepository: SyncExecutionRepository;
  syncConflictRepository: SyncConflictRepository;
  conversionSchemaRepository: ConversionSchemaRepository;
  conversionSchemaService: ConversionSchemaService;
  shardRepository: ShardRepository;
  adapterRegistry: IntegrationAdapterRegistry;
  shardService: IntegrationShardService;
  deduplicationService: IntegrationDeduplicationService;
  bidirectionalSyncEngine: BidirectionalSyncEngine;
  connectionRepository?: IntegrationConnectionRepository;
  integrationRepository?: IntegrationRepository;
  adapterManagerService?: AdapterManagerService;
  retryConfig?: RetryConfig;
  batchConfig?: BatchConfig;
}

/**
 * Sync Task Service
 * 
 * Manages sync tasks and executes synchronization with:
 * - Integration adapter support (fetch data from external systems)
 * - Multi-shard output support (one record → multiple shards)
 * - Intelligent deduplication (prevent duplicates)
 * - Bidirectional sync with conflict resolution
 * - Batch processing with pagination
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 */
export class SyncTaskService {
  private monitoring: IMonitoringProvider;
  private redis?: Redis;
  private taskRepository: SyncTaskRepository;
  private executionRepository: SyncExecutionRepository;
  private conflictRepository: SyncConflictRepository;
  private schemaRepository: ConversionSchemaRepository;
  private schemaService: ConversionSchemaService;
  private shardRepository: ShardRepository;
  private adapterRegistry: IntegrationAdapterRegistry;
  private shardService: IntegrationShardService;
  private deduplicationService: IntegrationDeduplicationService;
  private bidirectionalSyncEngine: BidirectionalSyncEngine;
  private connectionRepository?: IntegrationConnectionRepository;
  private integrationRepository?: IntegrationRepository;
  private adapterManagerService?: AdapterManagerService;

  // Running executions (to prevent duplicate runs)
  private runningTasks = new Set<string>();

  // Configuration
  private retryConfig: RetryConfig;
  private batchConfig: BatchConfig;

  constructor(options: SyncTaskServiceOptions) {
    this.monitoring = options.monitoring;
    this.redis = options.redis;
    this.taskRepository = options.syncTaskRepository;
    this.executionRepository = options.syncExecutionRepository;
    this.conflictRepository = options.syncConflictRepository;
    this.schemaRepository = options.conversionSchemaRepository;
    this.schemaService = options.conversionSchemaService;
    this.shardRepository = options.shardRepository;
    this.adapterRegistry = options.adapterRegistry;
    this.shardService = options.shardService;
    this.deduplicationService = options.deduplicationService;
    this.bidirectionalSyncEngine = options.bidirectionalSyncEngine;
    this.connectionRepository = options.connectionRepository;
    this.integrationRepository = options.integrationRepository;
    this.adapterManagerService = options.adapterManagerService;

    // Default configurations
    this.retryConfig = options.retryConfig || {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };

    this.batchConfig = options.batchConfig || {
      batchSize: 100,
      delayBetweenBatchesMs: 500,
    };
  }

  // =====================
  // Task CRUD
  // =====================

  async createTask(input: CreateSyncTaskInput): Promise<SyncTask> {
    // Validate conversion schema exists
    const schema = await this.schemaRepository.findById(
      input.conversionSchemaId,
      input.tenantId
    );
    if (!schema) {
      throw new Error('Conversion schema not found');
    }

    const task = await this.taskRepository.create(input);

    this.monitoring.trackEvent('syncTask.created', {
      taskId: task.id,
      tenantId: task.tenantId,
      direction: task.direction,
      scheduleType: task.schedule.type,
    });

    return task;
  }

  async updateTask(
    id: string,
    tenantId: string,
    input: UpdateSyncTaskInput
  ): Promise<SyncTask | null> {
    if (input.conversionSchemaId) {
      const schema = await this.schemaRepository.findById(
        input.conversionSchemaId,
        tenantId
      );
      if (!schema) {
        throw new Error('Conversion schema not found');
      }
    }

    const task = await this.taskRepository.update(id, tenantId, input);

    if (task) {
      this.monitoring.trackEvent('syncTask.updated', {
        taskId: task.id,
        tenantId: task.tenantId,
      });
    }

    return task;
  }

  async deleteTask(id: string, tenantId: string): Promise<boolean> {
    const deleted = await this.taskRepository.delete(id, tenantId);

    if (deleted) {
      this.monitoring.trackEvent('syncTask.deleted', {
        taskId: id,
        tenantId,
      });
    }

    return deleted;
  }

  async getTask(id: string, tenantId: string): Promise<SyncTask | null> {
    return this.taskRepository.findById(id, tenantId);
  }

  async listTasks(options: SyncTaskListOptions): Promise<SyncTaskListResult> {
    return this.taskRepository.list(options);
  }

  // =====================
  // Task Actions
  // =====================

  async pauseTask(id: string, tenantId: string): Promise<SyncTask | null> {
    return this.taskRepository.update(id, tenantId, { status: 'paused' });
  }

  async resumeTask(id: string, tenantId: string): Promise<SyncTask | null> {
    return this.taskRepository.update(id, tenantId, { status: 'active' });
  }

  async disableTask(id: string, tenantId: string): Promise<SyncTask | null> {
    return this.taskRepository.update(id, tenantId, { status: 'disabled' });
  }

  // =====================
  // Execution
  // =====================

  /**
   * Manually trigger a sync task
   */
  async triggerSync(
    taskId: string,
    tenantId: string,
    userId: string
  ): Promise<SyncExecution> {
    const task = await this.taskRepository.findById(taskId, tenantId);
    if (!task) {
      throw new Error('Sync task not found');
    }

    if (task.status === 'disabled') {
      throw new Error('Sync task is disabled');
    }

    // Check if already running
    const runningKey = `${tenantId}:${taskId}`;
    if (this.runningTasks.has(runningKey)) {
      throw new Error('Sync task is already running');
    }

    // Create execution
    // Determine trigger type based on userId
    // 'system' indicates webhook-triggered, otherwise it's manual
    const triggeredBy: 'manual' | 'webhook' = userId === 'system' ? 'webhook' : 'manual';
    
    const execution = await this.executionRepository.create({
      syncTaskId: taskId,
      tenantIntegrationId: task.tenantIntegrationId,
      tenantId: task.tenantId,
      triggeredBy,
      triggeredByUserId: userId === 'system' ? undefined : userId,
    });

    // Start async execution
    this.executeSync(task, execution).catch(error => {
      this.monitoring.trackException(error, {
        operation: 'syncTask.execute',
        taskId,
        executionId: execution.id,
      });
    });

    return execution;
  }

  /**
   * Execute sync task with full pipeline
   * 
   * Pipeline:
   * 1. Fetch data from integration adapter
   * 2. Batch process records (paginate if needed)
   * 3. Apply conversion schema transformations
   * 4. Check for duplicates via deduplication service
   * 5. Create/update shards via shard service
   * 6. Handle conflicts via bidirectional sync engine
   * 7. Retry failed records with exponential backoff
   */
  private async executeSync(task: SyncTask, execution: SyncExecution): Promise<void> {
    const runningKey = `${task.tenantId}:${task.id}`;
    this.runningTasks.add(runningKey);

    const startTime = Date.now();
    let lastError: Error | null = null;

    try {
      // Get conversion schema
      const schema = await this.schemaRepository.findById(
        task.conversionSchemaId,
        task.tenantId
      );

      if (!schema) {
        throw new Error('Conversion schema not found');
      }

      // Get integration connection
      const connection = await this.getIntegrationConnection(
        task.tenantIntegrationId,
        task.tenantId
      );

      if (!connection) {
        throw new Error('Integration connection not found');
      }

      // Initialize metrics
      const results: SyncResults = {
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      };

      const errors: SyncError[] = [];
      const failedRecords: Array<{ record: Record<string, any>; error: SyncError }> = [];

      // Update progress: starting
      await this.executionRepository.update(execution.id, task.tenantId, {
        progress: { phase: 'fetching', processedRecords: 0, percentage: 10 },
      });

      // Fetch data from integration adapter
      const sourceData = await this.fetchIntegrationDataWithRetry(
        task,
        connection
      );

      results.fetched = sourceData.length;

      this.monitoring.trackMetric('sync.records.fetched', sourceData.length, {
        taskId: task.id,
        integrationId: task.tenantIntegrationId,
      });

      if (sourceData.length === 0) {
        // No data to process
        await this.executionRepository.complete(
          execution.id,
          task.tenantId,
          'success',
          results
        );
        return;
      }

      // Update progress: transforming
      await this.executionRepository.update(execution.id, task.tenantId, {
        progress: {
          phase: 'transforming',
          totalRecords: sourceData.length,
          processedRecords: 0,
          percentage: 30,
        },
      });

      // Process records in batches
      const totalBatches = Math.ceil(sourceData.length / this.batchConfig.batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * this.batchConfig.batchSize;
        const batchEnd = Math.min(
          batchStart + this.batchConfig.batchSize,
          sourceData.length
        );

        const batch = sourceData.slice(batchStart, batchEnd);

        try {
          // Process batch
          const batchResults = await this.processBatch(
            batch,
            task,
            schema,
            connection,
            failedRecords,
            errors
          );

          // Accumulate results
          results.created += batchResults.created;
          results.updated += batchResults.updated;
          results.skipped += batchResults.skipped;
          results.failed += batchResults.failed;

          // Update progress
          const processedRecords = Math.min(
            batchEnd,
            sourceData.length
          );
          const percentage = Math.min(
            30 + (processedRecords / sourceData.length) * 60,
            90
          );

          await this.executionRepository.update(execution.id, task.tenantId, {
            progress: {
              phase: 'saving',
              totalRecords: sourceData.length,
              processedRecords,
              percentage,
            },
            results,
          });

          // Delay between batches to avoid overwhelming system
          if (batchIndex < totalBatches - 1) {
            await this.delay(this.batchConfig.delayBetweenBatchesMs);
          }
        } catch (batchError: any) {
          this.monitoring.trackException(batchError, {
            operation: 'syncTask.processBatch',
            taskId: task.id,
            batchIndex,
          });

          // Continue processing other batches
          errors.push({
            timestamp: new Date(),
            phase: 'saving',
            error: `Batch ${batchIndex} failed: ${batchError.message}`,
            recoverable: true,
          });
        }
      }

      // Retry failed records with exponential backoff
      if (failedRecords.length > 0) {
        await this.retryFailedRecords(
          failedRecords,
          task,
          schema,
          connection,
          results,
          errors,
          execution
        );
      }

      // Determine final status
      let finalStatus: 'success' | 'partial' | 'failed';
      if (results.failed === 0) {
        finalStatus = 'success';
      } else if (results.created > 0 || results.updated > 0) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'failed';
      }

      // Complete execution
      await this.executionRepository.complete(
        execution.id,
        task.tenantId,
        finalStatus,
        results
      );

      // Update task stats
      await this.taskRepository.updateAfterExecution(task.id, task.tenantId, {
        status: finalStatus,
        stats: {
          recordsProcessed: results.fetched,
          recordsCreated: results.created,
          recordsUpdated: results.updated,
          recordsSkipped: results.skipped,
          recordsFailed: results.failed,
        },
        error: finalStatus === 'failed' && errors.length > 0
          ? { message: errors[0].error, details: errors }
          : undefined,
      });

      this.monitoring.trackEvent('syncTask.completed', {
        taskId: task.id,
        executionId: execution.id,
        tenantId: task.tenantId,
        status: finalStatus,
        recordsProcessed: results.fetched,
        recordsCreated: results.created,
        recordsUpdated: results.updated,
        recordsFailed: results.failed,
        durationMs: Date.now() - startTime,
      });
    } catch (error: any) {
      lastError = error;

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Mark execution as failed
      const durationMs = Date.now() - startTime;
      await this.executionRepository.update(execution.id, task.tenantId, {
        status: 'failed',
        errors: [
          {
            timestamp: new Date(),
            phase: 'fetching',
            error: errorMessage,
            recoverable: true,
          },
        ],
        completedAt: new Date(),
        durationMs,
      });

      // Update task
      await this.taskRepository.updateAfterExecution(task.id, task.tenantId, {
        status: 'failed',
        stats: {
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
        },
        error: { message: errorMessage },
      });

      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'syncTask.execute',
        taskId: task.id,
        executionId: execution.id,
      });
    } finally {
      this.runningTasks.delete(runningKey);
    }
  }

  /**
   * Process a batch of records
   */
  private async processBatch(
    batch: Record<string, any>[],
    task: SyncTask,
    schema: any, // ConversionSchema
    connection: IntegrationConnection,
    failedRecords: Array<{ record: Record<string, any>; error: SyncError }>,
    errors: SyncError[]
  ): Promise<SyncResults> {
    const results: SyncResults = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    const context: TransformationContext = {
      sourceData: {},
      taskConfig: task.config,
      tenantId: task.tenantId,
      integrationId: task.tenantIntegrationId,
    };

    for (const record of batch) {
      try {
        // Transform record using conversion schema
        const transformResult = await this.schemaService.transform(
          schema,
          record,
          { ...context, sourceData: record }
        );

        if (!transformResult.success) {
          results.failed++;
          const error: SyncError = {
            timestamp: new Date(),
            phase: 'transforming',
            externalId: record[schema.deduplication?.externalIdField || 'id'],
            error: transformResult.errors.join('; '),
            recoverable: false,
          };
          errors.push(error);
          failedRecords.push({ record, error });
          continue;
        }

        const externalId = record[schema.deduplication?.externalIdField || 'id'];

        // Check for duplicates using deduplication service
        let existingShardsIds: string[] = [];
        if (schema.deduplication?.rules && schema.deduplication.rules.length > 0) {
          existingShardsIds = await this.deduplicationService.findDuplicates(
            task.tenantId,
            schema.target.shardTypeId,
            transformResult.data!,
            schema.deduplication.rules
          );
        }

        // Create shards using shard service (handles multi-shard output)
        const shardCreationResult = await this.shardService.createShardsFromIntegrationData(
          task.tenantId,
          task.tenantIntegrationId,
          [record],
          schema,
          {
            updateExisting: schema.target.updateIfExists,
            skipDuplicateCheck: !schema.target.updateIfExists,
            // Note: externalIdField is not in ShardCreationOptions
            // It's used internally by the service from schema.deduplication.externalIdField
          }
        );

        // Handle existing shards (duplicates)
        if (existingShardsIds.length > 0 && schema.target.updateIfExists) {
          // Merge duplicates
          const masterShardId = await this.deduplicationService.mergeDuplicates(
            task.tenantId,
            existingShardsIds,
            schema.deduplication?.mergeStrategy || 'merge_fields'
          );

          // Handle bidirectional sync conflicts if applicable
          if (schema.bidirectionalSync?.enabled && existingShardsIds.includes(masterShardId)) {
            const existingShard = await this.shardRepository.findById(
              masterShardId,
              task.tenantId
            );

            if (existingShard) {
              const conflict = await this.bidirectionalSyncEngine.detectConflicts(
                existingShard,
                transformResult.data!,
                schema.fieldMappings,
                schema.bidirectionalSync
              );

              if (conflict) {
                // Resolve using configured strategy
                const resolution = await this.bidirectionalSyncEngine.resolveConflict(
                  conflict,
                  schema.bidirectionalSync.conflictResolution || 'merge',
                  'system'
                );

                // Update shard with resolved data
                await this.shardRepository.update(masterShardId, task.tenantId, {
                  structuredData: resolution.mergedData,
                });

                results.updated++;
              } else {
                results.updated++;
              }
            }
          } else {
            results.updated++;
          }
        } else if (schema.target.createIfMissing) {
          results.created++;
        } else {
          results.skipped++;
        }
      } catch (error: any) {
        results.failed++;
        const syncError: SyncError = {
          timestamp: new Date(),
          phase: 'saving',
          externalId: record[schema.deduplication?.externalIdField || 'id'],
          error: error.message,
          recoverable: true,
        };
        errors.push(syncError);
        failedRecords.push({ record, error: syncError });
      }
    }

    return results;
  }

  /**
   * Retry failed records with exponential backoff
   */
  private async retryFailedRecords(
    failedRecords: Array<{ record: Record<string, any>; error: SyncError }>,
    task: SyncTask,
    schema: any,
    connection: IntegrationConnection,
    results: SyncResults,
    errors: SyncError[],
    execution: SyncExecution
  ): Promise<void> {
    if (failedRecords.length === 0) {return;}

    this.monitoring.trackEvent('syncTask.retrying', {
      taskId: task.id,
      failedRecordCount: failedRecords.length,
    });

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      const recordsToRetry = failedRecords.filter(
        (fr) => (fr.error.recoverable !== false)
      );

      if (recordsToRetry.length === 0) {break;}

      // Calculate exponential backoff delay
      const delayMs = Math.min(
        this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
        this.retryConfig.maxDelayMs
      );

      // Add jitter (±20%)
      const jitter = delayMs * (0.8 + Math.random() * 0.4);
      await this.delay(jitter);

      // Retry batch
      const retryResults = await this.processBatch(
        recordsToRetry.map((fr) => fr.record),
        task,
        schema,
        connection,
        [],
        errors
      );

      // Move successful retries out of failedRecords
      failedRecords.splice(0, failedRecords.length);

      // Accumulate retry results
      results.created += retryResults.created;
      results.updated += retryResults.updated;
      results.failed += retryResults.failed;

      // Update execution progress
      await this.executionRepository.update(execution.id, task.tenantId, {
        progress: {
          phase: 'saving',
          totalRecords: results.fetched,
          processedRecords: results.fetched - failedRecords.length,
          percentage: Math.min(90, 30 + (failedRecords.length === 0 ? 60 : 30)),
        },
        results,
      });

      this.monitoring.trackEvent('syncTask.retryAttempt', {
        taskId: task.id,
        attempt,
        recordsRetried: recordsToRetry.length,
        recordsSucceeded: retryResults.created + retryResults.updated,
        recordsFailed: retryResults.failed,
      });

      // Stop retrying if no more failures
      if (failedRecords.length === 0) {break;}
    }
  }

  /**
   * Fetch data from integration with retry logic
   */
  private async fetchIntegrationDataWithRetry(
    task: SyncTask,
    connection: IntegrationConnection
  ): Promise<Record<string, any>[]> {
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await this.fetchIntegrationData(task, connection);
      } catch (error: any) {
        if (attempt === this.retryConfig.maxAttempts) {
          throw error;
        }

        const delayMs = Math.min(
          this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelayMs
        );

        this.monitoring.trackEvent('syncTask.fetchRetry', {
          taskId: task.id,
          attempt,
          delayMs,
          error: error.message,
        });

        await this.delay(delayMs);
      }
    }

    return [];
  }

  /**
   * Fetch data from integration adapter
   */
  private async fetchIntegrationData(
    task: SyncTask,
    connection: IntegrationConnection
  ): Promise<Record<string, any>[]> {
    // Get integration document
    if (!this.integrationRepository) {
      throw new Error('IntegrationRepository not available. Sync task feature requires integration repository to be configured.');
    }

    const integration = await this.integrationRepository.findById(task.tenantIntegrationId, task.tenantId);
    if (!integration) {
      throw new Error(`Integration not found: ${task.tenantIntegrationId}`);
    }

    // Get adapter instance using AdapterManagerService
    if (!this.adapterManagerService) {
      throw new Error('AdapterManagerService not available. Sync task feature requires adapter manager service to be configured.');
    }

    if (!integration.providerName) {
      throw new Error(`Integration ${task.tenantIntegrationId} does not have a providerName configured`);
    }

    const adapter = await this.adapterManagerService.getAdapter(
      integration.providerName,
      integration
    );

    // Cast to BaseIntegrationAdapter since all adapters extend it and have fetch/fetchBatch methods
    const baseAdapter = adapter as unknown as BaseIntegrationAdapter;

    // Determine fetch options based on task config
    const fetchOptions: FetchOptions = {
      entity: task.config?.entity || 'default',
      filters: task.config?.filter,
      fields: task.config?.fields,
      limit: task.config?.limit || 10000,
      offset: 0,
    };

    // Use batch fetch if available (preferred for large datasets)
    if (typeof baseAdapter.fetchBatch === 'function') {
      const batchOptions: BatchFetchOptions = {
        ...fetchOptions,
        batchSize: this.batchConfig.batchSize,
      };
      const batchResults = await baseAdapter.fetchBatch(batchOptions);
      // Flatten all batch results into a single array
      return batchResults.flatMap(result => result.records);
    }

    // Fallback to regular fetch
    const result: FetchResult = await baseAdapter.fetch(fetchOptions);
    return result.records || [];
  }

  /**
   * Get integration connection for a sync task
   */
  private async getIntegrationConnection(
    integrationId: string,
    tenantId: string
  ): Promise<IntegrationConnection | null> {
    if (!this.connectionRepository) {
      this.monitoring.trackException(
        new Error('IntegrationConnectionRepository not available'),
        {
          operation: 'sync-task.getIntegrationConnection',
          integrationId,
          tenantId,
        }
      );
      return null;
    }

    try {
      // Try tenant-scoped connection first
      let connection = await this.connectionRepository.findByIntegration(
        integrationId,
        'tenant',
        tenantId
      );

      // If no tenant connection, try system-scoped
      if (!connection) {
        connection = await this.connectionRepository.findByIntegration(
          integrationId,
          'system'
        );
      }

      if (connection) {
        this.monitoring.trackEvent('sync-task.connection-found', {
          integrationId,
          tenantId,
          connectionId: connection.id,
          scope: connection.scope,
        });
      } else {
        this.monitoring.trackEvent('sync-task.connection-not-found', {
          integrationId,
          tenantId,
        });
      }

      return connection;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'sync-task.getIntegrationConnection',
        integrationId,
        tenantId,
      });
      return null;
    }
  }

  /**
   * Utility: delay for exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // =====================
  // Executions
  // =====================

  async getExecution(
    id: string,
    tenantId: string
  ): Promise<SyncExecution | null> {
    return this.executionRepository.findById(id, tenantId);
  }

  async listExecutions(
    options: SyncExecutionListOptions
  ): Promise<SyncExecutionListResult> {
    return this.executionRepository.list(options);
  }

  async cancelExecution(id: string, tenantId: string): Promise<SyncExecution | null> {
    const execution = await this.executionRepository.findById(id, tenantId);
    if (!execution || execution.status !== 'running') {
      return null;
    }

    return this.executionRepository.update(id, tenantId, {
      status: 'cancelled',
      completedAt: new Date(),
    });
  }

  async retryExecution(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<SyncExecution> {
    const originalExecution = await this.executionRepository.findById(id, tenantId);
    if (!originalExecution) {
      throw new Error('Execution not found');
    }

    if (originalExecution.status !== 'failed' && originalExecution.status !== 'partial') {
      throw new Error('Can only retry failed or partial executions');
    }

    const task = await this.taskRepository.findById(
      originalExecution.syncTaskId,
      tenantId
    );
    if (!task) {
      throw new Error('Sync task not found');
    }

    // Create new execution as retry
    const execution = await this.executionRepository.create({
      syncTaskId: originalExecution.syncTaskId,
      tenantIntegrationId: originalExecution.tenantIntegrationId,
      tenantId,
      triggeredBy: 'retry',
      triggeredByUserId: userId,
      retryOf: id,
    });

    // Start async execution
    this.executeSync(task, execution).catch(error => {
      this.monitoring.trackException(error, {
        operation: 'syncTask.retry',
        originalExecutionId: id,
        executionId: execution.id,
      });
    });

    return execution;
  }

  // =====================
  // Conflicts
  // =====================

  async listConflicts(tenantId: string, limit?: number): Promise<SyncConflict[]> {
    return this.conflictRepository.listPending(tenantId, limit);
  }

  async getConflict(id: string, tenantId: string): Promise<SyncConflict | null> {
    return this.conflictRepository.findById(id, tenantId);
  }

  async resolveConflict(
    id: string,
    tenantId: string,
    input: ResolveConflictInput
  ): Promise<SyncConflict | null> {
    return this.conflictRepository.resolve(id, tenantId, input);
  }

  // =====================
  // Scheduler
  // =====================

  /**
   * Process due sync tasks (called by scheduler)
   */
  async processDueTasks(): Promise<void> {
    const dueTasks = await this.taskRepository.findDueTasks(10);

    for (const task of dueTasks) {
      if (this.runningTasks.has(`${task.tenantId}:${task.id}`)) {
        continue;
      }

      try {
        const execution = await this.executionRepository.create({
          syncTaskId: task.id,
          tenantIntegrationId: task.tenantIntegrationId,
          tenantId: task.tenantId,
          triggeredBy: 'schedule',
        });

        this.executeSync(task, execution).catch(error => {
          this.monitoring.trackException(error, {
            operation: 'syncTask.scheduled',
            taskId: task.id,
          });
        });
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'syncTask.processDue',
          taskId: task.id,
        });
      }
    }
  }

  /**
   * Start scheduled task processor
   */
  startScheduler(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.processDueTasks().catch(error => {
        this.monitoring.trackException(error, {
          operation: 'syncTask.scheduler',
        });
      });
    }, intervalMs);
  }
}







