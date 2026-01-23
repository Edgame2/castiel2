/**
 * Document Template Controller
 *
 * Handles HTTP requests for document template management (Content Generation system)
 * Different from TemplateController which handles simple content templates
 */
import { AppError, NotFoundError, ValidationError, UnauthorizedError } from '../middleware/error-handler.js';
import { getUser } from '../middleware/authenticate.js';
import { isGlobalAdmin, hasAnyRole } from '../middleware/authorization.js';
/**
 * Check if user is tenant admin
 */
function isTenantAdmin(user) {
    if (isGlobalAdmin(user)) {
        return true;
    }
    const adminRoles = ['admin', 'tenant_admin', 'tenant-admin', 'owner'];
    return hasAnyRole(user, adminRoles);
}
export class DocumentTemplateController {
    service;
    generationService;
    // Reserved for future use - serviceBus and jobRepository will be used for async job processing
    serviceBus;
    jobRepository;
    previewService;
    constructor(service, generationService, serviceBus, jobRepository, previewService) {
        this.service = service;
        this.generationService = generationService;
        this.serviceBus = serviceBus;
        this.jobRepository = jobRepository;
        this.previewService = previewService;
    }
    /**
     * POST /api/v1/content/templates/extract
     * Extract placeholders from a source document
     * Admin only
     */
    async extractPlaceholders(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const body = request.body;
            if (!body.templateId || !body.extractionRequest) {
                throw new AppError('templateId and extractionRequest are required', 400);
            }
            const result = await this.service.extractPlaceholders(body.templateId, user.tenantId, body.extractionRequest);
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to extract placeholders');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to extract placeholders',
            });
        }
    }
    /**
     * GET /api/v1/content/templates
     * List templates (Admin: all, User: active only)
     */
    async list(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            // Build filters
            const filters = {};
            if (query.status) {
                filters.status = query.status;
            }
            if (query.documentFormat) {
                filters.documentFormat = query.documentFormat;
            }
            if (query.search) {
                filters.search = query.search;
            }
            // Admin sees all, users see only active
            const templates = isTenantAdmin(user)
                ? await this.service.listTemplates(user.tenantId, filters)
                : await this.service.listActiveTemplates(user.tenantId, {
                    documentFormat: query.documentFormat,
                });
            reply.status(200).send({ templates });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list templates');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to list templates',
            });
        }
    }
    /**
     * GET /api/v1/content/templates/:id
     * Get template (Admin: all, User: active only)
     */
    async get(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            const template = isTenantAdmin(user)
                ? await this.service.getTemplate(params.id, user.tenantId)
                : await this.service.getTemplateForUser(params.id, user.tenantId);
            if (!template) {
                throw new NotFoundError('Template not found');
            }
            reply.status(200).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get template',
            });
        }
    }
    /**
     * POST /api/v1/content/templates
     * Create template
     * Admin only
     */
    async create(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const body = request.body;
            if (!body.name || !body.documentFormat || !body.sourceDocumentId) {
                throw new AppError('name, documentFormat, and sourceDocumentId are required', 400);
            }
            // Validate name is not empty
            if (body.name.trim().length === 0) {
                throw new AppError('Template name cannot be empty', 400);
            }
            const template = await this.service.createTemplate(user.tenantId, user.id, body);
            reply.status(201).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to create template',
            });
        }
    }
    /**
     * PUT /api/v1/content/templates/:id
     * Update template
     * Admin only
     */
    async update(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const body = request.body;
            // Validate name is not empty if provided
            if (body.name !== undefined && body.name.trim().length === 0) {
                throw new AppError('Template name cannot be empty', 400);
            }
            const template = await this.service.updateTemplate(params.id, user.tenantId, body);
            reply.status(200).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to update template',
            });
        }
    }
    /**
     * DELETE /api/v1/content/templates/:id
     * Delete template
     * Admin only
     */
    async delete(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            await this.service.deleteTemplate(params.id, user.tenantId);
            reply.status(200).send({ success: true });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to delete template',
            });
        }
    }
    /**
     * PUT /api/v1/content/templates/:id/activate
     * Activate template (draft → active)
     * Admin only
     */
    async activate(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const template = await this.service.activateTemplate(params.id, user.tenantId);
            reply.status(200).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to activate template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to activate template',
            });
        }
    }
    /**
     * PUT /api/v1/content/templates/:id/archive
     * Archive template (active → archived)
     * Admin only
     */
    async archive(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const template = await this.service.archiveTemplate(params.id, user.tenantId);
            reply.status(200).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to archive template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to archive template',
            });
        }
    }
    /**
     * PUT /api/v1/content/templates/:id/colors
     * Update template colors
     * Admin only
     */
    async updateColors(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const body = request.body;
            if (!body.colors || !Array.isArray(body.colors)) {
                throw new AppError('colors array is required', 400);
            }
            const template = await this.service.updateColors(params.id, user.tenantId, body.colors);
            reply.status(200).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update colors');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to update colors',
            });
        }
    }
    /**
     * PUT /api/v1/content/templates/:id/placeholders
     * Update placeholder configurations
     * Admin only
     */
    async updatePlaceholderConfigs(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const body = request.body;
            if (!body.configs || !Array.isArray(body.configs)) {
                throw new AppError('configs array is required', 400);
            }
            const template = await this.service.updatePlaceholderConfigs(params.id, user.tenantId, body.configs);
            reply.status(200).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update placeholder configs');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to update placeholder configs',
            });
        }
    }
    /**
     * POST /api/v1/content/templates/:id/versions
     * Create a new version
     * Admin only
     */
    async createVersion(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const body = request.body;
            if (!body.changes) {
                throw new AppError('changes description is required', 400);
            }
            const version = await this.service.createVersion(params.id, user.tenantId, user.id, body.changes);
            reply.status(201).send(version);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create version');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to create version',
            });
        }
    }
    /**
     * GET /api/v1/content/templates/:id/versions
     * Get all versions
     * Admin only
     */
    async getVersions(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const versions = await this.service.getVersions(params.id, user.tenantId);
            reply.status(200).send({ versions });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get versions');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get versions',
            });
        }
    }
    /**
     * POST /api/v1/content/templates/:id/rollback
     * Rollback to a specific version
     * Admin only
     */
    async rollback(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            const params = request.params;
            const body = request.body;
            if (body.versionNumber === undefined) {
                throw new AppError('versionNumber is required', 400);
            }
            const template = await this.service.rollbackToVersion(params.id, user.tenantId, body.versionNumber);
            reply.status(200).send(template);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to rollback template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to rollback template',
            });
        }
    }
    /**
     * POST /api/v1/content/templates/:id/placeholders/:placeholderName/test
     * Test/preview placeholder generation
     * Admin only
     */
    async testPlaceholder(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            if (!this.previewService) {
                throw new AppError('Preview service not available', 503);
            }
            const params = request.params;
            const body = request.body;
            const previewRequest = {
                templateId: params.id,
                tenantId: user.tenantId,
                placeholderName: params.placeholderName,
                context: body.context,
            };
            const result = await this.previewService.testPlaceholderGeneration(user.tenantId, user.id, previewRequest);
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to test placeholder');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to test placeholder',
            });
        }
    }
    /**
     * GET /api/v1/content/templates/:id/validate
     * Validate all placeholders in template
     * Admin only
     */
    async validate(request, reply) {
        try {
            const user = getUser(request);
            if (!isTenantAdmin(user)) {
                throw new AppError('Tenant administrator access required', 403);
            }
            if (!this.previewService) {
                throw new AppError('Preview service not available', 503);
            }
            const params = request.params;
            const result = await this.previewService.validateAllPlaceholders(params.id, user.tenantId);
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to validate template');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to validate template',
            });
        }
    }
    /**
     * POST /api/v1/content/templates/:id/generate
     * Generate a document from a template
     * User access (any authenticated user)
     */
    async generate(request, reply) {
        try {
            const user = getUser(request);
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const params = request.params;
            const body = request.body;
            // Extract request ID from headers for traceability (if available)
            const requestId = (request.headers['x-request-id'] ||
                request.headers['x-correlation-id'] ||
                request.id);
            // Build generation request
            const generationRequest = {
                templateId: params.id,
                tenantId: user.tenantId,
                userId: user.id,
                destinationFolderId: body.destinationFolder.folderId,
                destinationProvider: body.destinationFolder.provider,
                context: body.contextShardId
                    ? {
                        projectId: body.contextShardId,
                        variables: body.options?.overrideValues,
                    }
                    : {
                        variables: body.options?.overrideValues,
                    },
                options: {
                    async: true,
                    notifyOnComplete: true,
                    skipPlaceholders: body.options?.skipPlaceholders,
                    requestId, // Pass request ID for traceability
                },
            };
            // Get user OAuth token from integration system based on provider
            const userToken = await this.getUserOAuthToken(user.tenantId, user.id, body.destinationFolder.provider, request);
            const result = await this.generationService.generateDocument(generationRequest, userToken);
            // Set response headers for traceability
            if (requestId) {
                reply.header('X-Request-ID', requestId);
            }
            reply.header('X-Job-ID', result.jobId);
            reply.header('X-Template-ID', result.templateId);
            reply.status(202).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to generate document');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to generate document',
            });
        }
    }
    /**
     * DELETE /api/v1/content/jobs/:jobId
     * Cancel a generation job
     * User access (job owner only)
     */
    async cancelJob(request, reply) {
        try {
            const user = getUser(request);
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const params = request.params;
            // Extract request ID from headers for traceability (if available)
            const requestId = (request.headers['x-request-id'] ||
                request.headers['x-correlation-id'] ||
                request.id);
            const result = await this.generationService.cancelJob(params.jobId, user.tenantId, user.id);
            // Set response headers for traceability
            if (requestId) {
                reply.header('X-Request-ID', requestId);
            }
            reply.header('X-Job-ID', result.jobId);
            reply.header('X-Template-ID', result.templateId);
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to cancel generation job');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to cancel generation job',
            });
        }
    }
    /**
     * GET /api/v1/content/jobs
     * List generation jobs
     * User access (users see their own jobs, admins see all tenant jobs)
     */
    async listJobs(request, reply) {
        try {
            const user = getUser(request);
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const query = request.query;
            // Parse and validate dates
            let createdAfter;
            let createdBefore;
            if (query.createdAfter) {
                createdAfter = new Date(query.createdAfter);
                if (isNaN(createdAfter.getTime())) {
                    throw new ValidationError(`Invalid date format for createdAfter: "${query.createdAfter}". Expected ISO 8601 format (e.g., 2024-01-01T00:00:00Z)`);
                }
            }
            if (query.createdBefore) {
                createdBefore = new Date(query.createdBefore);
                if (isNaN(createdBefore.getTime())) {
                    throw new ValidationError(`Invalid date format for createdBefore: "${query.createdBefore}". Expected ISO 8601 format (e.g., 2024-01-01T00:00:00Z)`);
                }
            }
            // Validate date range
            if (createdAfter && createdBefore && createdAfter > createdBefore) {
                throw new ValidationError('createdAfter must be before or equal to createdBefore');
            }
            // Users see only their own jobs, admins see all tenant jobs
            const options = {
                userId: isTenantAdmin(user) ? undefined : user.id,
                status: query.status,
                templateId: query.templateId,
                limit: query.limit ? parseInt(query.limit, 10) : 50,
                offset: query.offset ? parseInt(query.offset, 10) : 0,
                createdAfter,
                createdBefore,
            };
            const result = await this.generationService.listJobs(user.tenantId, options);
            reply.status(200).send({
                jobs: result.jobs,
                total: result.total,
                limit: options.limit,
                offset: options.offset,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list generation jobs');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to list generation jobs',
            });
        }
    }
    /**
     * GET /api/v1/content/jobs/stats
     * Get generation job statistics for tenant
     * User access (tenant admins see all, users see their own)
     */
    async getJobStats(request, reply) {
        try {
            const user = getUser(request);
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const stats = await this.generationService.getJobStats(user.tenantId);
            reply.status(200).send(stats);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get job statistics');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get job statistics',
            });
        }
    }
    /**
     * POST /api/v1/content/jobs/:jobId/retry
     * Retry a failed generation job
     * User access (job owner only)
     */
    async retryJob(request, reply) {
        try {
            const user = getUser(request);
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const params = request.params;
            // Get OAuth token if available (for re-queuing)
            // Optional - job can proceed without token (token is not used in retryJob but may be needed in future)
            const _userToken = await this.getUserOAuthToken(user.tenantId, user.id, 'google', // Default to google, could be enhanced to detect from job
            request).catch((error) => {
                // Log error but don't fail the request - token is optional for retry
                request.log.warn({ error }, 'Failed to get OAuth token for retry');
                return undefined;
            });
            // Extract request ID from headers for traceability (if available)
            const requestId = (request.headers['x-request-id'] ||
                request.headers['x-correlation-id'] ||
                request.id);
            const result = await this.generationService.retryJob(params.jobId, user.tenantId, user.id);
            // Set response headers for traceability
            if (requestId) {
                reply.header('X-Request-ID', requestId);
            }
            reply.header('X-Job-ID', result.jobId);
            reply.header('X-Template-ID', result.templateId);
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to retry generation job');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to retry generation job',
            });
        }
    }
    /**
     * GET /api/v1/content/jobs/:jobId
     * Get generation job status
     * User access (any authenticated user)
     */
    async getJobStatus(request, reply) {
        // Extract request ID from headers for traceability (if available)
        const requestId = (request.headers['x-request-id'] ||
            request.headers['x-correlation-id'] ||
            request.id);
        try {
            const user = getUser(request);
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const params = request.params;
            const result = await this.generationService.getJobStatus(params.jobId, user.tenantId, user.id);
            // Set response headers for traceability
            if (requestId) {
                reply.header('X-Request-ID', requestId);
            }
            reply.header('X-Job-ID', result.jobId);
            reply.header('X-Template-ID', result.templateId);
            reply.status(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get job status');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to get job status',
            });
        }
    }
    /**
     * GET /api/v1/content/jobs/stuck
     * Find stuck generation jobs (admin only)
     */
    async findStuckJobs(request, reply) {
        try {
            const user = getUser(request);
            // Only tenant admins can find stuck jobs
            if (!isTenantAdmin(user)) {
                throw new UnauthorizedError('Access denied. Only tenant admins can find stuck jobs.');
            }
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const stuckJobs = await this.generationService.findStuckJobs(user.tenantId);
            reply.status(200).send({
                stuckJobs,
                count: stuckJobs.length,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to find stuck generation jobs');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to find stuck generation jobs',
            });
        }
    }
    /**
     * POST /api/v1/content/jobs/stuck/mark-failed
     * Mark stuck generation jobs as failed (admin only)
     */
    async markStuckJobsAsFailed(request, reply) {
        try {
            const user = getUser(request);
            // Only tenant admins can mark stuck jobs as failed
            if (!isTenantAdmin(user)) {
                throw new UnauthorizedError('Access denied. Only tenant admins can mark stuck jobs as failed.');
            }
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const markedCount = await this.generationService.markStuckJobsAsFailed(user.tenantId);
            reply.status(200).send({
                markedCount,
                message: `Successfully marked ${markedCount} stuck generation jobs as failed`,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to mark stuck generation jobs as failed');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to mark stuck generation jobs as failed',
            });
        }
    }
    /**
     * POST /api/v1/content/jobs/cleanup
     * Cleanup old generation jobs (admin only)
     */
    async cleanupOldJobs(request, reply) {
        try {
            const user = getUser(request);
            // Only tenant admins can cleanup jobs
            if (!isTenantAdmin(user)) {
                throw new UnauthorizedError('Access denied. Only tenant admins can cleanup jobs.');
            }
            if (!this.generationService) {
                throw new AppError('Generation service not available', 503);
            }
            const body = request.body || {};
            const olderThanDays = body.olderThanDays || 30;
            if (olderThanDays < 1 || olderThanDays > 365) {
                throw new ValidationError('olderThanDays must be between 1 and 365');
            }
            const deletedCount = await this.generationService.cleanupOldJobs(user.tenantId, olderThanDays);
            reply.status(200).send({
                deletedCount,
                olderThanDays,
                message: `Successfully deleted ${deletedCount} old generation jobs`,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to cleanup old generation jobs');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to cleanup old generation jobs',
            });
        }
    }
    /**
     * Get user OAuth token for document generation
     * Tries user-scoped connection first, then falls back to tenant-level connection
     */
    async getUserOAuthToken(tenantId, userId, provider, request) {
        // Get integration services from server
        const integrationService = request.server.integrationService;
        const integrationConnectionService = request.server.integrationConnectionService;
        if (!integrationService || !integrationConnectionService) {
            throw new AppError('Integration services not available. Cannot retrieve OAuth token.', 503);
        }
        // Map provider to integration provider name
        const providerMap = {
            google: 'google-workspace',
            microsoft: 'microsoft-365',
        };
        const providerName = providerMap[provider];
        // Find integration by provider name
        const integrations = await integrationService.listIntegrations({
            tenantId,
            providerName,
            status: 'connected',
            limit: 1,
        });
        if (integrations.integrations.length === 0) {
            throw new ValidationError(`No connected ${providerName} integration found. Please connect the integration first.`);
        }
        const integration = integrations.integrations[0];
        // Get user OAuth token (tries user connection first, falls back to tenant connection)
        try {
            const accessToken = await integrationConnectionService.getUserOAuthToken(integration.id, tenantId, userId);
            return accessToken;
        }
        catch (error) {
            throw new AppError(`Failed to retrieve OAuth token for ${providerName}: ${error.message}`, 400);
        }
    }
    /**
     * GET /api/v1/content/folders/google
     * List Google Drive folders for folder picker
     */
    async listGoogleDriveFolders(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            const parentId = query.parentId || 'root';
            const limit = Math.min(parseInt(query.limit || '50', 10), 100);
            const search = query.search;
            const pageToken = query.pageToken;
            // Get user OAuth token for Google
            const userToken = await this.getUserOAuthToken(user.tenantId, user.id, 'google', request);
            // Use Google Drive API to list folders
            const { google } = await import('googleapis');
            const oauth2Client = new (await import('google-auth-library')).OAuth2Client();
            oauth2Client.setCredentials({ access_token: userToken });
            const drive = google.drive({ version: 'v3', auth: oauth2Client });
            // Build query for folders only
            let q = "mimeType='application/vnd.google-apps.folder' and trashed=false";
            if (parentId !== 'root') {
                q += ` and '${parentId}' in parents`;
            }
            else {
                q += " and 'root' in parents";
            }
            if (search) {
                q += ` and name contains '${search.replace(/'/g, "\\'")}'`;
            }
            const response = await drive.files.list({
                q,
                pageSize: limit,
                pageToken: pageToken || undefined,
                fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, webViewLink, parents)',
                orderBy: 'name',
            });
            const folders = (response.data.files || []).map((file) => ({
                id: file.id,
                name: file.name,
                parentId: file.parents?.[0] || null,
                url: file.webViewLink || `https://drive.google.com/drive/folders/${file.id}`,
                createdAt: file.createdTime,
                modifiedAt: file.modifiedTime,
            }));
            reply.status(200).send({
                folders,
                nextPageToken: response.data.nextPageToken || undefined,
                hasMore: !!response.data.nextPageToken,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list Google Drive folders');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to list Google Drive folders',
            });
        }
    }
    /**
     * GET /api/v1/content/folders/microsoft
     * List OneDrive folders for folder picker
     */
    async listOneDriveFolders(request, reply) {
        try {
            const user = getUser(request);
            const query = request.query;
            const parentId = query.parentId || 'root';
            const limit = Math.min(parseInt(query.limit || '50', 10), 200);
            const search = query.search;
            const skip = parseInt(query.skip || '0', 10);
            // Get user OAuth token for Microsoft
            const userToken = await this.getUserOAuthToken(user.tenantId, user.id, 'microsoft', request);
            // Use Microsoft Graph API to list folders
            const axios = (await import('axios')).default;
            const graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';
            let url;
            if (parentId === 'root') {
                url = `${graphApiBaseUrl}/me/drive/root/children`;
            }
            else {
                url = `${graphApiBaseUrl}/me/drive/items/${parentId}/children`;
            }
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
                params: {
                    $filter: "folder ne null",
                    $top: limit,
                    $skip: skip,
                    $orderby: 'name asc',
                    $select: 'id,name,webUrl,createdDateTime,lastModifiedDateTime,parentReference',
                },
                timeout: 10000,
            });
            const folders = (response.data.value || [])
                .filter((item) => item.folder) // Ensure it's a folder
                .map((item) => ({
                id: item.id,
                name: item.name,
                parentId: item.parentReference?.id || null,
                url: item.webUrl,
                createdAt: item.createdDateTime,
                modifiedAt: item.lastModifiedDateTime,
            }));
            // Apply search filter if provided (client-side since Graph API filter is limited)
            const filteredFolders = search
                ? folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
                : folders;
            reply.status(200).send({
                folders: filteredFolders,
                hasMore: response.data['@odata.nextLink'] ? true : false,
                nextLink: response.data['@odata.nextLink'] || undefined,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list OneDrive folders');
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to list OneDrive folders',
            });
        }
    }
    /**
     * GET /api/v1/content/folders/:provider/:folderId
     * Get folder details
     */
    async getFolderDetails(request, reply) {
        try {
            const user = getUser(request);
            const params = request.params;
            if (!['google', 'microsoft'].includes(params.provider)) {
                throw new ValidationError('Invalid provider. Must be "google" or "microsoft"');
            }
            // Get user OAuth token
            const provider = params.provider;
            const userToken = await this.getUserOAuthToken(user.tenantId, user.id, provider, request);
            if (provider === 'google') {
                // Get Google Drive folder details
                const { google } = await import('googleapis');
                const oauth2Client = new (await import('google-auth-library')).OAuth2Client();
                oauth2Client.setCredentials({ access_token: userToken });
                const drive = google.drive({ version: 'v3', auth: oauth2Client });
                const response = await drive.files.get({
                    fileId: params.folderId,
                    fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink, parents, owners',
                });
                if (!response.data || !response.data.id) {
                    throw new AppError('Invalid response from Google Drive API', 500);
                }
                reply.status(200).send({
                    id: response.data.id,
                    name: response.data.name || '',
                    parentId: response.data.parents?.[0] || null,
                    url: response.data.webViewLink || `https://drive.google.com/drive/folders/${response.data.id}`,
                    createdAt: response.data.createdTime || null,
                    modifiedAt: response.data.modifiedTime || null,
                    owner: response.data.owners?.[0]?.displayName || null,
                });
            }
            else {
                // Get OneDrive folder details
                const axios = (await import('axios')).default;
                const graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';
                const response = await axios.get(`${graphApiBaseUrl}/me/drive/items/${params.folderId}`, {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                    timeout: 10000,
                });
                if (!response.data || !response.data.folder) {
                    throw new AppError('Item is not a folder', 400);
                }
                if (!response.data.id) {
                    throw new AppError('Invalid response from OneDrive API', 500);
                }
                reply.status(200).send({
                    id: response.data.id,
                    name: response.data.name || '',
                    parentId: response.data.parentReference?.id || null,
                    url: response.data.webUrl || null,
                    createdAt: response.data.createdDateTime || null,
                    modifiedAt: response.data.lastModifiedDateTime || null,
                    owner: response.data.createdBy?.user?.displayName || null,
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
            const errorName = error instanceof Error ? error.name : (error && typeof error === 'object' && 'name' in error ? String(error.name) : 'Internal Server Error');
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get folder details');
            reply.status(statusCode || 500).send({
                error: errorName,
                message: errorMessage || 'Failed to get folder details',
            });
        }
    }
}
//# sourceMappingURL=document-template.controller.js.map