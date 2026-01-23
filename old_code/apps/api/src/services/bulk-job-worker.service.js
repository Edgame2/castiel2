/**
 * Bulk Job Worker Service
 *
 * Background worker for processing pending bulk jobs asynchronously
 */
import { BulkJobStatus, BulkJobType } from '../types/document.types.js';
/**
 * Bulk Job Worker
 *
 * Polls the database for pending bulk jobs and processes them asynchronously
 */
export class BulkJobWorker {
    jobRepository;
    monitoring;
    isRunning = false;
    pollInterval = null;
    activeJobs = new Map();
    pollIntervalMs;
    maxConcurrentJobs;
    maxJobDurationMs;
    enableJobTimeout;
    constructor(jobRepository, monitoring, config = {}) {
        this.jobRepository = jobRepository;
        this.monitoring = monitoring;
        this.pollIntervalMs = config.pollIntervalMs || 5000;
        this.maxConcurrentJobs = config.maxConcurrentJobs || 2;
        this.maxJobDurationMs = config.maxJobDurationMs || 3600000;
        this.enableJobTimeout = config.enableJobTimeout !== false;
    }
    /**
     * Start the background worker
     */
    start() {
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
    async stop() {
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
        const timeout = new Promise((resolve) => {
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
    poll() {
        if (!this.isRunning) {
            return;
        }
        // Set next poll
        this.pollInterval = setTimeout(() => {
            this.processPendingJobs().catch((err) => {
                this.monitoring.trackException(err, {
                    operation: 'bulkJobWorker.processPendingJobs',
                });
            });
            this.poll();
        }, this.pollIntervalMs);
    }
    /**
     * Process all pending jobs
     */
    async processPendingJobs() {
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
                    this.monitoring.trackException(err, {
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
        }
        catch (err) {
            this.monitoring.trackException(err, {
                operation: 'bulkJobWorker.processPendingJobs',
            });
        }
    }
    /**
     * Process a single job
     */
    async processJob(job) {
        try {
            this.monitoring.trackEvent('bulkJobWorker.jobProcessingStarted', {
                jobId: job.id,
                jobType: job.jobType,
            });
            // Create timeout promise if enabled
            let timeoutPromise = null;
            let timeoutId = null;
            if (this.enableJobTimeout) {
                timeoutPromise = new Promise((_, reject) => {
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
                }
                else {
                    await processingPromise;
                }
                this.monitoring.trackEvent('bulkJobWorker.jobProcessingCompleted', {
                    jobId: job.id,
                });
            }
            catch (err) {
                // Clear timeout if it exists (whether timeout occurred or other error)
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                const message = err.message;
                // If it's a timeout, mark job as failed
                if (message.includes('timeout')) {
                    this.monitoring.trackEvent('bulkJobWorker.jobTimeout', {
                        jobId: job.id,
                        reason: message,
                    });
                    await this.jobRepository.update(job.id, job.tenantId, {
                        status: BulkJobStatus.FAILED,
                        errorMessage: `Processing timeout: ${message}`,
                    });
                }
                else {
                    throw err;
                }
            }
        }
        catch (err) {
            this.monitoring.trackException(err, {
                operation: 'bulkJobWorker.processJob',
                jobId: job.id,
            });
            // Update job as failed
            try {
                await this.jobRepository.update(job.id, job.tenantId, {
                    status: BulkJobStatus.FAILED,
                    errorMessage: `Worker error: ${err.message}`,
                });
            }
            catch (updateErr) {
                this.monitoring.trackException(updateErr, {
                    operation: 'bulkJobWorker.updateJobStatus',
                    jobId: job.id,
                });
            }
        }
    }
    /**
     * Process job by type
     */
    async processJobByType(job) {
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
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: this.activeJobs.size,
            maxConcurrentJobs: this.maxConcurrentJobs,
            pollIntervalMs: this.pollIntervalMs,
        };
    }
}
//# sourceMappingURL=bulk-job-worker.service.js.map