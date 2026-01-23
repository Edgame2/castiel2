/**
 * Document Template Routes
 *
 * API routes for document template management (Content Generation system)
 * Different from template.routes.ts which handles simple content templates
 */
import { authenticate } from '../middleware/authenticate.js';
export async function registerDocumentTemplateRoutes(server, controller) {
    server.register(async (api) => {
        // All routes require authentication
        api.addHook('preHandler', authenticate(server.tokenValidationCache));
        // Extract placeholders from source document (Admin only)
        api.post('/content/templates/extract', {
            schema: {
                body: {
                    type: 'object',
                    required: ['templateId', 'extractionRequest'],
                    properties: {
                        templateId: { type: 'string' },
                        extractionRequest: {
                            type: 'object',
                            required: ['documentFormat', 'sourceDocumentId'],
                            properties: {
                                documentFormat: {
                                    type: 'string',
                                    enum: ['google_slides', 'google_docs', 'word', 'powerpoint'],
                                },
                                sourceDocumentId: { type: 'string' },
                                sourceDocumentUrl: { type: 'string' },
                                includeContext: { type: 'boolean' },
                                contextRadius: { type: 'number' },
                            },
                        },
                    },
                },
            },
        }, controller.extractPlaceholders);
        // List templates (Admin: all, User: active only)
        api.get('/content/templates', {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['draft', 'active', 'archived'] },
                        documentFormat: {
                            type: 'string',
                            enum: ['google_slides', 'google_docs', 'word', 'powerpoint'],
                        },
                        search: { type: 'string' },
                    },
                },
            },
        }, controller.list);
        // Get template (Admin: all, User: active only)
        api.get('/content/templates/:id', controller.get);
        // Create template (Admin only)
        api.post('/content/templates', {
            schema: {
                body: {
                    type: 'object',
                    required: ['name', 'documentFormat', 'sourceDocumentId'],
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        documentFormat: {
                            type: 'string',
                            enum: ['google_slides', 'google_docs', 'word', 'powerpoint'],
                        },
                        sourceDocumentId: { type: 'string' },
                        sourceDocumentUrl: { type: 'string' },
                        contextTemplateId: { type: 'string' },
                    },
                },
            },
        }, controller.create);
        // Update template (Admin only)
        api.put('/content/templates/:id', {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['draft', 'active', 'archived'] },
                        placeholderConfigs: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['placeholderName', 'description', 'isRequired'],
                                properties: {
                                    placeholderName: { type: 'string' },
                                    typeOverride: {
                                        type: 'string',
                                        enum: ['text', 'number', 'email', 'domain', 'list', 'chart', 'image'],
                                    },
                                    description: { type: 'string' },
                                    tone: { type: 'string' },
                                    constraints: {
                                        type: 'object',
                                        properties: {
                                            minLength: { type: 'number' },
                                            maxLength: { type: 'number' },
                                            pattern: { type: 'string' },
                                            required: { type: 'boolean' },
                                        },
                                    },
                                    chartConfig: { type: 'object' },
                                    contextTemplateId: { type: 'string' },
                                    isRequired: { type: 'boolean' },
                                },
                            },
                        },
                        dominantColors: {
                            type: 'array',
                            items: { type: 'string' },
                            maxItems: 6,
                        },
                        contextTemplateId: { type: 'string' },
                    },
                },
            },
        }, controller.update);
        // Delete template (Admin only)
        api.delete('/content/templates/:id', controller.delete);
        // Activate template (Admin only)
        api.put('/content/templates/:id/activate', controller.activate);
        // Archive template (Admin only)
        api.put('/content/templates/:id/archive', controller.archive);
        // Update template colors (Admin only)
        api.put('/content/templates/:id/colors', {
            schema: {
                body: {
                    type: 'object',
                    required: ['colors'],
                    properties: {
                        colors: {
                            type: 'array',
                            items: { type: 'string' },
                            maxItems: 6,
                        },
                    },
                },
            },
        }, controller.updateColors);
        // Update placeholder configurations (Admin only)
        api.put('/content/templates/:id/placeholders', {
            schema: {
                body: {
                    type: 'object',
                    required: ['configs'],
                    properties: {
                        configs: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['placeholderName', 'description', 'isRequired'],
                                properties: {
                                    placeholderName: { type: 'string' },
                                    typeOverride: {
                                        type: 'string',
                                        enum: ['text', 'number', 'email', 'domain', 'list', 'chart', 'image'],
                                    },
                                    description: { type: 'string' },
                                    tone: { type: 'string' },
                                    constraints: {
                                        type: 'object',
                                        properties: {
                                            minLength: { type: 'number' },
                                            maxLength: { type: 'number' },
                                            pattern: { type: 'string' },
                                            required: { type: 'boolean' },
                                        },
                                    },
                                    chartConfig: { type: 'object' },
                                    contextTemplateId: { type: 'string' },
                                    isRequired: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
            },
        }, controller.updatePlaceholderConfigs);
        // Version management (Admin only)
        api.post('/content/templates/:id/versions', {
            schema: {
                body: {
                    type: 'object',
                    required: ['changes'],
                    properties: {
                        changes: { type: 'string' },
                    },
                },
            },
        }, controller.createVersion);
        api.get('/content/templates/:id/versions', controller.getVersions);
        api.post('/content/templates/:id/rollback', {
            schema: {
                body: {
                    type: 'object',
                    required: ['versionNumber'],
                    properties: {
                        versionNumber: { type: 'number' },
                    },
                },
            },
        }, controller.rollback);
        // Preview/Test placeholder generation (Admin only)
        api.post('/content/templates/:id/placeholders/:placeholderName/test', {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        context: {
                            type: 'object',
                            additionalProperties: true,
                        },
                    },
                },
            },
        }, controller.testPlaceholder);
        // Validate all placeholders (Admin only)
        api.get('/content/templates/:id/validate', controller.validate);
        // Generate document from template (User access)
        api.post('/content/templates/:id/generate', {
            // Limit request body size to 1MB (to prevent abuse with large context variables)
            bodyLimit: 1024 * 1024, // 1MB
            schema: {
                description: 'Generate a document from a template. Returns 202 Accepted with job details. The generation is processed asynchronously.',
                body: {
                    type: 'object',
                    required: ['destinationFolder'],
                    properties: {
                        destinationFolder: {
                            type: 'object',
                            required: ['provider', 'folderId'],
                            description: 'Destination folder where the generated document will be created',
                            properties: {
                                provider: {
                                    type: 'string',
                                    enum: ['google', 'microsoft'],
                                    description: 'Storage provider (google for Google Drive, microsoft for OneDrive)',
                                },
                                folderId: {
                                    type: 'string',
                                    description: 'Folder ID in the destination provider',
                                },
                            },
                        },
                        contextShardId: {
                            type: 'string',
                            description: 'Optional project shard ID to use as context for generation',
                        },
                        options: {
                            type: 'object',
                            description: 'Optional generation options',
                            properties: {
                                skipPlaceholders: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of placeholder names to skip during generation',
                                    maxItems: 50, // Enforced by maxSkipPlaceholders config
                                },
                                overrideValues: {
                                    type: 'object',
                                    additionalProperties: { type: 'string' },
                                    description: 'Manual variable overrides (key-value pairs)',
                                    maxProperties: 50, // Enforced by maxContextVariables config
                                },
                            },
                        },
                    },
                },
                response: {
                    202: {
                        description: 'Generation job created successfully',
                        type: 'object',
                        properties: {
                            jobId: { type: 'string', description: 'Generation job ID' },
                            templateId: { type: 'string' },
                            status: { type: 'string', enum: ['pending'] },
                            placeholdersFilled: { type: 'number' },
                            placeholdersTotal: { type: 'number' },
                        },
                    },
                    400: {
                        description: 'Bad request (validation error, quota exceeded, etc.)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    403: {
                        description: 'Forbidden (access denied)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    503: {
                        description: 'Service unavailable (generation service not available)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        }, controller.generate);
        // List generation jobs (User access)
        api.get('/content/jobs', {
            schema: {
                description: 'List generation jobs with optional filters. Users see their own jobs, admins see all tenant jobs.',
                tags: ['Content Generation'],
                querystring: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
                            description: 'Filter by job status',
                        },
                        templateId: {
                            type: 'string',
                            description: 'Filter by template ID',
                        },
                        limit: {
                            type: 'string',
                            description: 'Maximum number of jobs to return (default: 100)',
                        },
                        offset: {
                            type: 'string',
                            description: 'Number of jobs to skip for pagination (default: 0)',
                        },
                        createdAfter: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Filter jobs created after this date (ISO 8601)',
                        },
                        createdBefore: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Filter jobs created before this date (ISO 8601)',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'List of generation jobs',
                        type: 'object',
                        properties: {
                            jobs: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        templateId: { type: 'string' },
                                        status: { type: 'string' },
                                        createdAt: { type: 'string' },
                                        startedAt: { type: 'string' },
                                        completedAt: { type: 'string' },
                                        placeholdersFilled: { type: 'number' },
                                        generatedDocumentId: { type: 'string' },
                                        generatedDocumentUrl: { type: 'string' },
                                        error: { type: 'object' },
                                    },
                                },
                            },
                            total: { type: 'number' },
                        },
                    },
                },
            },
        }, controller.listJobs);
        // Get generation job statistics (User access)
        api.get('/content/jobs/stats', {
            schema: {
                description: 'Get generation job statistics for the tenant. Includes counts by status and optional analytics.',
                tags: ['Content Generation'],
                response: {
                    200: {
                        description: 'Job statistics',
                        type: 'object',
                        properties: {
                            pending: { type: 'number', description: 'Number of pending jobs' },
                            processing: { type: 'number', description: 'Number of processing jobs' },
                            completed: { type: 'number', description: 'Number of completed jobs' },
                            failed: { type: 'number', description: 'Number of failed jobs' },
                            cancelled: { type: 'number', description: 'Number of cancelled jobs' },
                            total: { type: 'number', description: 'Total number of jobs' },
                            analytics: {
                                type: 'object',
                                description: 'Optional enhanced analytics',
                                properties: {
                                    averageDuration: { type: 'number', description: 'Average job duration in milliseconds' },
                                    successRate: { type: 'number', description: 'Success rate (0-1)' },
                                    averagePlaceholdersFilled: { type: 'number', description: 'Average number of placeholders filled' },
                                    averageTokensUsed: { type: 'number', description: 'Average tokens used per job' },
                                    mostCommonErrors: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                errorCode: { type: 'string' },
                                                count: { type: 'number' },
                                            },
                                        },
                                    },
                                    jobsByTemplate: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                templateId: { type: 'string' },
                                                count: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }, controller.getJobStats);
        // Find stuck generation jobs (Admin only)
        api.get('/content/jobs/stuck', {
            schema: {
                description: 'Find generation jobs stuck in processing status beyond the configured timeout. Admin only.',
                tags: ['Content Generation'],
                response: {
                    200: {
                        description: 'List of stuck jobs',
                        type: 'object',
                        properties: {
                            jobs: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        templateId: { type: 'string' },
                                        status: { type: 'string' },
                                        startedAt: { type: 'string' },
                                        createdAt: { type: 'string' },
                                        duration: { type: 'number', description: 'Duration in milliseconds' },
                                    },
                                },
                            },
                            count: { type: 'number' },
                        },
                    },
                },
            },
        }, controller.findStuckJobs);
        // Mark stuck generation jobs as failed (Admin only)
        api.post('/content/jobs/stuck/mark-failed', {
            schema: {
                description: 'Mark all stuck generation jobs as failed. Admin only.',
                tags: ['Content Generation'],
                response: {
                    200: {
                        description: 'Stuck jobs marked as failed',
                        type: 'object',
                        properties: {
                            jobsMarked: { type: 'number', description: 'Number of jobs marked as failed' },
                            jobIds: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'List of job IDs that were marked as failed',
                            },
                        },
                    },
                },
            },
        }, controller.markStuckJobsAsFailed);
        // Cleanup old generation jobs (Admin only)
        api.post('/content/jobs/cleanup', {
            schema: {
                description: 'Delete old completed, failed, or cancelled generation jobs. Admin only.',
                tags: ['Content Generation'],
                body: {
                    type: 'object',
                    properties: {
                        olderThanDays: {
                            type: 'number',
                            minimum: 1,
                            maximum: 365,
                            default: 30,
                            description: 'Delete jobs older than this many days (default: 30)',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'Old jobs deleted successfully',
                        type: 'object',
                        properties: {
                            jobsDeleted: {
                                type: 'number',
                                description: 'Number of jobs deleted',
                            },
                            olderThanDays: {
                                type: 'number',
                                description: 'Age threshold used',
                            },
                        },
                    },
                },
            },
        }, controller.cleanupOldJobs);
        // Get generation job status (User access)
        api.get('/content/jobs/:jobId', {
            schema: {
                description: 'Get detailed status of a generation job. Users can only access their own jobs.',
                tags: ['Content Generation'],
                params: {
                    type: 'object',
                    required: ['jobId'],
                    properties: {
                        jobId: {
                            type: 'string',
                            description: 'Generation job ID',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'Job status details',
                        type: 'object',
                        properties: {
                            jobId: { type: 'string' },
                            templateId: { type: 'string' },
                            status: {
                                type: 'string',
                                enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
                            },
                            generatedDocumentId: { type: 'string' },
                            generatedDocumentUrl: { type: 'string' },
                            shardId: { type: 'string' },
                            placeholdersFilled: { type: 'number' },
                            placeholdersTotal: { type: 'number' },
                            createdAt: { type: 'string' },
                            startedAt: { type: 'string' },
                            completedAt: { type: 'string' },
                            error: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string' },
                                    code: { type: 'string' },
                                    details: { type: 'object' },
                                },
                            },
                            metadata: {
                                type: 'object',
                                properties: {
                                    model: { type: 'string' },
                                    tokensUsed: { type: 'number' },
                                    duration: { type: 'number' },
                                    generatedAt: { type: 'string' },
                                },
                            },
                        },
                    },
                    404: {
                        description: 'Job not found',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    403: {
                        description: 'Access denied (not job owner)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        }, controller.getJobStatus);
        // Retry a failed generation job (User access - job owner only)
        api.post('/content/jobs/:jobId/retry', {
            schema: {
                description: 'Retry a failed generation job. Resets the job status to pending and clears error information.',
                tags: ['Content Generation'],
                params: {
                    type: 'object',
                    required: ['jobId'],
                    properties: {
                        jobId: {
                            type: 'string',
                            description: 'Generation job ID to retry',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'Job retry initiated successfully',
                        type: 'object',
                        properties: {
                            jobId: { type: 'string' },
                            templateId: { type: 'string' },
                            status: { type: 'string', enum: ['pending'] },
                            message: { type: 'string' },
                        },
                    },
                    400: {
                        description: 'Bad request (job cannot be retried)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    404: {
                        description: 'Job not found',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    403: {
                        description: 'Access denied (not job owner)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        }, controller.retryJob);
        // Cancel generation job (User access - job owner only)
        api.delete('/content/jobs/:jobId', {
            schema: {
                description: 'Cancel a pending or processing generation job. Cleans up any partially created documents.',
                tags: ['Content Generation'],
                params: {
                    type: 'object',
                    required: ['jobId'],
                    properties: {
                        jobId: {
                            type: 'string',
                            description: 'Generation job ID to cancel',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'Job cancelled successfully',
                        type: 'object',
                        properties: {
                            jobId: { type: 'string' },
                            templateId: { type: 'string' },
                            status: { type: 'string', enum: ['cancelled'] },
                            cancelledAt: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    400: {
                        description: 'Bad request (job cannot be cancelled)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    404: {
                        description: 'Job not found',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    403: {
                        description: 'Access denied (not job owner)',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        }, controller.cancelJob);
        // Health check for content generation service
        api.get('/content/health', {
            schema: {
                description: 'Health check for content generation service dependencies',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                            service: { type: 'string' },
                            timestamp: { type: 'string' },
                            checks: {
                                type: 'object',
                                properties: {
                                    serviceBus: {
                                        type: 'object',
                                        properties: {
                                            status: { type: 'string' },
                                            message: { type: 'string' },
                                        },
                                    },
                                    cosmosDb: {
                                        type: 'object',
                                        properties: {
                                            status: { type: 'string' },
                                            message: { type: 'string' },
                                        },
                                    },
                                    overall: { type: 'string', enum: ['healthy', 'unhealthy'] },
                                },
                            },
                        },
                    },
                    503: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            service: { type: 'string' },
                            timestamp: { type: 'string' },
                            error: { type: 'string' },
                        },
                    },
                },
            },
        }, controller.healthCheck);
        // Folder picker endpoints (User access)
        // List Google Drive folders
        api.get('/content/folders/google', {
            schema: {
                description: 'List Google Drive folders for folder picker',
                tags: ['Content Generation'],
                querystring: {
                    type: 'object',
                    properties: {
                        parentId: {
                            type: 'string',
                            description: 'Parent folder ID (default: "root")',
                        },
                        search: {
                            type: 'string',
                            description: 'Search query to filter folder names',
                        },
                        limit: {
                            type: 'string',
                            description: 'Maximum number of folders to return (default: 50, max: 100)',
                        },
                        pageToken: {
                            type: 'string',
                            description: 'Page token for pagination',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'List of Google Drive folders',
                        type: 'object',
                        properties: {
                            folders: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        parentId: { type: 'string', nullable: true },
                                        url: { type: 'string' },
                                        createdAt: { type: 'string', nullable: true },
                                        modifiedAt: { type: 'string', nullable: true },
                                    },
                                },
                            },
                            nextPageToken: { type: 'string' },
                            hasMore: { type: 'boolean' },
                        },
                    },
                },
            },
        }, controller.listGoogleDriveFolders);
        // List OneDrive folders
        api.get('/content/folders/microsoft', {
            schema: {
                description: 'List OneDrive folders for folder picker',
                tags: ['Content Generation'],
                querystring: {
                    type: 'object',
                    properties: {
                        parentId: {
                            type: 'string',
                            description: 'Parent folder ID (default: "root")',
                        },
                        search: {
                            type: 'string',
                            description: 'Search query to filter folder names',
                        },
                        limit: {
                            type: 'string',
                            description: 'Maximum number of folders to return (default: 50, max: 200)',
                        },
                        skip: {
                            type: 'string',
                            description: 'Number of folders to skip for pagination',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'List of OneDrive folders',
                        type: 'object',
                        properties: {
                            folders: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        parentId: { type: 'string', nullable: true },
                                        url: { type: 'string' },
                                        createdAt: { type: 'string', nullable: true },
                                        modifiedAt: { type: 'string', nullable: true },
                                    },
                                },
                            },
                            hasMore: { type: 'boolean' },
                            nextLink: { type: 'string' },
                        },
                    },
                },
            },
        }, controller.listOneDriveFolders);
        // Get folder details
        api.get('/content/folders/:provider/:folderId', {
            schema: {
                description: 'Get folder details for a specific folder',
                tags: ['Content Generation'],
                params: {
                    type: 'object',
                    required: ['provider', 'folderId'],
                    properties: {
                        provider: {
                            type: 'string',
                            enum: ['google', 'microsoft'],
                            description: 'Storage provider',
                        },
                        folderId: {
                            type: 'string',
                            description: 'Folder ID',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'Folder details',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            parentId: { type: 'string', nullable: true },
                            url: { type: 'string' },
                            createdAt: { type: 'string', nullable: true },
                            modifiedAt: { type: 'string', nullable: true },
                            owner: { type: 'string', nullable: true },
                        },
                    },
                },
            },
        }, controller.getFolderDetails);
    });
}
//# sourceMappingURL=document-template.routes.js.map