import { Container, CosmosClient } from '@azure/cosmos';
import { SyncTask, CreateSyncTaskInput, UpdateSyncTaskInput, SyncTaskListOptions, SyncTaskListResult, SyncTaskStats, SyncExecution, CreateSyncExecutionInput, UpdateSyncExecutionInput, SyncExecutionListOptions, SyncExecutionListResult, SyncConflict, ResolveConflictInput } from '../types/sync-task.types.js';
/**
 * Sync Task Repository
 * Manages sync task definitions
 */
export declare class SyncTaskRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId: string);
    /**
     * Ensure container exists
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId: string): Promise<Container>;
    /**
     * Create sync task
     */
    create(input: CreateSyncTaskInput): Promise<SyncTask>;
    /**
     * Update sync task
     */
    update(id: string, tenantId: string, input: UpdateSyncTaskInput): Promise<SyncTask | null>;
    /**
     * Delete sync task
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Find by ID
     */
    findById(id: string, tenantId: string): Promise<SyncTask | null>;
    /**
     * List sync tasks
     */
    list(options: SyncTaskListOptions): Promise<SyncTaskListResult>;
    /**
     * Find tasks due for execution
     */
    findDueTasks(limit?: number): Promise<SyncTask[]>;
    /**
     * Update task after execution
     */
    updateAfterExecution(id: string, tenantId: string, results: {
        status: 'success' | 'partial' | 'failed';
        stats: Partial<SyncTaskStats>;
        error?: {
            message: string;
            details?: any;
        };
    }): Promise<SyncTask | null>;
    /**
     * Calculate next run time based on schedule
     */
    private calculateNextRun;
}
/**
 * Sync Execution Repository
 * Manages sync execution history
 */
export declare class SyncExecutionRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId: string);
    /**
     * Ensure container exists
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId: string): Promise<Container>;
    /**
     * Create sync execution
     */
    create(input: CreateSyncExecutionInput): Promise<SyncExecution>;
    /**
     * Update sync execution
     */
    update(id: string, tenantId: string, input: UpdateSyncExecutionInput): Promise<SyncExecution | null>;
    /**
     * Find by ID
     */
    findById(id: string, tenantId: string): Promise<SyncExecution | null>;
    /**
     * List sync executions
     */
    list(options: SyncExecutionListOptions): Promise<SyncExecutionListResult>;
    /**
     * Find running executions for a task
     */
    findRunningByTask(syncTaskId: string, tenantId: string): Promise<SyncExecution[]>;
    /**
     * Mark execution as complete
     */
    complete(id: string, tenantId: string, status: 'success' | 'partial' | 'failed', results: SyncExecution['results']): Promise<SyncExecution | null>;
}
/**
 * Sync Conflict Repository
 * Manages bidirectional sync conflicts
 */
export declare class SyncConflictRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId: string);
    /**
     * Ensure container exists
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId: string): Promise<Container>;
    /**
     * Create conflict
     */
    create(conflict: Omit<SyncConflict, 'id' | 'createdAt' | 'updatedAt'>): Promise<SyncConflict>;
    /**
     * Find by ID
     */
    findById(id: string, tenantId: string): Promise<SyncConflict | null>;
    /**
     * List pending conflicts
     */
    listPending(tenantId: string, limit?: number): Promise<SyncConflict[]>;
    /**
     * Resolve conflict
     */
    resolve(id: string, tenantId: string, input: ResolveConflictInput): Promise<SyncConflict | null>;
}
//# sourceMappingURL=sync-task.repository.d.ts.map