/**
 * Document Bulk Controller
 *
 * Handles bulk document operation requests
 */
/**
 * Document Bulk Controller
 */
export class DocumentBulkController {
    bulkService;
    monitoring;
    constructor(bulkService, monitoring) {
        this.bulkService = bulkService;
        this.monitoring = monitoring;
    }
    /**
     * Start a bulk upload job
     * POST /api/v1/documents/bulk-upload
     */
    startBulkUpload = async (req, reply) => {
        try {
            const { tenantId, id: userId, email: userEmail } = req.auth || {};
            if (!tenantId || !userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { items } = req.body;
            if (!items || !Array.isArray(items) || items.length === 0) {
                return reply.status(400).send({ error: 'Items array is required and must not be empty' });
            }
            if (items.length > 1000) {
                return reply.status(400).send({ error: 'Maximum 1000 items per job' });
            }
            const job = await this.bulkService.startBulkUpload({
                tenantId,
                userId,
                userEmail,
                items,
            });
            this.monitoring.trackMetric('api.bulkDocument.upload.started', items.length);
            return reply.status(202).send({
                jobId: job.id,
                status: job.status,
                totalItems: job.totalItems,
                createdAt: job.createdAt,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'bulkDocument.startBulkUpload' });
            return reply.status(500).send({ error: error.message });
        }
    };
    /**
     * Start a bulk delete job
     * POST /api/v1/documents/bulk-delete
     */
    startBulkDelete = async (req, reply) => {
        try {
            const { tenantId, id: userId, email: userEmail } = req.auth || {};
            if (!tenantId || !userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { documentIds, reason, hardDelete } = req.body;
            if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
                return reply.status(400).send({ error: 'DocumentIds array is required and must not be empty' });
            }
            if (documentIds.length > 1000) {
                return reply.status(400).send({ error: 'Maximum 1000 items per job' });
            }
            const job = await this.bulkService.startBulkDelete({
                tenantId,
                userId,
                userEmail,
                documentIds,
                reason,
                hardDelete,
            });
            this.monitoring.trackMetric('api.bulkDocument.delete.started', documentIds.length);
            return reply.status(202).send({
                jobId: job.id,
                status: job.status,
                totalItems: job.totalItems,
                createdAt: job.createdAt,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'bulkDocument.startBulkDelete' });
            return reply.status(500).send({ error: error.message });
        }
    };
    /**
     * Start a bulk update job
     * POST /api/v1/documents/bulk-update
     */
    startBulkUpdate = async (req, reply) => {
        try {
            const { tenantId, id: userId, email: userEmail } = req.auth || {};
            if (!tenantId || !userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { updates } = req.body;
            if (!updates || !Array.isArray(updates) || updates.length === 0) {
                return reply.status(400).send({ error: 'Updates array is required and must not be empty' });
            }
            if (updates.length > 1000) {
                return reply.status(400).send({ error: 'Maximum 1000 items per job' });
            }
            const job = await this.bulkService.startBulkUpdate({
                tenantId,
                userId,
                userEmail,
                updates,
            });
            this.monitoring.trackMetric('api.bulkDocument.update.started', updates.length);
            return reply.status(202).send({
                jobId: job.id,
                status: job.status,
                totalItems: job.totalItems,
                createdAt: job.createdAt,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'bulkDocument.startBulkUpdate' });
            return reply.status(500).send({ error: error.message });
        }
    };
    /**
     * Start a bulk collection assignment job
     * POST /api/v1/collections/:collectionId/bulk-assign
     */
    startBulkCollectionAssign = async (req, reply) => {
        try {
            const { tenantId, id: userId, email: userEmail } = req.auth || {};
            if (!tenantId || !userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { collectionId } = req.params;
            const { documentIds } = req.body;
            if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
                return reply.status(400).send({ error: 'DocumentIds array is required and must not be empty' });
            }
            if (documentIds.length > 1000) {
                return reply.status(400).send({ error: 'Maximum 1000 items per job' });
            }
            const job = await this.bulkService.startBulkCollectionAssign({
                tenantId,
                userId,
                userEmail,
                collectionId,
                documentIds,
            });
            this.monitoring.trackMetric('api.bulkDocument.collectionAssign.started', documentIds.length);
            return reply.status(202).send({
                jobId: job.id,
                status: job.status,
                totalItems: job.totalItems,
                createdAt: job.createdAt,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'bulkDocument.startBulkCollectionAssign' });
            return reply.status(500).send({ error: error.message });
        }
    };
    /**
     * Get job status
     * GET /api/v1/bulk-jobs/:jobId
     */
    getJobStatus = async (req, reply) => {
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { jobId } = req.params;
            const job = await this.bulkService.getJobStatus(jobId, tenantId);
            if (!job) {
                return reply.status(404).send({ error: 'Job not found' });
            }
            return reply.status(200).send({
                id: job.id,
                jobType: job.jobType,
                status: job.status,
                totalItems: job.totalItems,
                processedItems: job.processedItems,
                successCount: job.successCount,
                failureCount: job.failureCount,
                progress: job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                errorMessage: job.errorMessage,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'bulkDocument.getJobStatus' });
            return reply.status(500).send({ error: error.message });
        }
    };
    /**
     * Get job results
     * GET /api/v1/bulk-jobs/:jobId/results
     */
    getJobResults = async (req, reply) => {
        try {
            const { tenantId } = req.auth || {};
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { jobId } = req.params;
            const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
            const offset = parseInt(req.query.offset || '0', 10);
            const { results, total } = await this.bulkService.getJobResults(jobId, tenantId, limit, offset);
            return reply.status(200).send({
                jobId,
                results,
                pagination: {
                    limit,
                    offset,
                    total,
                    hasMore: offset + limit < total,
                },
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'bulkDocument.getJobResults' });
            return reply.status(500).send({ error: error.message });
        }
    };
    /**
     * Cancel a job
     * POST /api/v1/bulk-jobs/:jobId/cancel
     */
    cancelJob = async (req, reply) => {
        try {
            const { tenantId, id: userId } = req.auth || {};
            if (!tenantId || !userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const { jobId } = req.params;
            const { reason } = req.body;
            const job = await this.bulkService.cancelJob(jobId, tenantId, userId, reason || 'Cancelled by user');
            this.monitoring.trackMetric('api.bulkDocument.job.cancelled', 1);
            return reply.status(200).send({
                jobId: job.id,
                status: job.status,
                cancelledAt: job.cancelledAt,
                cancellationReason: job.cancellationReason,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'bulkDocument.cancelJob' });
            const statusCode = error.message.includes('Cannot cancel') ? 400 : 500;
            return reply.status(statusCode).send({ error: error.message });
        }
    };
}
//# sourceMappingURL=document-bulk.controller.js.map