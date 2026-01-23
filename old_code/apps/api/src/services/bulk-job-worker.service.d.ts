/**
 * Bulk Job Worker Service
 *
 * Background worker for processing pending bulk jobs asynchronously
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BulkJobRepository } from '../repositories/bulk-job.repository.js';
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
export declare class BulkJobWorker {
    private jobRepository;
    private monitoring;
    private isRunning;
    private pollInterval;
    private activeJobs;
    private readonly pollIntervalMs;
    private readonly maxConcurrentJobs;
    private readonly maxJobDurationMs;
    private readonly enableJobTimeout;
    constructor(jobRepository: BulkJobRepository, monitoring: IMonitoringProvider, config?: BulkJobWorkerConfig);
    /**
     * Start the background worker
     */
    start(): void;
    /**
     * Stop the background worker
     */
    stop(): Promise<void>;
    /**
     * Poll for pending jobs
     */
    private poll;
    /**
     * Process all pending jobs
     */
    private processPendingJobs;
    /**
     * Process a single job
     */
    private processJob;
    /**
     * Process job by type
     */
    private processJobByType;
    /**
     * Get worker status
     */
    getStatus(): {
        isRunning: boolean;
        activeJobs: number;
        maxConcurrentJobs: number;
        pollIntervalMs: number;
    };
}
//# sourceMappingURL=bulk-job-worker.service.d.ts.map