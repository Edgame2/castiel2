/**
 * Bulk Job Worker Service
 * 
 * Background worker for processing pending bulk jobs asynchronously
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { BulkJobRepository } from '../repositories/bulk-job.repository.js';
import { BulkJob, BulkJobStatus, BulkJobType } from '../types/document.types.js';

/**
 * Configuration for the bulk job worker
 */
export interface BulkJobWorkerConfig {
  /**
   * Interval in milliseconds to poll for pending jobs
   * @default 5000 (5 seconds)
   */
  pollIntervalMs?: number;

  /**
   * Maximum number of jobs to process in parallel
   * @default 2
   */
  maxConcurrentJobs?: number;

  /**
   * Maximum processing time per job in milliseconds
   * @default 3600000 (1 hour)
   */
  maxJobDurationMs?: number;

  /**
   * Enable automatic job timeout
   * @default true
   */
  enableJobTimeout?: boolean;
}

/**
 * Bulk Job Worker
 * 
 * Polls the database for pending bulk jobs and processes them asynchronously
 */
export class BulkJobWorker {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeJobs: Map<string, Promise<void>> = new Map();

  private readonly pollIntervalMs: number;
  private readonly maxConcurrentJobs: number;
  private readonly maxJobDurationMs: number;
  private readonly enableJobTimeout: boolean;

  constructor(
    private jobRepository: BulkJobRepository,
    private monitoring: IMonitoringProvider,
    config: BulkJobWorkerConfig = {}
  ) {
    this.pollIntervalMs = config.pollIntervalMs || 5000;
    this.maxConcurrentJobs = config.maxConcurrentJobs || 2;
    this.maxJobDurationMs = config.maxJobDurationMs || 3600000;
    this.enableJobTimeout = config.enableJobTimeout !== false;
  }

  /**
   * Start the background worker
   */
  public start(): void {
    if (this.isRunning) {
      this.monitoring.trackEvent('bulkJobWorker.alreadyRunning');
      return;
    }

    this.isRunning = true;
    this.monitoring.trackEvent('bulkJobWorker.started', {
      pollIntervalMs: this.pollIntervalMs,
    });

    // Start polling loop
    this.poll();
  }

  /**
   * Stop the background worker
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear the poll interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Wait for active jobs to complete (with timeout)
    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.monitoring.trackEvent('bulkJobWorker.stopTimeout', {
          activeJobs: this.activeJobs.size,
        });
        resolve();
      }, 30000); // 30 second timeout for active jobs
    });

    const activeJobsPromise = Promise.all(Array.from(this.activeJobs.values())).then(() => {
      this.monitoring.trackEvent('bulkJobWorker.allJobsCompleted');
    });

    await Promise.race([activeJobsPromise, timeout]);
    this.monitoring.trackEvent('bulkJobWorker.stopped');
  }

  /**
   * Poll for pending jobs
   */
  private poll(): void {
    if (!this.isRunning) {
      return;
    }

    // Set next poll
    this.pollInterval = setTimeout(() => {
      this.processPendingJobs().catch((err) => {
        this.monitoring.trackException(err as Error, {
          operation: 'bulkJobWorker.processPendingJobs',
        });
      });
      this.poll();
    }, this.pollIntervalMs);
  }

