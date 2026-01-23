/**
 * Bulk Job Repository
 * Manages bulk operation jobs in Cosmos DB
 */

import { Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  BulkJob,
  BulkJobStatus,
  BulkJobType,
  BulkJobItemResult,
} from '../types/document.types.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateBulkJobInput {
  tenantId: string;
  jobType: BulkJobType;
  totalItems: number;
  createdBy: string;
  createdByEmail?: string;
}

export interface UpdateBulkJobInput {
  status?: BulkJobStatus;
  processedItems?: number;
  successCount?: number;
  failureCount?: number;
  results?: BulkJobItemResult[];
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

/**
 * Bulk Job Repository
 */
export class BulkJobRepository {
  constructor(
    private container: Container,
    private monitoring: IMonitoringProvider
  ) {}

  /**
   * Create a new bulk job
   */
  async create(input: CreateBulkJobInput): Promise<BulkJob> {
    const job: BulkJob = {
      id: uuidv4(),
      partitionKey: input.tenantId,
      tenantId: input.tenantId,
      jobType: input.jobType,
      status: BulkJobStatus.PENDING,
      totalItems: input.totalItems,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      results: [],
      createdAt: new Date(),
      createdBy: input.createdBy,
      createdByEmail: input.createdByEmail,
    };

    try {
      const { resource } = await this.container.items.create(job);
      
      this.monitoring.trackEvent('Bulk job created', {
        jobId: job.id,
        jobType: job.jobType,
        tenantId: job.tenantId,
        totalItems: job.totalItems,
      });

      return resource as BulkJob;
    } catch (error) {
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'bulk-job' });
      }
      throw error;
    }
  }

  /**
   * Get bulk job by ID
   */
  async findById(id: string, tenantId: string): Promise<BulkJob | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read<BulkJob>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'bulk-job' });
      }
      throw error;
    }
  }

  /**
   * Update bulk job
   */
  async update(id: string, tenantId: string, updates: UpdateBulkJobInput): Promise<BulkJob> {
    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {
        throw new Error(`Bulk job not found: ${id}`);
      }

      const updated: BulkJob = {
        ...existing,
        ...updates,
      };

      const { resource } = await this.container
        .item(id, tenantId)
        .replace<BulkJob>(updated);

      this.monitoring.trackEvent('Bulk job updated', {
        jobId: id,
        status: updated.status,
        processedItems: updated.processedItems,
        totalItems: updated.totalItems,
      });

      return resource as BulkJob;
    } catch (error) {
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'bulk-job' });
      }
      throw error;
    }
  }

  /**
   * Add result to bulk job
   */
  async addResult(
    id: string,
    tenantId: string,
    result: BulkJobItemResult
  ): Promise<void> {
    try {
      const job = await this.findById(id, tenantId);
      if (!job) {
        throw new Error(`Bulk job not found: ${id}`);
      }

      job.results.push(result);
      job.processedItems = job.results.length;
      
      if (result.status === 'success') {
        job.successCount++;
      } else {
        job.failureCount++;
      }

      // Update status if all items processed
      if (job.processedItems === job.totalItems) {
        job.status = BulkJobStatus.COMPLETED;
        job.completedAt = new Date();
      }

      await this.container.item(id, tenantId).replace<BulkJob>(job);
    } catch (error) {
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'bulk-job' });
      }
      throw error;
    }
  }

  /**
   * Mark job as processing
   */
  async markProcessing(id: string, tenantId: string): Promise<BulkJob> {
    return this.update(id, tenantId, {
      status: BulkJobStatus.PROCESSING,
      startedAt: new Date(),
    });
  }

  /**
   * Mark job as completed
   */
  async markCompleted(id: string, tenantId: string): Promise<BulkJob> {
    return this.update(id, tenantId, {
      status: BulkJobStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * Mark job as failed
   */
  async markFailed(
    id: string,
    tenantId: string,
    errorMessage: string
  ): Promise<BulkJob> {
    return this.update(id, tenantId, {
      status: BulkJobStatus.FAILED,
      errorMessage,
      completedAt: new Date(),
    });
  }

  /**
   * Cancel job
   */
  async cancel(
    id: string,
    tenantId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<BulkJob> {
    return this.update(id, tenantId, {
      status: BulkJobStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason,
    });
  }

  /**
   * List jobs for tenant
   */
  async listByTenant(
    tenantId: string,
    options: {
      status?: BulkJobStatus;
      jobType?: BulkJobType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ jobs: BulkJob[]; total: number }> {
    try {
      let query = `SELECT * FROM c WHERE c.tenantId = @tenantId`;
      const parameters: Array<{ name: string; value: any }> = [
        { name: '@tenantId', value: tenantId },
      ];

      if (options.status) {
        query += ` AND c.status = @status`;
        parameters.push({ name: '@status', value: options.status });
      }

      if (options.jobType) {
        query += ` AND c.jobType = @jobType`;
        parameters.push({ name: '@jobType', value: options.jobType });
      }

      query += ` ORDER BY c.createdAt DESC`;

      if (options.limit) {
        query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
      }

      const { resources } = await this.container.items
        .query<BulkJob>({ query, parameters })
        .fetchAll();

      // Get total count (without limit)
      const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
      const { resources: countResources } = await this.container.items
        .query({ query: countQuery, parameters })
        .fetchAll();

      return {
        jobs: resources,
        total: countResources[0] || 0,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'bulk-job' });
      }
      throw error;
    }
  }

  /**
   * Delete old completed jobs (cleanup)
   */
  async deleteOldJobs(tenantId: string, olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const query = `
        SELECT c.id 
        FROM c 
        WHERE c.tenantId = @tenantId 
        AND c.status IN ('completed', 'failed', 'cancelled')
        AND c.completedAt < @cutoffDate
      `;

      const { resources } = await this.container.items
        .query({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@cutoffDate', value: cutoffDate.toISOString() },
          ],
        })
        .fetchAll();

      let deleted = 0;
      for (const item of resources) {
        await this.container.item(item.id, tenantId).delete();
        deleted++;
      }

      if (deleted > 0) {
        this.monitoring.trackEvent('Deleted old bulk jobs', {
          tenantId,
          count: deleted,
          olderThanDays,
        });
      }

      return deleted;
    } catch (error) {
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'bulk-job' });
      }
      throw error;
    }
  }

  /**
   * Find all jobs with a specific status (across all tenants)
   * Used by background worker to find pending jobs
   */
  async findByStatus(status: BulkJobStatus, limit: number = 100): Promise<BulkJob[]> {
    try {
      const query = `SELECT TOP @limit * FROM c WHERE c.status = @status ORDER BY c.createdAt ASC`;
      const parameters: Array<{ name: string; value: any }> = [
        { name: '@status', value: status },
        { name: '@limit', value: limit },
      ];

      const { resources } = await this.container.items
        .query<BulkJob>({ query, parameters })
        .fetchAll();

      return resources;
    } catch (error: unknown) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'bulkJobRepository.findByStatus',
        context: 'bulk-job',
      });
      throw error;
    }
  }
}
