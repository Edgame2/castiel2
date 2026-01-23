/**
 * Generation Job Repository
 * 
 * Manages generation job status in Cosmos DB
 */

import { CosmosClient, Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { GenerationJob, GenerationJobStatus } from '../types/content-generation/generation.types.js';

export class GenerationJobRepository {
  private client: CosmosClient;
  private container: Container;
  private databaseId: string;
  private monitoring?: IMonitoringProvider;

  constructor(
    cosmosClient: CosmosClient,
    databaseId: string,
    containerId: string = 'generation-jobs',
    monitoring?: IMonitoringProvider
  ) {
    this.monitoring = monitoring;
    this.client = cosmosClient;
    this.databaseId = databaseId;
    const database = this.client.database(databaseId);
    
    // Ensure container exists
    database.containers.createIfNotExists({
      id: containerId,
      partitionKey: '/tenantId',
      defaultTtl: -1,
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent' as any,
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/_etag/?' }],
        compositeIndexes: [
          [
            { path: '/tenantId', order: 'ascending' as any },
            { path: '/status', order: 'ascending' as any },
            { path: '/createdAt', order: 'descending' as any },
          ],
          [
            { path: '/tenantId', order: 'ascending' as any },
            { path: '/userId', order: 'ascending' as any },
            { path: '/createdAt', order: 'descending' as any },
          ],
        ],
      } as any,
      throughput: 400,
    }).catch((error) => {
      this.monitoring?.trackException(error as Error, { operation: 'generationJobRepository.containerInit' });
      return undefined;
    });

    this.container = database.container(containerId);
  }

  /**
   * Health check - verify Cosmos DB connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to read the database to verify connectivity
      const database = this.client.database(this.databaseId);
      await database.read();
      return true;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'generation-job.repository.health-check' });
      return false;
    }
  }

  /**
   * Create a new generation job
   */
  async create(job: GenerationJob): Promise<GenerationJob> {
    const { resource } = await this.container.items.create(job);
    return resource as GenerationJob;
  }

  /**
   * Update job status and metadata
   */
  async update(
    jobId: string,
    tenantId: string,
    updates: Partial<GenerationJob>
  ): Promise<GenerationJob> {
    const { resource: existing } = await this.container.item(jobId, tenantId).read<GenerationJob>();
    if (!existing) {
      throw new Error(`GenerationJob ${jobId} not found`);
    }
    
    const merged: GenerationJob = {
      ...existing,
      ...updates,
    };
    
    const { resource } = await this.container.item(jobId, tenantId).replace(merged);
    return resource as GenerationJob;
  }

  /**
   * Find job by ID
   */
  async findById(jobId: string, tenantId: string): Promise<GenerationJob | null> {
    try {
      const { resource } = await this.container.item(jobId, tenantId).read<GenerationJob>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a generation job
   */
  async delete(jobId: string, tenantId: string): Promise<void> {
    try {
      await this.container.item(jobId, tenantId).delete();
    } catch (error: any) {
      // If job doesn't exist, that's okay - it's already deleted
      if (error.code === 404) {
        return;
      }
      throw error;
    }
  }

  /**
   * Find jobs by status
   */
  async findByStatus(
    status: GenerationJobStatus,
    tenantId: string
  ): Promise<GenerationJob[]> {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@status', value: status },
      ],
    };
    const { resources } = await this.container.items.query(querySpec).fetchAll();
    return resources as GenerationJob[];
  }

  /**
   * List jobs with filters
   */
  async list(
    tenantId: string,
    options?: {
      status?: GenerationJobStatus;
      userId?: string;
      templateId?: string;
      limit?: number;
      offset?: number;
      createdAfter?: Date;
      createdBefore?: Date;
    }
  ): Promise<{ jobs: GenerationJob[]; total: number }> {
    const conditions: string[] = ['c.tenantId = @tenantId'];
    const parameters: Array<{ name: string; value: any }> = [
      { name: '@tenantId', value: tenantId },
    ];

    if (options?.status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: options.status });
    }

    if (options?.userId) {
      conditions.push('c.userId = @userId');
      parameters.push({ name: '@userId', value: options.userId });
    }

    if (options?.templateId) {
      conditions.push('c.templateId = @templateId');
      parameters.push({ name: '@templateId', value: options.templateId });
    }

    if (options?.createdAfter) {
      conditions.push('c.createdAt >= @createdAfter');
      parameters.push({ name: '@createdAfter', value: options.createdAfter.toISOString() });
    }

    if (options?.createdBefore) {
      conditions.push('c.createdAt <= @createdBefore');
      parameters.push({ name: '@createdBefore', value: options.createdBefore.toISOString() });
    }

    const whereClause = conditions.join(' AND ');
    const querySpec = {
      query: `SELECT * FROM c WHERE ${whereClause} ORDER BY c.createdAt DESC`,
      parameters,
    };

    const { resources } = await this.container.items.query(querySpec).fetchAll();

    // Get total count
    const countQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
      parameters,
    };
    const { resources: countResources } = await this.container.items.query(countQuerySpec).fetchAll();
    const total = (countResources)[0] || 0;

    // Apply pagination
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const jobs = (resources as GenerationJob[]).slice(offset, offset + limit);

    return { jobs, total };
  }

  /**
   * Get job statistics for a tenant
   */
  async getStats(tenantId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
    // Enhanced analytics (optional, computed if needed)
    analytics?: {
      averageDuration?: number;
      successRate?: number;
      averagePlaceholdersFilled?: number;
      averageTokensUsed?: number;
      mostCommonErrors?: Array<{ errorCode: string; count: number }>;
      jobsByTemplate?: Array<{ templateId: string; count: number }>;
    };
  }> {
    const statuses: GenerationJobStatus[] = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const querySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@status', value: status },
        ],
      };
      const { resources } = await this.container.items.query(querySpec).fetchAll();
      counts[status] = (resources)[0] || 0;
    }

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const completed = counts['completed'] || 0;
    const failed = counts['failed'] || 0;
    const cancelled = counts['cancelled'] || 0;
    const finished = completed + failed + cancelled;

    // Compute basic analytics from completed jobs (limit to recent 1000 for performance)
    let analytics: any = undefined;
    if (completed > 0) {
      try {
        const analyticsQuery = {
          query: `
            SELECT TOP 1000 
              c.resultMetadata.duration,
              c.resultMetadata.tokensUsed,
              c.placeholdersFilled,
              c.error.code as errorCode,
              c.status
            FROM c 
            WHERE c.tenantId = @tenantId 
            AND (c.status = @completed OR c.status = @failed)
            ORDER BY c.completedAt DESC
          `,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@completed', value: 'completed' },
            { name: '@failed', value: 'failed' },
          ],
        };

        const { resources: analyticsData } = await this.container.items.query(analyticsQuery).fetchAll();
        
        if (analyticsData && analyticsData.length > 0) {
          const completedJobs = analyticsData.filter((j: any) => j.duration !== undefined);
          const failedJobs = analyticsData.filter((j: any) => j.errorCode);
          
          // Calculate averages from completed jobs
          const durations = completedJobs.map((j: any) => j.duration).filter((d: any) => typeof d === 'number');
          const tokens = completedJobs.map((j: any) => j.tokensUsed).filter((t: any) => typeof t === 'number');
          const placeholders = completedJobs.map((j: any) => j.placeholdersFilled).filter((p: any) => typeof p === 'number');
          
          // Count error codes
          const errorCounts: Record<string, number> = {};
          failedJobs.forEach((j: any) => {
            if (j.errorCode) {
              errorCounts[j.errorCode] = (errorCounts[j.errorCode] || 0) + 1;
            }
          });

          analytics = {
            averageDuration: durations.length > 0 
              ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
              : undefined,
            successRate: finished > 0 ? Math.round((completed / finished) * 100) : undefined,
            averagePlaceholdersFilled: placeholders.length > 0
              ? Math.round(placeholders.reduce((a: number, b: number) => a + b, 0) / placeholders.length * 10) / 10
              : undefined,
            averageTokensUsed: tokens.length > 0
              ? Math.round(tokens.reduce((a: number, b: number) => a + b, 0) / tokens.length)
              : undefined,
            mostCommonErrors: Object.entries(errorCounts)
              .map(([errorCode, count]) => ({ errorCode, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5), // Top 5 errors
          };
        }
      } catch (error) {
        // If analytics computation fails, just return counts
        this.monitoring?.trackException(error as Error, { operation: 'generation-job.repository.compute-analytics' });
      }
    }

    return {
      pending: counts['pending'] || 0,
      processing: counts['processing'] || 0,
      completed,
      failed,
      cancelled,
      total,
      ...(analytics ? { analytics } : {}),
    };
  }

  /**
   * Cancel all pending/processing jobs for a template
   * Used when template is deleted or archived
   */
  async cancelJobsForTemplate(
    templateId: string,
    tenantId: string
  ): Promise<number> {
    try {
      // Find all pending or processing jobs for this template
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.templateId = @templateId AND c.status IN (@pending, @processing)',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@templateId', value: templateId },
          { name: '@pending', value: 'pending' },
          { name: '@processing', value: 'processing' },
        ],
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      const jobs = resources as GenerationJob[];

      // Cancel each job
      let cancelled = 0;
      for (const job of jobs) {
        try {
          await this.update(job.id, job.tenantId, {
            status: 'cancelled',
            completedAt: new Date().toISOString(),
            error: {
              message: 'Template was deleted or archived',
              code: 'TEMPLATE_DELETED',
            },
          });
          cancelled++;
        } catch (error) {
          // Log but continue with other jobs
          this.monitoring?.trackException(error as Error, { operation: 'generation-job.repository.cancel-job', jobId: job.id });
        }
      }

      return cancelled;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete old completed/failed/cancelled jobs (cleanup)
   */
  async deleteOldJobs(
    tenantId: string,
    olderThanDays: number = 30
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const querySpec = {
        query: `
          SELECT c.id 
          FROM c 
          WHERE c.tenantId = @tenantId 
          AND c.status IN (@completed, @failed, @cancelled)
          AND (c.completedAt < @cutoffDate OR (c.completedAt IS NULL AND c.createdAt < @cutoffDate))
        `,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@completed', value: 'completed' },
          { name: '@failed', value: 'failed' },
          { name: '@cancelled', value: 'cancelled' },
          { name: '@cutoffDate', value: cutoffDate.toISOString() },
        ],
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();

      let deleted = 0;
      for (const item of resources) {
        try {
          await this.container.item(item.id, tenantId).delete();
          deleted++;
        } catch (error) {
          // Log but continue with other deletions
          this.monitoring?.trackException(error as Error, { operation: 'generation-job.repository.delete-job', jobId: item.id });
        }
      }

      return deleted;
    } catch (error: unknown) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'generationJobRepository.deleteOldJobs',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find stuck jobs (processing jobs that have exceeded timeout)
   */
  async findStuckJobs(
    tenantId: string,
    timeoutMs: number
  ): Promise<GenerationJob[]> {
    try {
      const cutoffTime = new Date(Date.now() - timeoutMs);
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.tenantId = @tenantId 
          AND c.status = @status
          AND c.startedAt < @cutoffTime
        `,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@status', value: 'processing' },
          { name: '@cutoffTime', value: cutoffTime.toISOString() },
        ],
      };

      const { resources } = await this.container.items.query(querySpec).fetchAll();
      return resources as GenerationJob[];
    } catch (error: unknown) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'generationJobRepository.findStuckJobs',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Mark stuck jobs as failed
   */
  async markStuckJobsAsFailed(
    tenantId: string,
    timeoutMs: number
  ): Promise<number> {
    try {
      const stuckJobs = await this.findStuckJobs(tenantId, timeoutMs);
      
      let marked = 0;
      for (const job of stuckJobs) {
        try {
          await this.update(job.id, job.tenantId, {
            status: 'failed',
            completedAt: new Date().toISOString(),
            error: {
              message: `Job exceeded timeout of ${timeoutMs}ms and was marked as failed`,
              code: 'JOB_TIMEOUT',
              details: {
                startedAt: job.startedAt,
                timeoutMs,
              },
            },
          });
          marked++;
        } catch (error: unknown) {
          // Log but continue with other jobs
          this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'generation-job.repository.mark-stuck-job-failed',
            jobId: job.id,
          });
        }
      }

      return marked;
    } catch (error) {
      throw error;
    }
  }
}