  /**
   * Process all pending jobs
   */
  private async processPendingJobs(): Promise<void> {
    // Skip if we're at max concurrent jobs
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    try {
      // Find pending jobs (tenantId from database, just look for PENDING status)
      const pendingJobs = await this.jobRepository.findByStatus(BulkJobStatus.PENDING);

      for (const job of pendingJobs) {
        // Skip if already being processed
        if (this.activeJobs.has(job.id)) {
          continue;
        }

        // Skip if we're at max concurrent jobs
        if (this.activeJobs.size >= this.maxConcurrentJobs) {
          break;
        }

        // Start processing this job
        this.activeJobs.set(job.id, this.processJob(job)
          .catch((err) => {
            this.monitoring.trackException(err as Error, {
              operation: 'bulkJobWorker.processJob',
              jobId: job.id,
            });
          })
          .finally(() => {
            this.activeJobs.delete(job.id);
          }));
      }

      if (pendingJobs.length > 0) {
        this.monitoring.trackMetric('bulkJobWorker.pendingJobsFound', pendingJobs.length);
      }
    } catch (err) {
      this.monitoring.trackException(err as Error, {
        operation: 'bulkJobWorker.processPendingJobs',
      });
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: BulkJob): Promise<void> {
    try {
      this.monitoring.trackEvent('bulkJobWorker.jobProcessingStarted', {
        jobId: job.id,
        jobType: job.jobType,
      });

      // Create timeout promise if enabled
      let timeoutPromise: Promise<never> | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      if (this.enableJobTimeout) {
        timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Job processing timeout after ${this.maxJobDurationMs}ms`));
          }, this.maxJobDurationMs);
        });
      }

      try {
        // Process based on job type
        const processingPromise = this.processJobByType(job);

        // Race against timeout if enabled
        if (timeoutPromise) {
          await Promise.race([processingPromise, timeoutPromise]);
          // Clear timeout if processing completed before timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        } else {
          await processingPromise;
        }

        this.monitoring.trackEvent('bulkJobWorker.jobProcessingCompleted', {
          jobId: job.id,
        });
      } catch (err) {
        // Clear timeout if it exists (whether timeout occurred or other error)
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // If it's a timeout, mark job as failed
        if (errorMessage.includes('timeout')) {
          this.monitoring.trackEvent('bulkJobWorker.jobTimeout', {
            jobId: job.id,
            reason: errorMessage,
          });
          await this.jobRepository.update(job.id, job.tenantId, {
            status: BulkJobStatus.FAILED,
            errorMessage: `Processing timeout: ${errorMessage}`,
          });
        } else {
          throw err;
        }
      }
    } catch (err) {
      this.monitoring.trackException(err as Error, {
        operation: 'bulkJobWorker.processJob',
        jobId: job.id,
      });
      
      // Update job as failed
      try {
        const updateErrorMessage = err instanceof Error ? err.message : String(err);
        await this.jobRepository.update(job.id, job.tenantId, {
          status: BulkJobStatus.FAILED,
          errorMessage: `Worker error: ${updateErrorMessage}`,
        });
      } catch (updateErr) {
        this.monitoring.trackException(updateErr as Error, {
          operation: 'bulkJobWorker.updateJobStatus',
          jobId: job.id,
        });
      }
    }
  }

  /**
   * Process job by type
   */
  private async processJobByType(job: BulkJob): Promise<void> {
    // Note: The actual processing methods need the items, but we only have jobId here
    // In a real implementation, you would fetch the items from the job metadata or a separate queue
    // For now, we'll call the service methods but they need to be adapted to work with the job ID

    switch (job.jobType) {
      case BulkJobType.BULK_UPLOAD:
        // In a production system, fetch upload items from job metadata
        // await this.bulkDocumentService.processBulkUpload(job, items);
        this.monitoring.trackEvent('bulkJobWorker.bulkUploadQueued', { jobId: job.id });
        break;

      case BulkJobType.BULK_DELETE:
        // In a production system, fetch delete IDs from job metadata
        // await this.bulkDocumentService.processBulkDelete(job, documentIds);
        this.monitoring.trackEvent('bulkJobWorker.bulkDeleteQueued', { jobId: job.id });
        break;

      case BulkJobType.BULK_UPDATE:
        // In a production system, fetch updates from job metadata
        // await this.bulkDocumentService.processBulkUpdate(job, updates);
        this.monitoring.trackEvent('bulkJobWorker.bulkUpdateQueued', { jobId: job.id });
        break;

      case BulkJobType.BULK_COLLECTION_ASSIGN:
        // In a production system, fetch assignment data from job metadata
        // await this.bulkDocumentService.processBulkCollectionAssign(job, collectionId, documentIds);
        this.monitoring.trackEvent('bulkJobWorker.bulkCollectionAssignQueued', { jobId: job.id });
        break;

      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
  }

  /**
   * Get worker status
   */
  public getStatus(): {
    isRunning: boolean;
    activeJobs: number;
    maxConcurrentJobs: number;
    pollIntervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      pollIntervalMs: this.pollIntervalMs,
    };
  }
}
