/**
 * Document Template Controller
 *
 * Handles HTTP requests for document template management (Content Generation system)
 * Different from TemplateController which handles simple content templates
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentTemplateService } from '../services/content-generation/services/document-template.service.js';
import { DocumentGenerationService } from '../services/content-generation/services/document-generation.service.js';
import { QueueService } from '../services/queue.service.js';
import { GenerationJobRepository } from '../repositories/generation-job.repository.js';
import { PlaceholderPreviewService } from '../services/content-generation/services/placeholder-preview.service.js';
export declare class DocumentTemplateController {
    private service;
    private generationService?;
    private serviceBus?;
    private jobRepository?;
    private previewService?;
    constructor(service: DocumentTemplateService, generationService?: DocumentGenerationService, serviceBus?: QueueService, jobRepository?: GenerationJobRepository, previewService?: PlaceholderPreviewService);
    /**
     * POST /api/v1/content/templates/extract
     * Extract placeholders from a source document
     * Admin only
     */
    extractPlaceholders(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/templates
     * List templates (Admin: all, User: active only)
     */
    list(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/templates/:id
     * Get template (Admin: all, User: active only)
     */
    get(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/templates
     * Create template
     * Admin only
     */
    create(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/content/templates/:id
     * Update template
     * Admin only
     */
    update(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/content/templates/:id
     * Delete template
     * Admin only
     */
    delete(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/content/templates/:id/activate
     * Activate template (draft → active)
     * Admin only
     */
    activate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/content/templates/:id/archive
     * Archive template (active → archived)
     * Admin only
     */
    archive(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/content/templates/:id/colors
     * Update template colors
     * Admin only
     */
    updateColors(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PUT /api/v1/content/templates/:id/placeholders
     * Update placeholder configurations
     * Admin only
     */
    updatePlaceholderConfigs(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/templates/:id/versions
     * Create a new version
     * Admin only
     */
    createVersion(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/templates/:id/versions
     * Get all versions
     * Admin only
     */
    getVersions(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/templates/:id/rollback
     * Rollback to a specific version
     * Admin only
     */
    rollback(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/templates/:id/placeholders/:placeholderName/test
     * Test/preview placeholder generation
     * Admin only
     */
    testPlaceholder(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/templates/:id/validate
     * Validate all placeholders in template
     * Admin only
     */
    validate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/templates/:id/generate
     * Generate a document from a template
     * User access (any authenticated user)
     */
    generate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/content/jobs/:jobId
     * Cancel a generation job
     * User access (job owner only)
     */
    cancelJob(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/jobs
     * List generation jobs
     * User access (users see their own jobs, admins see all tenant jobs)
     */
    listJobs(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/jobs/stats
     * Get generation job statistics for tenant
     * User access (tenant admins see all, users see their own)
     */
    getJobStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/jobs/:jobId/retry
     * Retry a failed generation job
     * User access (job owner only)
     */
    retryJob(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/jobs/:jobId
     * Get generation job status
     * User access (any authenticated user)
     */
    getJobStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/jobs/stuck
     * Find stuck generation jobs (admin only)
     */
    findStuckJobs(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/jobs/stuck/mark-failed
     * Mark stuck generation jobs as failed (admin only)
     */
    markStuckJobsAsFailed(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/content/jobs/cleanup
     * Cleanup old generation jobs (admin only)
     */
    cleanupOldJobs(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Get user OAuth token for document generation
     * Tries user-scoped connection first, then falls back to tenant-level connection
     */
    private getUserOAuthToken;
    /**
     * GET /api/v1/content/folders/google
     * List Google Drive folders for folder picker
     */
    listGoogleDriveFolders(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/folders/microsoft
     * List OneDrive folders for folder picker
     */
    listOneDriveFolders(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/content/folders/:provider/:folderId
     * Get folder details
     */
    getFolderDetails(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=document-template.controller.d.ts.map