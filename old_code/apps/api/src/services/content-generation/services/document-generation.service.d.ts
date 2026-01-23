/**
 * Document Generation Service
 *
 * Handles document generation jobs from templates
 * Creates jobs and queues them to BullMQ/Redis for async processing
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import type { Redis } from 'ioredis';
import { DocumentTemplateService } from './document-template.service.js';
import { GenerationRequest, GenerationJob, GenerationJobStatus, GenerationResult } from '../types/generation.types.js';
import { QueueService } from '../../queue.service.js';
export declare class DocumentGenerationService {
    private monitoring;
    private templateService;
    private serviceBus;
    private jobRepository;
    private encryptionService;
    private redis;
    private config;
    constructor(monitoring: IMonitoringProvider, templateService: DocumentTemplateService, serviceBus: QueueService, redis?: Redis | null);
    /**
     * Generate a document from a template
     * Creates a job and queues it for async processing
     */
    generateDocument(request: GenerationRequest, userToken?: string): Promise<GenerationResult>;
    /**
     * Get generation job status
     */
    getJobStatus(jobId: string, tenantId: string, userId?: string): Promise<GenerationResult>;
    /**
     * Cancel a pending or processing generation job
     */
    cancelJob(jobId: string, tenantId: string, userId: string): Promise<GenerationResult>;
    /**
     * Validate generation request
     */
    private validateGenerationRequest;
    /**
     * Validate destination folder exists and user has access
     */
    private validateDestinationFolder;
    /**
     * Validate Google Drive folder exists and user has access
     */
    private validateGoogleDriveFolder;
    /**
     * Validate OneDrive folder exists and user has access
     */
    private validateOneDriveFolder;
    /**
     * Queue generation job to Service Bus
     */
    private queueGenerationJob;
    /**
     * Check quota limits (daily and monthly) for tenant/user
     * Uses Redis to track usage counters
     */
    private checkQuotaLimits;
    /**
     * Rollback quota increment if job creation fails
     */
    private rollbackQuota;
    /**
     * List generation jobs for a tenant/user
     */
    listJobs(tenantId: string, options?: {
        userId?: string;
        status?: GenerationJobStatus;
        templateId?: string;
        limit?: number;
        offset?: number;
        createdAfter?: Date;
        createdBefore?: Date;
    }): Promise<{
        jobs: GenerationJob[];
        total: number;
    }>;
    /**
     * Get generation job statistics for a tenant
     */
    getJobStats(tenantId: string): Promise<{
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        cancelled: number;
        total: number;
        analytics?: {
            averageDuration?: number;
            successRate?: number;
            averagePlaceholdersFilled?: number;
            averageTokensUsed?: number;
            mostCommonErrors?: Array<{
                errorCode: string;
                count: number;
            }>;
            jobsByTemplate?: Array<{
                templateId: string;
                count: number;
            }>;
        };
    }>;
    /**
     * Retry a failed generation job
     */
    retryJob(jobId: string, tenantId: string, userId: string): Promise<GenerationResult>;
    /**
     * Cleanup old generation jobs (delete completed/failed/cancelled jobs older than specified days)
     * Admin operation
     */
    cleanupOldJobs(tenantId: string, olderThanDays?: number): Promise<number>;
    /**
     * Find stuck jobs (processing jobs that have exceeded timeout)
     */
    findStuckJobs(tenantId: string): Promise<GenerationJob[]>;
    /**
     * Mark stuck jobs as failed (cleanup operation)
     */
    markStuckJobsAsFailed(tenantId: string): Promise<number>;
}
//# sourceMappingURL=document-generation.service.d.ts.map