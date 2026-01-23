/**
 * Import/Export Controller
 *
 * HTTP handlers for shard import and export operations
 */
import { getUser } from '../middleware/authenticate.js';
import { AppError, NotFoundError, ValidationError } from '../middleware/error-handler.js';
/**
 * Import/Export Controller
 */
export class ImportExportController {
    importExportService;
    constructor(importExportService) {
        this.importExportService = importExportService;
    }
    /**
     * POST /api/v1/exports
     * Create a new export job
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    async createExport(request, reply) {
        const user = getUser(request);
        // Fastify schema validation ensures body structure is valid
        const body = request.body;
        try {
            const job = await this.importExportService.createExportJob(user.tenantId, user.id, body);
            request.log.info({ jobId: job.id }, 'Export job created');
            reply.status(202).send({ job });
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to create export');
            throw new AppError('Failed to create export job', 500);
        }
    }
    /**
     * GET /api/v1/exports/:id
     * Get export job status
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    async getExportJob(request, reply) {
        const user = getUser(request);
        // Fastify schema validation ensures id is present
        const { id } = request.params;
        try {
            const job = await this.importExportService.getExportJob(user.tenantId, id);
            if (!job) {
                throw new NotFoundError('Export job not found');
            }
            reply.status(200).send({ job });
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get export job');
            throw new AppError('Failed to get export job', 500);
        }
    }
    /**
     * GET /api/v1/exports/:id/download
     * Download export file
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    async downloadExport(request, reply) {
        const user = getUser(request);
        // Fastify schema validation ensures id is present
        const { id } = request.params;
        try {
            const job = await this.importExportService.getExportJob(user.tenantId, id);
            if (!job) {
                throw new NotFoundError('Export job not found');
            }
            if (job.status !== 'completed') {
                throw new ValidationError('Export not ready for download');
            }
            const content = await this.importExportService.getExportFileContent(user.tenantId, id);
            if (!content) {
                throw new NotFoundError('Export file not found or expired');
            }
            // Set appropriate content type
            const contentTypes = {
                json: 'application/json',
                csv: 'text/csv',
                xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ndjson: 'application/x-ndjson',
            };
            const contentType = contentTypes[job.options.format] || 'application/octet-stream';
            reply
                .header('Content-Type', contentType)
                .header('Content-Disposition', `attachment; filename="${job.fileName}"`)
                .status(200)
                .send(content);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to download export');
            throw new AppError('Failed to download export', 500);
        }
    }
    /**
     * POST /api/v1/imports
     * Create a new import job
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic validation (file size check).
     */
    async createImport(request, reply) {
        const user = getUser(request);
        // Fastify schema validation ensures body structure is valid
        const body = request.body;
        // Validate file size (max 10MB) - business logic validation
        const fileSize = Buffer.byteLength(body.fileContent, 'base64');
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (fileSize > MAX_FILE_SIZE) {
            throw new ValidationError('File too large. Maximum size is 10MB.');
        }
        try {
            const job = await this.importExportService.createImportJob(user.tenantId, user.id, body);
            request.log.info({ jobId: job.id }, 'Import job created');
            reply.status(202).send({ job });
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to create import');
            throw new AppError('Failed to create import job', 500);
        }
    }
    /**
     * GET /api/v1/imports/:id
     * Get import job status
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    async getImportJob(request, reply) {
        const user = getUser(request);
        // Fastify schema validation ensures id is present
        const { id } = request.params;
        try {
            const job = await this.importExportService.getImportJob(user.tenantId, id);
            if (!job) {
                throw new NotFoundError('Import job not found');
            }
            reply.status(200).send({ job });
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get import job');
            throw new AppError('Failed to get import job', 500);
        }
    }
    /**
     * POST /api/v1/imports/validate
     * Validate import data without creating shards
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    async validateImport(request, reply) {
        const user = getUser(request);
        // Fastify schema validation ensures body structure is valid
        const body = request.body;
        try {
            const result = await this.importExportService.validateImport(user.tenantId, body, body.previewRows || 10);
            reply.status(200).send({ validation: result });
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to validate import');
            throw new AppError('Failed to validate import', 500);
        }
    }
}
//# sourceMappingURL=import-export.controller.js.map