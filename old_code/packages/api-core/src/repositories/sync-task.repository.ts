import { Container, CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import {
  SyncTask,
  CreateSyncTaskInput,
  UpdateSyncTaskInput,
  SyncTaskListOptions,
  SyncTaskListResult,
  SyncTaskStats,
  SyncExecution,
  CreateSyncExecutionInput,
  UpdateSyncExecutionInput,
  SyncExecutionListOptions,
  SyncExecutionListResult,
  SyncConflict,
  ResolveConflictInput,
} from '../types/sync-task.types.js';

/**
 * Sync Task Repository
 * Manages sync task definitions
 */
export class SyncTaskRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string) {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Ensure container exists
   */
  static async ensureContainer(
    client: CosmosClient,
    databaseId: string,
    containerId: string
  ): Promise<Container> {
    const database = client.database(databaseId);
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/tenantId'] },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/"_etag"/?' }],
        compositeIndexes: [
          [
            { path: '/tenantId', order: 'ascending' },
            { path: '/status', order: 'ascending' },
            { path: '/nextRunAt', order: 'ascending' },
          ],
        ],
      },
    });
    return container;
  }

  /**
   * Create sync task
   */
  async create(input: CreateSyncTaskInput): Promise<SyncTask> {
    const now = new Date();
    const defaultStats: SyncTaskStats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
    };

    const task: SyncTask = {
      id: uuidv4(),
      tenantIntegrationId: input.tenantIntegrationId,
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      conversionSchemaId: input.conversionSchemaId,
      direction: input.direction,
      schedule: input.schedule,
      config: input.config || {},
      conflictResolution: input.conflictResolution,
      status: 'active',
      stats: defaultStats,
      retryConfig: {
        maxRetries: input.retryConfig?.maxRetries ?? 3,
        retryDelaySeconds: input.retryConfig?.retryDelaySeconds ?? 300,
        exponentialBackoff: input.retryConfig?.exponentialBackoff ?? true,
      },
      notifications: {
        onSuccess: input.notifications?.onSuccess ?? false,
        onFailure: input.notifications?.onFailure ?? true,
        onPartial: input.notifications?.onPartial ?? true,
        recipients: input.notifications?.recipients ?? [],
      },
      nextRunAt: this.calculateNextRun(input.schedule),
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(task);
    return resource as SyncTask;
  }

  /**
   * Update sync task
   */
  async update(
    id: string,
    tenantId: string,
    input: UpdateSyncTaskInput
  ): Promise<SyncTask | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {return null;}

    const updated: SyncTask = {
      ...existing,
      ...input,
      retryConfig: input.retryConfig
        ? { ...existing.retryConfig, ...input.retryConfig }
        : existing.retryConfig,
      notifications: input.notifications
        ? { ...existing.notifications, ...input.notifications }
        : existing.notifications,
      nextRunAt: input.schedule
        ? this.calculateNextRun(input.schedule)
        : existing.nextRunAt,
      updatedAt: new Date(),
    };

    const { resource } = await this.container
      .item(id, tenantId)
      .replace(updated);
    return resource as SyncTask;
  }

  /**
   * Delete sync task
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.container.item(id, tenantId).delete();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string, tenantId: string): Promise<SyncTask | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read<SyncTask>();
      return resource || null;
    } catch {
      return null;
    }
  }

  /**
   * List sync tasks
   */
  async list(options: SyncTaskListOptions): Promise<SyncTaskListResult> {
    const { filter, limit = 50, offset = 0 } = options;

    const conditions: string[] = ['c.tenantId = @tenantId'];
    const parameters: { name: string; value: any }[] = [
      { name: '@tenantId', value: filter.tenantId },
    ];

    if (filter.tenantIntegrationId) {
      conditions.push('c.tenantIntegrationId = @tenantIntegrationId');
      parameters.push({ name: '@tenantIntegrationId', value: filter.tenantIntegrationId });
    }

    if (filter.status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: filter.status });
    }

    if (filter.direction) {
      conditions.push('c.direction = @direction');
      parameters.push({ name: '@direction', value: filter.direction });
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count query
    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
      parameters,
    };
    const { resources: countResult } = await this.container.items.query<number>(countQuery).fetchAll();
    const total = countResult[0] || 0;

    // Data query
    const dataQuery: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.name OFFSET ${offset} LIMIT ${limit}`,
      parameters,
    };
    const { resources } = await this.container.items.query<SyncTask>(dataQuery).fetchAll();

    return {
      tasks: resources,
      total,
      hasMore: offset + resources.length < total,
    };
  }

  /**
   * Find tasks due for execution
   */
  async findDueTasks(limit: number = 100): Promise<SyncTask[]> {
    const now = new Date().toISOString();
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE c.status = 'active' 
              AND c.nextRunAt <= @now 
              ORDER BY c.nextRunAt ASC`,
      parameters: [{ name: '@now', value: now }],
    };

    const { resources } = await this.container.items
      .query<SyncTask>(query, { maxItemCount: limit })
      .fetchAll();
    return resources;
  }

  /**
   * Update task after execution
   */
  async updateAfterExecution(
    id: string,
    tenantId: string,
    results: {
      status: 'success' | 'partial' | 'failed';
      stats: Partial<SyncTaskStats>;
      error?: { message: string; details?: any };
    }
  ): Promise<SyncTask | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {return null;}

    const now = new Date();
    const updatedStats: SyncTaskStats = {
      ...existing.stats,
      totalRuns: existing.stats.totalRuns + 1,
      successfulRuns: results.status === 'success'
        ? existing.stats.successfulRuns + 1
        : existing.stats.successfulRuns,
      failedRuns: results.status === 'failed'
        ? existing.stats.failedRuns + 1
        : existing.stats.failedRuns,
      recordsProcessed: existing.stats.recordsProcessed + (results.stats.recordsProcessed || 0),
      recordsCreated: existing.stats.recordsCreated + (results.stats.recordsCreated || 0),
      recordsUpdated: existing.stats.recordsUpdated + (results.stats.recordsUpdated || 0),
      recordsSkipped: existing.stats.recordsSkipped + (results.stats.recordsSkipped || 0),
      recordsFailed: existing.stats.recordsFailed + (results.stats.recordsFailed || 0),
      lastSuccessAt: results.status === 'success' ? now : existing.stats.lastSuccessAt,
      lastFailureAt: results.status === 'failed' ? now : existing.stats.lastFailureAt,
    };

    const updated: SyncTask = {
      ...existing,
      lastRunAt: now,
      lastRunStatus: results.status,
      nextRunAt: this.calculateNextRun(existing.schedule, now),
      stats: updatedStats,
      lastError: results.error
        ? { message: results.error.message, timestamp: now, details: results.error.details }
        : undefined,
      status: results.status === 'failed' && existing.stats.failedRuns >= 3 ? 'error' : existing.status,
      updatedAt: now,
    };

    const { resource } = await this.container
      .item(id, tenantId)
      .replace(updated);
    return resource as SyncTask;
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(
    schedule: SyncTask['schedule'],
    fromDate: Date = new Date()
  ): Date | undefined {
    if (schedule.type === 'manual') {
      return undefined;
    }

    if (schedule.type === 'realtime') {
      return undefined;
    }

    if (schedule.config.type === 'interval') {
      const { interval, unit } = schedule.config;
      const next = new Date(fromDate);

      switch (unit) {
        case 'minutes':
          next.setMinutes(next.getMinutes() + interval);
          break;
        case 'hours':
          next.setHours(next.getHours() + interval);
          break;
        case 'days':
          next.setDate(next.getDate() + interval);
          break;
        case 'weeks':
          next.setDate(next.getDate() + interval * 7);
          break;
      }

      return next;
    }

    if (schedule.config.type === 'cron') {
      // Simple cron parsing - in production, use a proper cron library
      // For now, default to next day at same time
      const next = new Date(fromDate);
      next.setDate(next.getDate() + 1);
      return next;
    }

    return undefined;
  }
}

