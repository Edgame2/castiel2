/**
 * Import/Export Controller
 *
 * HTTP handlers for shard import and export operations
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ImportExportService } from '../services/import-export.service.js';
/**
 * Import/Export Controller
 */
export declare class ImportExportController {
    private readonly importExportService;
    constructor(importExportService: ImportExportService);
    /**
     * POST /api/v1/exports
     * Create a new export job
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    createExport(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/exports/:id
     * Get export job status
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    getExportJob(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/exports/:id/download
     * Download export file
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    downloadExport(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/imports
     * Create a new import job
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic validation (file size check).
     */
    createImport(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/imports/:id
     * Get import job status
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    getImportJob(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/imports/validate
     * Validate import data without creating shards
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    validateImport(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=import-export.controller.d.ts.map