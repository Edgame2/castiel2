import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { SyncTaskRepository, SyncExecutionRepository, SyncConflictRepository } from '../repositories/sync-task.repository.js';
import { ConversionSchemaRepository } from '../repositories/conversion-schema.repository.js';
import { ConversionSchemaService } from './conversion-schema.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { IntegrationAdapterRegistry } from '../integrations/base-adapter.js';
import { IntegrationShardService } from './integration-shard.service.js';
import { IntegrationDeduplicationService } from './integration-deduplication.service.js';
import { BidirectionalSyncEngine } from './bidirectional-sync.service.js';
import { SyncTask, CreateSyncTaskInput, UpdateSyncTaskInput, SyncTaskListOptions, SyncTaskListResult, SyncExecution, SyncExecutionListOptions, SyncExecutionListResult, SyncConflict, ResolveConflictInput } from '../types/sync-task.types.js';
import { IntegrationConnectionRepository } from '../repositories/integration.repository.js';
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
export declare class SyncTaskService {
    private monitoring;
    private redis?;
    private taskRepository;
    private executionRepository;
    private conflictRepository;
    private schemaRepository;
    private schemaService;
    private shardRepository;
    private adapterRegistry;
    private shardService;
    private deduplicationService;
    private bidirectionalSyncEngine;
    private connectionRepository?;
    private runningTasks;
    private retryConfig;
    private batchConfig;
    constructor(options: SyncTaskServiceOptions);
    createTask(input: CreateSyncTaskInput): Promise<SyncTask>;
    updateTask(id: string, tenantId: string, input: UpdateSyncTaskInput): Promise<SyncTask | null>;
    deleteTask(id: string, tenantId: string): Promise<boolean>;
    getTask(id: string, tenantId: string): Promise<SyncTask | null>;
    listTasks(options: SyncTaskListOptions): Promise<SyncTaskListResult>;
    pauseTask(id: string, tenantId: string): Promise<SyncTask | null>;
    resumeTask(id: string, tenantId: string): Promise<SyncTask | null>;
    disableTask(id: string, tenantId: string): Promise<SyncTask | null>;
    /**
     * Manually trigger a sync task
     */
    triggerSync(taskId: string, tenantId: string, userId: string): Promise<SyncExecution>;
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
    private executeSync;
    /**
     * Process a batch of records
     */
    private processBatch;
    /**
     * Retry failed records with exponential backoff
     */
    private retryFailedRecords;
    /**
     * Fetch data from integration with retry logic
     */
    private fetchIntegrationDataWithRetry;
    /**
     * Fetch data from integration adapter
     */
    private fetchIntegrationData;
    /**
     * Get integration connection for a sync task
     */
    private getIntegrationConnection;
    /**
     * Utility: delay for exponential backoff
     */
    private delay;
    getExecution(id: string, tenantId: string): Promise<SyncExecution | null>;
    listExecutions(options: SyncExecutionListOptions): Promise<SyncExecutionListResult>;
    cancelExecution(id: string, tenantId: string): Promise<SyncExecution | null>;
    retryExecution(id: string, tenantId: string, userId: string): Promise<SyncExecution>;
    listConflicts(tenantId: string, limit?: number): Promise<SyncConflict[]>;
    getConflict(id: string, tenantId: string): Promise<SyncConflict | null>;
    resolveConflict(id: string, tenantId: string, input: ResolveConflictInput): Promise<SyncConflict | null>;
    /**
     * Process due sync tasks (called by scheduler)
     */
    processDueTasks(): Promise<void>;
    /**
     * Start scheduled task processor
     */
    startScheduler(intervalMs?: number): NodeJS.Timeout;
}
export {};
//# sourceMappingURL=sync-task.service.d.ts.map