/**
 * Sync Execution Repository
 * Manages sync execution history
 */
export class SyncExecutionRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string) {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Ensure container exists
   */
  static async ensureContainer(
    client: CosmosClient,
    databaseId: string,
    containerId: string
  ): Promise<Container> {
    const database = client.database(databaseId);
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/tenantId'] },
      defaultTtl: 90 * 24 * 60 * 60, // 90 days TTL
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/"_etag"/?' }],
        compositeIndexes: [
          [
            { path: '/tenantId', order: 'ascending' },
            { path: '/syncTaskId', order: 'ascending' },
            { path: '/startedAt', order: 'descending' },
          ],
        ],
      },
    });
    return container;
  }

  /**
   * Create sync execution
   */
  async create(input: CreateSyncExecutionInput): Promise<SyncExecution> {
    const now = new Date();
    const execution: SyncExecution = {
      id: uuidv4(),
      syncTaskId: input.syncTaskId,
      tenantIntegrationId: input.tenantIntegrationId,
      tenantId: input.tenantId,
      startedAt: now,
      triggeredBy: input.triggeredBy,
      triggeredByUserId: input.triggeredByUserId,
      status: 'running',
      progress: {
        phase: 'initializing',
        processedRecords: 0,
        percentage: 0,
      },
      results: {
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      errors: [],
      retryCount: input.retryOf ? 1 : 0,
      retryOf: input.retryOf,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(execution);
    return resource as SyncExecution;
  }

  /**
   * Update sync execution
   */
  async update(
    id: string,
    tenantId: string,
    input: UpdateSyncExecutionInput
  ): Promise<SyncExecution | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {return null;}

    const updated: SyncExecution = {
      ...existing,
      ...input,
      progress: input.progress
        ? { ...existing.progress, ...input.progress }
        : existing.progress,
      results: input.results
        ? { ...existing.results, ...input.results }
        : existing.results,
      errors: input.errors
        ? [...existing.errors, ...input.errors]
        : existing.errors,
      updatedAt: new Date(),
    };

    const { resource } = await this.container
      .item(id, tenantId)
      .replace(updated);
    return resource as SyncExecution;
  }

  /**
   * Find by ID
   */
  async findById(id: string, tenantId: string): Promise<SyncExecution | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read<SyncExecution>();
      return resource || null;
    } catch {
      return null;
    }
  }

  /**
   * List sync executions
   */
  async list(options: SyncExecutionListOptions): Promise<SyncExecutionListResult> {
    const { filter, limit = 50, offset = 0 } = options;

    const conditions: string[] = ['c.tenantId = @tenantId'];
    const parameters: { name: string; value: any }[] = [
      { name: '@tenantId', value: filter.tenantId },
    ];

    if (filter.syncTaskId) {
      conditions.push('c.syncTaskId = @syncTaskId');
      parameters.push({ name: '@syncTaskId', value: filter.syncTaskId });
    }

    if (filter.tenantIntegrationId) {
      conditions.push('c.tenantIntegrationId = @tenantIntegrationId');
      parameters.push({ name: '@tenantIntegrationId', value: filter.tenantIntegrationId });
    }

    if (filter.status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: filter.status });
    }

    if (filter.triggeredBy) {
      conditions.push('c.triggeredBy = @triggeredBy');
      parameters.push({ name: '@triggeredBy', value: filter.triggeredBy });
    }

    if (filter.startedAfter) {
      conditions.push('c.startedAt >= @startedAfter');
      parameters.push({ name: '@startedAfter', value: filter.startedAfter.toISOString() });
    }

    if (filter.startedBefore) {
      conditions.push('c.startedAt <= @startedBefore');
      parameters.push({ name: '@startedBefore', value: filter.startedBefore.toISOString() });
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count query
    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
      parameters,
    };
    const { resources: countResult } = await this.container.items.query<number>(countQuery).fetchAll();
    const total = countResult[0] || 0;

    // Data query
    const dataQuery: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.startedAt DESC OFFSET ${offset} LIMIT ${limit}`,
      parameters,
    };
    const { resources } = await this.container.items.query<SyncExecution>(dataQuery).fetchAll();

    return {
      executions: resources,
      total,
      hasMore: offset + resources.length < total,
    };
  }

  /**
   * Find running executions for a task
   */
  async findRunningByTask(syncTaskId: string, tenantId: string): Promise<SyncExecution[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE c.tenantId = @tenantId 
              AND c.syncTaskId = @syncTaskId 
              AND c.status = 'running'`,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@syncTaskId', value: syncTaskId },
      ],
    };

    const { resources } = await this.container.items.query<SyncExecution>(query).fetchAll();
    return resources;
  }

  /**
   * Mark execution as complete
   */
  async complete(
    id: string,
    tenantId: string,
    status: 'success' | 'partial' | 'failed',
    results: SyncExecution['results']
  ): Promise<SyncExecution | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {return null;}

    const now = new Date();
    return this.update(id, tenantId, {
      status,
      results,
      progress: { phase: 'complete', processedRecords: results.fetched, percentage: 100 },
      completedAt: now,
      durationMs: now.getTime() - existing.startedAt.getTime(),
    });
  }
}

