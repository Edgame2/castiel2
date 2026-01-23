/**
 * Bulk Document Service
 *
 * Handles asynchronous bulk operations for documents:
 * - Bulk upload
 * - Bulk delete
 * - Bulk update metadata
 * - Bulk collection assignment
 */
import { BulkJobStatus, BulkJobType, DocumentAuditEventType, } from '../types/document.types.js';
/**
 * Bulk Document Service
 */
export class BulkDocumentService {
    jobRepository;
    shardRepository;
    auditIntegration;
    webhookEmitter;
    monitoring;
    constructor(jobRepository, shardRepository, auditIntegration, webhookEmitter, monitoring) {
        this.jobRepository = jobRepository;
        this.shardRepository = shardRepository;
        this.auditIntegration = auditIntegration;
        this.webhookEmitter = webhookEmitter;
        this.monitoring = monitoring;
    }
    /**
     * Start a bulk upload job
     */
    async startBulkUpload(input) {
        const { tenantId, userId, userEmail, items } = input;
        // Create job record
        const job = await this.jobRepository.create({
            tenantId,
            jobType: BulkJobType.BULK_UPLOAD,
            totalItems: items.length,
            createdBy: userId,
            createdByEmail: userEmail,
        });
        // Emit audit event for job start
        await this.auditIntegration.logUpload(tenantId, userId, `bulk-job-${job.id}`, `Bulk Upload Job (${items.length} files)`, {
            jobId: job.id,
            totalItems: items.length,
            timestamp: new Date().toISOString(),
        });
        // Emit webhook event
        if (this.webhookEmitter) {
            await this.webhookEmitter.emitAuditEvent({
                id: `audit-bulk-${job.id}`,
                tenantId,
                userId,
                action: DocumentAuditEventType.BULK_UPLOAD_STARTED,
                timestamp: new Date().toISOString(),
                documentId: job.id,
                metadata: { totalItems: items.length },
                status: 'success',
            });
        }
        this.monitoring?.trackEvent('bulkDocument.upload.started', {
            jobId: job.id,
            itemCount: items.length,
        });
        return job;
    }
    /**
     * Start a bulk delete job
     */
    async startBulkDelete(input) {
        const { tenantId, userId, userEmail, documentIds, reason, hardDelete } = input;
        // Create job record
        const job = await this.jobRepository.create({
            tenantId,
            jobType: BulkJobType.BULK_DELETE,
            totalItems: documentIds.length,
            createdBy: userId,
            createdByEmail: userEmail,
        });
        // Emit audit event for job start
        await this.auditIntegration.logDelete(tenantId, userId, `bulk-job-${job.id}`, `Bulk Delete Job (${documentIds.length} documents)`, {
            jobId: job.id,
            totalItems: documentIds.length,
            hardDelete: hardDelete || false,
            reason: reason || 'Bulk delete operation',
        });
        // Emit webhook event
        if (this.webhookEmitter) {
            await this.webhookEmitter.emitAuditEvent({
                id: `audit-bulk-${job.id}`,
                tenantId,
                userId,
                action: DocumentAuditEventType.BULK_DELETE_STARTED,
                timestamp: new Date().toISOString(),
                documentId: job.id,
                metadata: { totalItems: documentIds.length, reason },
                status: 'success',
            });
        }
        this.monitoring?.trackEvent('bulkDocument.delete.started', {
            jobId: job.id,
            itemCount: documentIds.length,
            hardDelete: hardDelete || false,
        });
        return job;
    }
    /**
     * Start a bulk update job
     */
    async startBulkUpdate(input) {
        const { tenantId, userId, userEmail, updates } = input;
        // Create job record
        const job = await this.jobRepository.create({
            tenantId,
            jobType: BulkJobType.BULK_UPDATE,
            totalItems: updates.length,
            createdBy: userId,
            createdByEmail: userEmail,
        });
        // Emit webhook event
        if (this.webhookEmitter) {
            await this.webhookEmitter.emitAuditEvent({
                id: `audit-bulk-${job.id}`,
                tenantId,
                userId,
                action: DocumentAuditEventType.BULK_UPDATE,
                timestamp: new Date().toISOString(),
                documentId: job.id,
                metadata: { totalItems: updates.length },
                status: 'success',
            });
        }
        this.monitoring?.trackEvent('bulkDocument.update.started', {
            jobId: job.id,
            itemCount: updates.length,
        });
        return job;
    }
    /**
     * Start a bulk collection assignment job
     */
    async startBulkCollectionAssign(input) {
        const { tenantId, userId, userEmail, collectionId, documentIds } = input;
        // Create job record
        const job = await this.jobRepository.create({
            tenantId,
            jobType: BulkJobType.BULK_COLLECTION_ASSIGN,
            totalItems: documentIds.length,
            createdBy: userId,
            createdByEmail: userEmail,
        });
        // Emit webhook event
        if (this.webhookEmitter) {
            await this.webhookEmitter.emitAuditEvent({
                id: `audit-bulk-${job.id}`,
                tenantId,
                userId,
                action: DocumentAuditEventType.BULK_COLLECTION_ASSIGN,
                timestamp: new Date().toISOString(),
                collectionId,
                metadata: { totalItems: documentIds.length },
                status: 'success',
            });
        }
        this.monitoring?.trackEvent('bulkDocument.collectionAssign.started', {
            jobId: job.id,
            itemCount: documentIds.length,
            collectionId,
        });
        return job;
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId, tenantId) {
        return this.jobRepository.findById(jobId, tenantId);
    }
    /**
     * Cancel a job
     */
    async cancelJob(jobId, tenantId, cancelledBy, reason) {
        const job = await this.jobRepository.findById(jobId, tenantId);
        if (!job) {
            throw new Error(`Job not found: ${jobId}`);
        }
        if (job.status === BulkJobStatus.COMPLETED || job.status === BulkJobStatus.FAILED) {
            throw new Error(`Cannot cancel ${job.status} job`);
        }
        const updated = await this.jobRepository.update(jobId, tenantId, {
            status: BulkJobStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledBy,
            cancellationReason: reason,
        });
        this.monitoring?.trackEvent('bulkDocument.job.cancelled', {
            jobId,
            reason,
        });
        return updated;
    }
    /**
     * Process bulk upload (called by background worker)
     */
    async processBulkUpload(job, items) {
        try {
            // Update job status to processing
            await this.jobRepository.update(job.id, job.tenantId, {
                status: BulkJobStatus.PROCESSING,
                startedAt: new Date(),
            });
            const results = [];
            let successCount = 0;
            let failureCount = 0;
            // Process each item
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                try {
                    // Create document shard
                    const documentData = {
                        name: item.name,
                        mimeType: item.mimeType,
                        fileSize: item.fileSize,
                        storageProvider: 'azure-blob',
                        storagePath: item.storagePath,
                        category: item.category,
                        tags: item.tags || [],
                        visibility: item.visibility,
                        version: 1,
                        versionHistory: [
                            {
                                version: 1,
                                uploadedAt: new Date(),
                                uploadedBy: job.createdBy,
                                uploadedByEmail: job.createdByEmail,
                                fileSize: item.fileSize,
                                mimeType: item.mimeType,
                                storageProvider: 'azure-blob',
                                storagePath: item.storagePath,
                            },
                        ],
                        uploadedBy: job.createdBy,
                        uploadedByEmail: job.createdByEmail,
                        uploadedAt: new Date(),
                    };
                    const shard = await this.shardRepository.create(job.tenantId, {
                        shardTypeId: 'c_document',
                        structuredData: documentData,
                        createdBy: job.createdBy,
                        createdByEmail: job.createdByEmail,
                    });
                    results.push({
                        itemId: item.name,
                        itemName: item.name,
                        status: 'success',
                        shardId: shard.id,
                        processedAt: new Date(),
                    });
                    successCount++;
                }
                catch (error) {
                    results.push({
                        itemId: item.name,
                        itemName: item.name,
                        status: 'failure',
                        error: error.message,
                        processedAt: new Date(),
                    });
                    failureCount++;
                    this.monitoring?.trackException(error, {
                        operation: 'bulkDocument.processBulkUpload.item',
                        itemName: item.name,
                    });
                }
                // Update progress
                await this.jobRepository.update(job.id, job.tenantId, {
                    processedItems: i + 1,
                    successCount,
                    failureCount,
                    results,
                });
            }
            // Mark job as completed
            const completedJob = await this.jobRepository.update(job.id, job.tenantId, {
                status: BulkJobStatus.COMPLETED,
                completedAt: new Date(),
            });
            // Emit completion event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-bulk-complete-${job.id}`,
                    tenantId: job.tenantId,
                    userId: job.createdBy,
                    action: DocumentAuditEventType.BULK_UPLOAD_COMPLETED,
                    timestamp: new Date().toISOString(),
                    documentId: job.id,
                    metadata: {
                        totalItems: job.totalItems,
                        successCount,
                        failureCount,
                    },
                    status: 'success',
                });
            }
            this.monitoring?.trackEvent('bulkDocument.upload.completed', {
                jobId: job.id,
                successCount,
                failureCount,
            });
        }
        catch (error) {
            // Mark job as failed
            await this.jobRepository.update(job.id, job.tenantId, {
                status: BulkJobStatus.FAILED,
                errorMessage: error.message,
                completedAt: new Date(),
            });
            this.monitoring?.trackException(error, {
                operation: 'bulkDocument.processBulkUpload',
                jobId: job.id,
            });
        }
    }
    /**
     * Process bulk delete (called by background worker)
     */
    async processBulkDelete(job, documentIds) {
        try {
            // Update job status to processing
            await this.jobRepository.update(job.id, job.tenantId, {
                status: BulkJobStatus.PROCESSING,
                startedAt: new Date(),
            });
            const results = [];
            let successCount = 0;
            let failureCount = 0;
            // Process each document
            for (let i = 0; i < documentIds.length; i++) {
                const documentId = documentIds[i];
                try {
                    // Soft delete document
                    const doc = await this.shardRepository.findById(documentId, job.tenantId);
                    if (!doc || doc.shardTypeId !== 'c_document') {
                        throw new Error('Document not found');
                    }
                    await this.shardRepository.delete(documentId, job.tenantId, false);
                    results.push({
                        itemId: documentId,
                        status: 'success',
                        shardId: documentId,
                        processedAt: new Date(),
                    });
                    successCount++;
                }
                catch (error) {
                    results.push({
                        itemId: documentId,
                        status: 'failure',
                        error: error.message,
                        processedAt: new Date(),
                    });
                    failureCount++;
                    this.monitoring?.trackException(error, {
                        operation: 'bulkDocument.processBulkDelete.item',
                        documentId,
                    });
                }
                // Update progress
                await this.jobRepository.update(job.id, job.tenantId, {
                    processedItems: i + 1,
                    successCount,
                    failureCount,
                    results,
                });
            }
            // Mark job as completed
            await this.jobRepository.update(job.id, job.tenantId, {
                status: BulkJobStatus.COMPLETED,
                completedAt: new Date(),
            });
            // Emit completion event
            if (this.webhookEmitter) {
                await this.webhookEmitter.emitAuditEvent({
                    id: `audit-bulk-complete-${job.id}`,
                    tenantId: job.tenantId,
                    userId: job.createdBy,
                    action: DocumentAuditEventType.BULK_DELETE_COMPLETED,
                    timestamp: new Date().toISOString(),
                    documentId: job.id,
                    metadata: {
                        totalItems: job.totalItems,
                        successCount,
                        failureCount,
                    },
                    status: 'success',
                });
            }
            this.monitoring?.trackEvent('bulkDocument.delete.completed', {
                jobId: job.id,
                successCount,
                failureCount,
            });
        }
        catch (error) {
            // Mark job as failed
            await this.jobRepository.update(job.id, job.tenantId, {
                status: BulkJobStatus.FAILED,
                errorMessage: error.message,
                completedAt: new Date(),
            });
            this.monitoring?.trackException(error, {
                operation: 'bulkDocument.processBulkDelete',
                jobId: job.id,
            });
        }
    }
    /**
     * Get job results (paginated)
     */
    async getJobResults(jobId, tenantId, limit = 100, offset = 0) {
        const job = await this.jobRepository.findById(jobId, tenantId);
        if (!job) {
            throw new Error(`Job not found: ${jobId}`);
        }
        const allResults = job.results || [];
        const paginatedResults = allResults.slice(offset, offset + limit);
        return {
            results: paginatedResults,
            total: allResults.length,
        };
    }
}
//# sourceMappingURL=bulk-document.service.js.map