/**
 * Sync Conflict Repository
 * Manages bidirectional sync conflicts
 */
export class SyncConflictRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string) {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Ensure container exists
   */
  static async ensureContainer(
    client: CosmosClient,
    databaseId: string,
    containerId: string
  ): Promise<Container> {
    const database = client.database(databaseId);
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/tenantId'] },
      defaultTtl: 30 * 24 * 60 * 60, // 30 days TTL
    });
    return container;
  }

  /**
   * Create conflict
   */
  async create(conflict: Omit<SyncConflict, 'id' | 'createdAt' | 'updatedAt'>): Promise<SyncConflict> {
    const now = new Date();
    const newConflict: SyncConflict = {
      ...conflict,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(newConflict);
    return resource as SyncConflict;
  }

  /**
   * Find by ID
   */
  async findById(id: string, tenantId: string): Promise<SyncConflict | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read<SyncConflict>();
      return resource || null;
    } catch {
      return null;
    }
  }

  /**
   * List pending conflicts
   */
  async listPending(tenantId: string, limit: number = 50): Promise<SyncConflict[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE c.tenantId = @tenantId 
              AND c.status = 'pending' 
              ORDER BY c.createdAt DESC`,
      parameters: [{ name: '@tenantId', value: tenantId }],
    };

    const { resources } = await this.container.items
      .query<SyncConflict>(query, { maxItemCount: limit })
      .fetchAll();
    return resources;
  }

  /**
   * Resolve conflict
   */
  async resolve(
    id: string,
    tenantId: string,
    input: ResolveConflictInput
  ): Promise<SyncConflict | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {return null;}

    const now = new Date();
    const updated: SyncConflict = {
      ...existing,
      status: 'resolved',
      resolution: {
        strategy: input.strategy,
        resolvedBy: input.resolvedBy,
        resolvedAt: now,
        finalData: input.finalData || {},
      },
      updatedAt: now,
    };

    const { resource } = await this.container
      .item(id, tenantId)
      .replace(updated);
    return resource as SyncConflict;
  }
}











