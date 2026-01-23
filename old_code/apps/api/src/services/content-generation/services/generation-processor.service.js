/**
 * Generation Processor Service
 *
 * Orchestrates the complete document generation process:
 * 1. Generate placeholder content using AI
 * 2. Duplicate source document
 * 3. Replace placeholders in document
 * 4. Insert charts (if any)
 * 5. Create c_document Shard
 *
 * This service is used by Container App workers to process generation jobs
 */
import { GenerationJobRepository } from '../../../repositories/generation-job.repository.js';
import { ChartGenerationService } from './chart-generation.service.js';
import { CredentialEncryptionService } from '../../credential-encryption.service.js';
import { getContentGenerationConfig } from '../config/content-generation.config.js';
import { ShardStatus, ShardSource, SyncStatus, SyncDirection } from '../../../types/shard.types.js';
import { StorageProvider, VisibilityLevel } from '../../../types/document.types.js';
export class GenerationProcessorService {
    monitoring;
    templateService;
    rewriterFactory;
    insightService;
    contextTemplateService;
    shardRepository;
    notificationService;
    jobRepository;
    chartGenerationService;
    encryptionService;
    config;
    constructor(monitoring, templateService, rewriterFactory, insightService, contextTemplateService, shardRepository, notificationService) {
        this.monitoring = monitoring;
        this.templateService = templateService;
        this.rewriterFactory = rewriterFactory;
        this.insightService = insightService;
        this.contextTemplateService = contextTemplateService;
        this.shardRepository = shardRepository;
        this.notificationService = notificationService;
        this.jobRepository = new GenerationJobRepository();
        this.chartGenerationService = new ChartGenerationService(monitoring, shardRepository, insightService);
        // Initialize encryption service for token decryption
        const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default-key-for-dev-only-change-in-prod';
        this.encryptionService = new CredentialEncryptionService(encryptionKey);
        this.config = getContentGenerationConfig();
    }
    /**
     * Process a generation job
     * This is the main entry point for processing generation jobs from Service Bus
     */
    async processJob(job) {
        const startTime = Date.now();
        let generatedDocumentId;
        let generatedDocumentUrl;
        let shardId;
        const errors = [];
        let totalTokensUsed = 0;
        let modelUsed;
        let authToken;
        let generatedValues = {};
        // Update job status to processing and set startedAt timestamp
        const processingStartTime = Date.now();
        const processingStartTimeISO = new Date(processingStartTime).toISOString();
        try {
            await this.jobRepository.update(job.id, job.tenantId, {
                status: 'processing',
                startedAt: processingStartTimeISO,
            });
            // Update local job object to reflect the new startedAt timestamp
            job.startedAt = processingStartTimeISO;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'generation.update_status',
                jobId: job.id,
                status: 'processing',
            });
            // Continue processing even if status update fails
            // Use current time as fallback for startedAt
            job.startedAt = processingStartTimeISO;
        }
        try {
            // Validate required job fields
            if (!job.id || job.id.trim().length === 0) {
                const errorMessage = 'Generation job is missing job ID. The job may be corrupted.';
                this.monitoring.trackEvent('content_generation.job.missing_id', {
                    templateId: job.templateId || 'unknown',
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            if (!job.templateId || job.templateId.trim().length === 0) {
                const errorMessage = `Generation job "${job.id}" is missing template ID. The job may be corrupted.`;
                this.monitoring.trackEvent('content_generation.job.missing_template_id', {
                    jobId: job.id,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            if (!job.tenantId || job.tenantId.trim().length === 0) {
                const errorMessage = `Generation job "${job.id}" is missing tenant ID. The job may be corrupted.`;
                this.monitoring.trackEvent('content_generation.job.missing_tenant_id', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            if (!job.userId || job.userId.trim().length === 0) {
                const errorMessage = `Generation job "${job.id}" is missing user ID. The job may be corrupted.`;
                this.monitoring.trackEvent('content_generation.job.missing_user_id', {
                    jobId: job.id,
                    templateId: job.templateId,
                    tenantId: job.tenantId,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            // Validate maxRetries is within valid range (0-10)
            if (typeof job.maxRetries !== 'number' || job.maxRetries < 0 || job.maxRetries > 10) {
                const errorMessage = `Generation job "${job.id}" has invalid maxRetries value: ${job.maxRetries}. Must be between 0 and 10.`;
                this.monitoring.trackEvent('content_generation.job.invalid_max_retries', {
                    jobId: job.id,
                    templateId: job.templateId,
                    maxRetries: job.maxRetries,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            // Validate retryCount is non-negative
            if (typeof job.retryCount !== 'number' || job.retryCount < 0) {
                const errorMessage = `Generation job "${job.id}" has invalid retryCount value: ${job.retryCount}. Must be non-negative.`;
                this.monitoring.trackEvent('content_generation.job.invalid_retry_count', {
                    jobId: job.id,
                    templateId: job.templateId,
                    retryCount: job.retryCount,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            // Validate createdAt is a valid ISO 8601 date
            if (!job.createdAt) {
                const errorMessage = `Generation job "${job.id}" is missing createdAt timestamp. The job may be corrupted.`;
                this.monitoring.trackEvent('content_generation.job.missing_created_at', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            const createdAtDate = new Date(job.createdAt);
            if (isNaN(createdAtDate.getTime())) {
                const errorMessage = `Generation job "${job.id}" has invalid createdAt timestamp: ${job.createdAt}. Must be a valid ISO 8601 date.`;
                this.monitoring.trackEvent('content_generation.job.invalid_created_at', {
                    jobId: job.id,
                    templateId: job.templateId,
                    createdAt: job.createdAt,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            // Check if job has exceeded timeout (if startedAt is available, use it; otherwise use createdAt)
            const jobStartTime = job.startedAt ? new Date(job.startedAt).getTime() : createdAtDate.getTime();
            const elapsedTime = Date.now() - jobStartTime;
            const timeoutMs = this.config.jobTimeoutMs || 300000; // Default 5 minutes
            if (elapsedTime > timeoutMs) {
                const errorMessage = `Generation job "${job.id}" has exceeded the maximum timeout of ${timeoutMs}ms (elapsed: ${elapsedTime}ms). The job may be stuck or taking too long.`;
                this.monitoring.trackEvent('content_generation.job.timeout_exceeded', {
                    jobId: job.id,
                    templateId: job.templateId,
                    elapsedTime,
                    timeoutMs,
                    startedAt: job.startedAt || job.createdAt,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_TIMEOUT';
                throw error;
            }
            // Check if job was cancelled before processing
            const currentJob = await this.jobRepository.findById(job.id, job.tenantId);
            if (currentJob?.status === 'cancelled') {
                this.monitoring.trackEvent('content_generation.job.cancelled_before_processing', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                return {
                    jobId: job.id,
                    templateId: job.templateId,
                    status: 'cancelled',
                    placeholdersFilled: 0,
                    placeholdersTotal: 0,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                    },
                };
            }
            // 1. Get template (if not provided in job)
            const template = job.template || await this.templateService.getTemplate(job.templateId, job.tenantId);
            if (!template) {
                // Template was deleted after job was queued
                const errorMessage = `Template "${job.templateId}" not found. The template may have been deleted after the generation job was created.`;
                this.monitoring.trackEvent('content_generation.template.not_found_during_processing', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                // Create error with proper code for classification
                const error = new Error(errorMessage);
                error.code = 'TEMPLATE_NOT_FOUND';
                throw error;
            }
            // Check if template is still active (may have been archived after job was queued)
            if (template.status !== 'active') {
                const statusMessage = template.status === 'archived'
                    ? 'archived'
                    : template.status === 'draft'
                        ? 'in draft status'
                        : `in ${template.status} status`;
                const errorMessage = `Template "${template.name || job.templateId}" is ${statusMessage} and cannot be used for generation. ` +
                    `Only active templates can generate documents. The template may have been archived or deactivated after the job was queued.`;
                this.monitoring.trackEvent('content_generation.template.inactive_during_processing', {
                    jobId: job.id,
                    templateId: job.templateId,
                    templateName: template.name,
                    templateStatus: template.status,
                });
                // Create error with proper code for classification
                const error = new Error(errorMessage);
                error.code = 'TEMPLATE_NOT_ACTIVE';
                throw error;
            }
            // Validate required template fields
            if (!template.sourceDocumentId || template.sourceDocumentId.trim().length === 0) {
                const errorMessage = `Template "${template.name || job.templateId}" is missing source document ID. The template may be corrupted.`;
                this.monitoring.trackEvent('content_generation.template.missing_source_document', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                const error = new Error(errorMessage);
                error.code = 'TEMPLATE_INVALID';
                throw error;
            }
            if (!Array.isArray(template.placeholders)) {
                const errorMessage = `Template "${template.name || job.templateId}" has invalid placeholders array. The template may be corrupted.`;
                this.monitoring.trackEvent('content_generation.template.invalid_placeholders', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                const error = new Error(errorMessage);
                error.code = 'TEMPLATE_INVALID';
                throw error;
            }
            if (!Array.isArray(template.placeholderConfigs)) {
                const errorMessage = `Template "${template.name || job.templateId}" has invalid placeholderConfigs array. The template may be corrupted.`;
                this.monitoring.trackEvent('content_generation.template.invalid_placeholder_configs', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                const error = new Error(errorMessage);
                error.code = 'TEMPLATE_INVALID';
                throw error;
            }
            // Validate document format
            const validFormats = ['google_docs', 'google_slides', 'word', 'powerpoint'];
            if (!template.documentFormat || !validFormats.includes(template.documentFormat)) {
                const errorMessage = `Template "${template.name || job.templateId}" has invalid or unsupported document format: "${template.documentFormat}". Supported formats: ${validFormats.join(', ')}.`;
                this.monitoring.trackEvent('content_generation.template.invalid_document_format', {
                    jobId: job.id,
                    templateId: job.templateId,
                    documentFormat: template.documentFormat,
                });
                const error = new Error(errorMessage);
                error.code = 'TEMPLATE_INVALID';
                throw error;
            }
            // Validate destination folder ID
            if (!job.destinationFolderId || job.destinationFolderId.trim().length === 0) {
                const errorMessage = `Generation job "${job.id}" has invalid destination folder ID. The job may be corrupted.`;
                this.monitoring.trackEvent('content_generation.job.invalid_destination_folder', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            // Validate destination provider
            const validProviders = ['google', 'microsoft'];
            if (!job.destinationProvider || !validProviders.includes(job.destinationProvider)) {
                const errorMessage = `Generation job "${job.id}" has invalid destination provider: "${job.destinationProvider}". Valid providers: ${validProviders.join(', ')}.`;
                this.monitoring.trackEvent('content_generation.job.invalid_destination_provider', {
                    jobId: job.id,
                    templateId: job.templateId,
                    destinationProvider: job.destinationProvider,
                });
                const error = new Error(errorMessage);
                error.code = 'JOB_INVALID';
                throw error;
            }
            // Validate that template format matches destination provider
            // Google templates (google_docs, google_slides) must go to Google Drive
            // Microsoft templates (word, powerpoint) must go to OneDrive
            const isGoogleTemplate = template.documentFormat === 'google_docs' || template.documentFormat === 'google_slides';
            const isMicrosoftTemplate = template.documentFormat === 'word' || template.documentFormat === 'powerpoint';
            if (isGoogleTemplate && job.destinationProvider !== 'google') {
                const errorMessage = `Template format "${template.documentFormat}" requires Google Drive as destination, but job specifies "${job.destinationProvider}". The job may have been created with invalid parameters.`;
                this.monitoring.trackEvent('content_generation.job.provider_mismatch', {
                    jobId: job.id,
                    templateId: job.templateId,
                    templateFormat: template.documentFormat,
                    destinationProvider: job.destinationProvider,
                    requiredProvider: 'google',
                });
                const error = new Error(errorMessage);
                error.code = 'PROVIDER_MISMATCH';
                throw error;
            }
            if (isMicrosoftTemplate && job.destinationProvider !== 'microsoft') {
                const errorMessage = `Template format "${template.documentFormat}" requires OneDrive (Microsoft) as destination, but job specifies "${job.destinationProvider}". The job may have been created with invalid parameters.`;
                this.monitoring.trackEvent('content_generation.job.provider_mismatch', {
                    jobId: job.id,
                    templateId: job.templateId,
                    templateFormat: template.documentFormat,
                    destinationProvider: job.destinationProvider,
                    requiredProvider: 'microsoft',
                });
                const error = new Error(errorMessage);
                error.code = 'PROVIDER_MISMATCH';
                throw error;
            }
            // 2. Parse user token
            authToken = this.parseAuthToken(job.userToken, job);
            // 3. Generate content for all placeholders
            generatedValues = {};
            const generatedCharts = {};
            // Helper to check if job was cancelled
            const checkCancelled = async () => {
                const currentJob = await this.jobRepository.findById(job.id, job.tenantId);
                return currentJob?.status === 'cancelled';
            };
            for (const placeholder of template.placeholders || []) {
                // Check if job has exceeded timeout during processing
                const currentElapsedTime = Date.now() - jobStartTime;
                if (currentElapsedTime > timeoutMs) {
                    const errorMessage = `Generation job "${job.id}" exceeded timeout during placeholder generation (elapsed: ${currentElapsedTime}ms, timeout: ${timeoutMs}ms).`;
                    this.monitoring.trackEvent('content_generation.job.timeout_during_processing', {
                        jobId: job.id,
                        templateId: job.templateId,
                        elapsedTime: currentElapsedTime,
                        timeoutMs,
                        placeholderName: placeholder.name,
                        placeholdersProcessed: Object.keys(generatedValues).length,
                    });
                    const error = new Error(errorMessage);
                    error.code = 'JOB_TIMEOUT';
                    throw error;
                }
                // Check if job was cancelled before processing each placeholder
                if (await checkCancelled()) {
                    this.monitoring.trackEvent('content_generation.job.cancelled_during_processing', {
                        jobId: job.id,
                        templateId: job.templateId,
                        placeholdersProcessed: Object.keys(generatedValues).length,
                    });
                    // Cleanup: Delete partially created document if it exists
                    if (generatedDocumentId && authToken) {
                        try {
                            const rewriter = await this.rewriterFactory.createRewriter(template.documentFormat);
                            await rewriter.deleteDocument(generatedDocumentId, authToken);
                        }
                        catch (cleanupError) {
                            this.monitoring.trackException(cleanupError, {
                                operation: 'generation.cleanup_on_cancel',
                                jobId: job.id,
                            });
                        }
                    }
                    return {
                        jobId: job.id,
                        templateId: job.templateId,
                        status: 'cancelled',
                        placeholdersFilled: Object.keys(generatedValues).length,
                        placeholdersTotal: template.placeholders?.length || 0,
                        metadata: {
                            generatedAt: new Date().toISOString(),
                        },
                    };
                }
                try {
                    // Check if placeholder should be skipped
                    if (job.options?.skipPlaceholders?.includes(placeholder.name)) {
                        this.monitoring.trackEvent('content_generation.placeholder.skipped', {
                            jobId: job.id,
                            placeholderName: placeholder.name,
                            reason: 'user_requested',
                        });
                        continue;
                    }
                    // Check for manual override
                    if (job.context?.variables?.[placeholder.name]) {
                        // Check if it's a chart placeholder (manual override for charts would be image data)
                        if (placeholder.type === 'chart') {
                            // For charts, manual override would need to be a base64 image or URL
                            // This is a future enhancement
                            this.monitoring.trackEvent('content_generation.chart.manual_override_skipped', {
                                placeholderName: placeholder.name,
                            });
                        }
                        else {
                            generatedValues[placeholder.name] = job.context.variables[placeholder.name];
                        }
                        continue;
                    }
                    // Get placeholder configuration
                    const config = template.placeholderConfigs.find(c => c.placeholderName === placeholder.name);
                    if (!config) {
                        this.monitoring.trackEvent('content_generation.placeholder.skipped', {
                            jobId: job.id,
                            placeholderName: placeholder.name,
                            reason: 'not_configured',
                        });
                        continue;
                    }
                    // Handle chart placeholders separately
                    if (placeholder.type === 'chart' || config.typeOverride === 'chart') {
                        const chartImage = await this.chartGenerationService.generateChart(placeholder, config, template, job.context);
                        if (chartImage) {
                            generatedCharts[placeholder.name] = chartImage;
                        }
                        else {
                            errors.push({
                                placeholderName: placeholder.name,
                                error: 'Chart generation failed or returned no data',
                            });
                        }
                        continue;
                    }
                    // Generate text content using InsightService
                    const generated = await this.generatePlaceholderContent(job.tenantId, job.userId, placeholder, config, template, job.context);
                    generatedValues[placeholder.name] = generated.value;
                    totalTokensUsed += generated.tokensUsed || 0;
                    if (generated.model && !modelUsed) {
                        modelUsed = generated.model;
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push({
                        placeholderName: placeholder.name,
                        error: errorMessage,
                    });
                    this.monitoring.trackException(error, {
                        operation: 'generation.generatePlaceholder',
                        jobId: job.id,
                        placeholderName: placeholder.name,
                    });
                }
            }
            // Calculate placeholder generation statistics
            const totalPlaceholders = template.placeholders?.length || 0;
            const skippedPlaceholders = (job.options?.skipPlaceholders?.length || 0) +
                (Object.keys(job.context?.variables || {}).length || 0);
            const attemptedPlaceholders = totalPlaceholders - skippedPlaceholders;
            const successfulPlaceholders = Object.keys(generatedValues).length + Object.keys(generatedCharts).length;
            const failedPlaceholders = errors.length;
            const failureRate = attemptedPlaceholders > 0 ? (failedPlaceholders / attemptedPlaceholders) : 0;
            // Validate that at least some placeholders were successfully generated
            if (successfulPlaceholders === 0 && attemptedPlaceholders > 0) {
                const errorMessage = `Generation job "${job.id}" failed: No placeholders were successfully generated. All ${attemptedPlaceholders} attempted placeholders failed.`;
                this.monitoring.trackEvent('content_generation.job.all_placeholders_failed', {
                    jobId: job.id,
                    templateId: job.templateId,
                    totalPlaceholders,
                    attemptedPlaceholders,
                    failedPlaceholders,
                    skippedPlaceholders,
                });
                const error = new Error(errorMessage);
                error.code = 'ALL_PLACEHOLDERS_FAILED';
                throw error;
            }
            // Warn if failure rate is too high (> 50%)
            if (failureRate > 0.5 && attemptedPlaceholders > 0) {
                this.monitoring.trackEvent('content_generation.job.high_failure_rate', {
                    jobId: job.id,
                    templateId: job.templateId,
                    totalPlaceholders,
                    attemptedPlaceholders,
                    successfulPlaceholders,
                    failedPlaceholders,
                    failureRate: Math.round(failureRate * 100) / 100,
                    warning: 'More than 50% of placeholders failed to generate',
                });
            }
            // Check if job was cancelled before document operations
            if (await checkCancelled()) {
                this.monitoring.trackEvent('content_generation.job.cancelled_before_document_ops', {
                    jobId: job.id,
                    templateId: job.templateId,
                    placeholdersProcessed: Object.keys(generatedValues).length,
                });
                return {
                    jobId: job.id,
                    templateId: job.templateId,
                    status: 'cancelled',
                    placeholdersFilled: Object.keys(generatedValues).length,
                    placeholdersTotal: template.placeholders?.length || 0,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                    },
                };
            }
            // 4. Get rewriter for document format
            const rewriter = await this.rewriterFactory.createRewriter(template.documentFormat);
            // 5. Duplicate document to user's folder
            const newDocumentName = `${template.name} - ${new Date().toISOString().split('T')[0]}`;
            let duplicateResult;
            try {
                duplicateResult = await rewriter.duplicateDocument(template.sourceDocumentId, newDocumentName, job.destinationFolderId, authToken);
                // Validate duplicate result
                if (!duplicateResult) {
                    const errorMessage = `Document duplication returned null or undefined result. The duplication operation may have failed silently.`;
                    this.monitoring.trackEvent('content_generation.duplication.invalid_result', {
                        jobId: job.id,
                        templateId: job.templateId,
                        sourceDocumentId: template.sourceDocumentId,
                        destinationFolderId: job.destinationFolderId,
                    });
                    const error = new Error(errorMessage);
                    error.code = 'DUPLICATION_FAILED';
                    throw error;
                }
                if (!duplicateResult.documentId || duplicateResult.documentId.trim().length === 0) {
                    const errorMessage = `Document duplication returned invalid document ID. The duplication operation may have failed.`;
                    this.monitoring.trackEvent('content_generation.duplication.invalid_document_id', {
                        jobId: job.id,
                        templateId: job.templateId,
                        sourceDocumentId: template.sourceDocumentId,
                        destinationFolderId: job.destinationFolderId,
                    });
                    const error = new Error(errorMessage);
                    error.code = 'DUPLICATION_FAILED';
                    throw error;
                }
                if (!duplicateResult.url || duplicateResult.url.trim().length === 0) {
                    const errorMessage = `Document duplication returned invalid document URL. The duplication operation may have failed.`;
                    this.monitoring.trackEvent('content_generation.duplication.invalid_document_url', {
                        jobId: job.id,
                        templateId: job.templateId,
                        sourceDocumentId: template.sourceDocumentId,
                        destinationFolderId: job.destinationFolderId,
                        documentId: duplicateResult.documentId,
                    });
                    const error = new Error(errorMessage);
                    error.code = 'DUPLICATION_FAILED';
                    throw error;
                }
                generatedDocumentId = duplicateResult.documentId;
                generatedDocumentUrl = duplicateResult.url;
            }
            catch (duplicateError) {
                // If duplication fails, we can't proceed - throw immediately
                // Check if it's already an Error with a code, otherwise wrap it
                if (duplicateError instanceof Error && duplicateError.code) {
                    throw duplicateError;
                }
                const error = new Error(`Failed to duplicate document: ${duplicateError.message}`);
                error.code = 'DUPLICATION_FAILED';
                throw error;
            }
            // Check if job was cancelled after document duplication
            if (await checkCancelled()) {
                this.monitoring.trackEvent('content_generation.job.cancelled_after_duplication', {
                    jobId: job.id,
                    templateId: job.templateId,
                    documentId: generatedDocumentId,
                });
                // Cleanup: Delete duplicated document
                if (generatedDocumentId && authToken) {
                    try {
                        await rewriter.deleteDocument(generatedDocumentId, authToken);
                    }
                    catch (cleanupError) {
                        this.monitoring.trackException(cleanupError, {
                            operation: 'generation.cleanup_after_cancel',
                            jobId: job.id,
                            documentId: generatedDocumentId,
                        });
                    }
                }
                return {
                    jobId: job.id,
                    templateId: job.templateId,
                    status: 'cancelled',
                    placeholdersFilled: Object.keys(generatedValues).length,
                    placeholdersTotal: template.placeholders?.length || 0,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                    },
                };
            }
            // 6. Replace placeholders in document
            // Filter out empty, null, or undefined values before replacement
            const validGeneratedValues = {};
            for (const [key, value] of Object.entries(generatedValues)) {
                // Only include non-empty string values
                if (value && typeof value === 'string' && value.trim().length > 0) {
                    validGeneratedValues[key] = value;
                }
                else {
                    // Log warning for invalid values
                    this.monitoring.trackEvent('content_generation.placeholder.invalid_value_skipped', {
                        jobId: job.id,
                        templateId: job.templateId,
                        placeholderName: key,
                        valueType: typeof value,
                        valueLength: value ? String(value).length : 0,
                    });
                }
            }
            if (Object.keys(validGeneratedValues).length > 0) {
                await rewriter.replacePlaceholders(generatedDocumentId, template, validGeneratedValues, authToken);
                // Check if job was cancelled after placeholder replacement
                if (await checkCancelled()) {
                    this.monitoring.trackEvent('content_generation.job.cancelled_after_replacement', {
                        jobId: job.id,
                        templateId: job.templateId,
                        documentId: generatedDocumentId,
                        placeholdersReplaced: Object.keys(validGeneratedValues).length,
                    });
                    // Cleanup: Delete partially processed document
                    if (generatedDocumentId && authToken) {
                        try {
                            await rewriter.deleteDocument(generatedDocumentId, authToken);
                        }
                        catch (cleanupError) {
                            this.monitoring.trackException(cleanupError, {
                                operation: 'generation.cleanup_after_cancel',
                                jobId: job.id,
                                documentId: generatedDocumentId,
                            });
                        }
                    }
                    return {
                        jobId: job.id,
                        templateId: job.templateId,
                        status: 'cancelled',
                        placeholdersFilled: Object.keys(generatedValues).length,
                        placeholdersTotal: template.placeholders?.length || 0,
                        metadata: {
                            generatedAt: new Date().toISOString(),
                        },
                    };
                }
            }
            // 7. Insert charts (if any)
            if (Object.keys(generatedCharts).length > 0) {
                await rewriter.insertCharts(generatedDocumentId, template, generatedCharts, authToken);
                // Check if job was cancelled after chart insertion
                if (await checkCancelled()) {
                    this.monitoring.trackEvent('content_generation.job.cancelled_after_charts', {
                        jobId: job.id,
                        templateId: job.templateId,
                        documentId: generatedDocumentId,
                        chartsInserted: Object.keys(generatedCharts).length,
                    });
                    // Note: We don't cleanup here since charts are already inserted
                    // The document is mostly complete, so we'll let it finish
                    // But we still return cancelled status
                    return {
                        jobId: job.id,
                        templateId: job.templateId,
                        status: 'cancelled',
                        placeholdersFilled: Object.keys(generatedValues).length,
                        placeholdersTotal: template.placeholders?.length || 0,
                        metadata: {
                            generatedAt: new Date().toISOString(),
                        },
                    };
                }
            }
            // 8. Validate that document was successfully created
            if (!generatedDocumentId || generatedDocumentId.trim().length === 0) {
                const errorMessage = `Document generation failed: generatedDocumentId is missing. The document duplication may have failed silently.`;
                this.monitoring.trackEvent('content_generation.document.missing_document_id', {
                    jobId: job.id,
                    templateId: job.templateId,
                    sourceDocumentId: template.sourceDocumentId,
                    destinationFolderId: job.destinationFolderId,
                });
                const error = new Error(errorMessage);
                error.code = 'DOCUMENT_CREATION_FAILED';
                throw error;
            }
            if (!generatedDocumentUrl || generatedDocumentUrl.trim().length === 0) {
                const errorMessage = `Document generation failed: generatedDocumentUrl is missing. The document duplication may have failed silently.`;
                this.monitoring.trackEvent('content_generation.document.missing_document_url', {
                    jobId: job.id,
                    templateId: job.templateId,
                    sourceDocumentId: template.sourceDocumentId,
                    destinationFolderId: job.destinationFolderId,
                    documentId: generatedDocumentId,
                });
                const error = new Error(errorMessage);
                error.code = 'DOCUMENT_CREATION_FAILED';
                throw error;
            }
            // 9. Get folder path (optional - may fail, but we continue anyway)
            let folderPath;
            try {
                folderPath = await rewriter.getFolderPath(job.destinationFolderId, authToken);
                // Validate folderPath if it was returned
                if (folderPath !== undefined && (folderPath === null || (typeof folderPath === 'string' && folderPath.trim().length === 0))) {
                    this.monitoring.trackEvent('content_generation.folder_path.invalid', {
                        jobId: job.id,
                        templateId: job.templateId,
                        destinationFolderId: job.destinationFolderId,
                        folderPath: String(folderPath),
                    });
                    folderPath = undefined; // Treat as missing
                }
            }
            catch (folderPathError) {
                // Folder path retrieval is non-critical - log but continue
                this.monitoring.trackException(folderPathError, {
                    operation: 'generation.get_folder_path',
                    jobId: job.id,
                    templateId: job.templateId,
                    destinationFolderId: job.destinationFolderId,
                    warning: 'Folder path retrieval failed, but continuing with shard creation',
                });
                folderPath = undefined; // Continue without folder path
            }
            // 10. Check if job was cancelled before shard creation
            if (await checkCancelled()) {
                this.monitoring.trackEvent('content_generation.job.cancelled_before_shard_creation', {
                    jobId: job.id,
                    templateId: job.templateId,
                    documentId: generatedDocumentId,
                });
                // Cleanup: Delete generated document
                if (generatedDocumentId && authToken) {
                    try {
                        await rewriter.deleteDocument(generatedDocumentId, authToken);
                    }
                    catch (cleanupError) {
                        this.monitoring.trackException(cleanupError, {
                            operation: 'generation.cleanup_after_cancel',
                            jobId: job.id,
                            documentId: generatedDocumentId,
                        });
                    }
                }
                return {
                    jobId: job.id,
                    templateId: job.templateId,
                    status: 'cancelled',
                    placeholdersFilled: Object.keys(generatedValues).length,
                    placeholdersTotal: template.placeholders?.length || 0,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                    },
                };
            }
            // 11. Create c_document Shard
            // For externally stored documents (Google Drive/OneDrive), we use AZURE as placeholder
            // and store external document info in external_relationships
            const structuredData = {
                name: newDocumentName,
                description: `Generated from template: ${template.name}`,
                documentType: 'generated',
                mimeType: this.getMimeTypeForFormat(template.documentFormat),
                fileSize: 0, // Document is stored externally, size unknown
                storageProvider: StorageProvider.AZURE, // Placeholder - document is actually external
                // For external documents, storagePath indicates it's external
                // Format: "external/{provider}/{documentId}"
                storagePath: `external/${job.destinationProvider}/${generatedDocumentId}`,
                tags: [`template:${template.id}`, 'generated'],
                visibility: VisibilityLevel.INTERNAL, // Default visibility for generated documents
                version: 1,
                versionHistory: [
                    {
                        version: 1,
                        uploadedAt: new Date(),
                        uploadedBy: job.userId,
                        fileSize: 0,
                        mimeType: this.getMimeTypeForFormat(template.documentFormat),
                        storageProvider: StorageProvider.AZURE,
                        storagePath: `external/${job.destinationProvider}/${generatedDocumentId}`,
                    },
                ],
                uploadedBy: job.userId,
                uploadedAt: new Date(),
            };
            // Create external relationship for the document stored in Google Drive/OneDrive
            const externalSystem = job.destinationProvider === 'google' ? 'google-drive' : 'onedrive';
            const shardData = {
                tenantId: job.tenantId,
                userId: job.userId,
                shardTypeId: 'c_document',
                structuredData,
                status: ShardStatus.ACTIVE,
                source: ShardSource.API,
                // Store external document relationship
                external_relationships: [
                    {
                        externalId: generatedDocumentId,
                        system: externalSystem,
                        systemType: 'storage',
                        label: newDocumentName,
                        syncStatus: SyncStatus.SYNCED,
                        syncDirection: SyncDirection.INBOUND,
                        lastSyncedAt: new Date(),
                        createdAt: new Date(),
                        metadata: {
                            documentUrl: generatedDocumentUrl,
                            folderPath,
                            folderId: job.destinationFolderId,
                            templateId: template.id,
                            templateName: template.name,
                            generatedAt: new Date().toISOString(),
                            placeholdersFilled: Object.keys(generatedValues).length,
                            placeholdersTotal: template.placeholders?.length || 0,
                        },
                    },
                ],
                // Store additional generation metadata in unstructuredData
                unstructuredData: {
                    rawData: {
                        rawMetadata: {
                            documentUrl: generatedDocumentUrl,
                            externalDocumentId: generatedDocumentId,
                            folderPath,
                            templateId: template.id,
                            templateName: template.name,
                            generatedAt: new Date().toISOString(),
                            placeholdersFilled: Object.keys(generatedValues).length,
                            placeholdersTotal: template.placeholders?.length || 0,
                            destinationProvider: job.destinationProvider,
                            destinationFolderId: job.destinationFolderId,
                        },
                    },
                },
            };
            // Create c_document Shard (non-critical - document already exists in external storage)
            let shardCreationError = null;
            try {
                const shard = await this.shardRepository.create(shardData);
                shardId = shard.id;
            }
            catch (shardError) {
                // Shard creation failure is non-critical - document was successfully created in external storage
                // Log the error but continue with job completion
                shardCreationError = shardError;
                this.monitoring.trackException(shardCreationError, {
                    operation: 'generation.create_shard',
                    jobId: job.id,
                    documentId: generatedDocumentId,
                    warning: 'Document was successfully created in external storage, but Shard creation failed',
                });
                this.monitoring.trackEvent('content_generation.shard_creation_failed', {
                    jobId: job.id,
                    documentId: generatedDocumentId,
                    documentUrl: generatedDocumentUrl,
                    error: shardCreationError.message,
                });
            }
            const duration = Date.now() - startTime;
            // Final check: Ensure job was not cancelled before marking as completed
            if (await checkCancelled()) {
                this.monitoring.trackEvent('content_generation.job.cancelled_before_completion', {
                    jobId: job.id,
                    templateId: job.templateId,
                    documentId: generatedDocumentId,
                    shardId: shardId || undefined,
                });
                // Cleanup: Delete generated document
                if (generatedDocumentId && authToken) {
                    try {
                        await rewriter.deleteDocument(generatedDocumentId, authToken);
                    }
                    catch (cleanupError) {
                        this.monitoring.trackException(cleanupError, {
                            operation: 'generation.cleanup_after_cancel',
                            jobId: job.id,
                            documentId: generatedDocumentId,
                        });
                    }
                }
                return {
                    jobId: job.id,
                    templateId: job.templateId,
                    status: 'cancelled',
                    placeholdersFilled: Object.keys(generatedValues).length,
                    placeholdersTotal: template.placeholders?.length || 0,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                    },
                };
            }
            // Update job status to completed with detailed results
            try {
                await this.jobRepository.update(job.id, job.tenantId, {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    // Store generation results for easy retrieval
                    generatedDocumentId,
                    generatedDocumentUrl,
                    shardId: shardId || undefined, // May be undefined if Shard creation failed
                    placeholdersFilled: Object.keys(generatedValues).length,
                    resultMetadata: {
                        model: modelUsed,
                        tokensUsed: totalTokensUsed,
                        duration,
                        ...(shardCreationError && {
                            shardCreationFailed: true,
                            shardCreationError: shardCreationError.message,
                        }),
                    },
                });
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'generation.update_status',
                    jobId: job.id,
                    status: 'completed',
                });
                // Continue even if status update fails
            }
            this.monitoring.trackEvent('content_generation.job.completed', {
                jobId: job.id,
                templateId: template.id,
                documentId: generatedDocumentId,
                shardId: shardId || undefined,
                shardCreationFailed: shardCreationError !== null,
                duration,
                tokensUsed: totalTokensUsed,
                placeholdersFilled: Object.keys(generatedValues).length,
                errors: errors.length,
                requestId: job.requestId, // Include request ID for traceability
            });
            // Send success notification if requested and service available
            if (job.options?.notifyOnComplete && this.notificationService) {
                try {
                    await this.notificationService.createSystemNotification({
                        tenantId: job.tenantId,
                        userId: job.userId,
                        name: 'Document generation completed',
                        content: `Template "${template.name}" has been generated successfully.`,
                        link: generatedDocumentUrl ? generatedDocumentUrl : undefined,
                        type: 'success',
                        metadata: {
                            source: 'content_generation',
                            jobId: job.id,
                            templateId: template.id,
                            templateName: template.name,
                            generatedDocumentId,
                            documentUrl: generatedDocumentUrl,
                            shardId: shardId || undefined,
                            shardCreationFailed: shardCreationError !== null,
                            placeholdersFilled: Object.keys(generatedValues).length,
                            placeholdersTotal: template.placeholders?.length || 0,
                            eventType: 'content_generation.completed',
                        },
                    });
                }
                catch (notificationError) {
                    // Log but don't fail the job if notification fails
                    this.monitoring.trackException(notificationError, {
                        operation: 'generation.send_notification',
                        jobId: job.id,
                        notificationType: 'success',
                    });
                }
            }
            return {
                jobId: job.id,
                templateId: job.templateId,
                status: 'completed',
                generatedDocumentId,
                generatedDocumentUrl,
                shardId,
                placeholdersFilled: Object.keys(generatedValues).length,
                placeholdersTotal: template.placeholders?.length || 0,
                errors: errors.length > 0 ? errors : undefined,
                metadata: {
                    model: modelUsed,
                    tokensUsed: totalTokensUsed,
                    duration,
                    generatedAt: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Cleanup: Delete partially created document if it exists
            if (generatedDocumentId && authToken) {
                try {
                    const template = job.template || await this.templateService.getTemplate(job.templateId, job.tenantId);
                    if (template) {
                        const rewriter = await this.rewriterFactory.createRewriter(template.documentFormat);
                        await rewriter.deleteDocument(generatedDocumentId, authToken);
                        this.monitoring.trackEvent('content_generation.cleanup.deleted_document', {
                            jobId: job.id,
                            documentId: generatedDocumentId,
                            reason: 'generation_failed',
                        });
                    }
                }
                catch (cleanupError) {
                    // Log cleanup failure but don't fail the job update
                    this.monitoring.trackException(cleanupError, {
                        operation: 'generation.cleanup',
                        jobId: job.id,
                        documentId: generatedDocumentId,
                    });
                }
            }
            // Update job status to failed and increment retry count
            try {
                const currentJob = await this.jobRepository.findById(job.id, job.tenantId);
                const newRetryCount = (currentJob?.retryCount || 0) + 1;
                // Determine if error is recoverable (should retry) or permanent (should fail immediately)
                const isRecoverable = this.isRecoverableError(error);
                const shouldRetry = isRecoverable && newRetryCount < job.maxRetries;
                await this.jobRepository.update(job.id, job.tenantId, {
                    status: shouldRetry ? 'pending' : 'failed', // Retry only if recoverable and under max
                    retryCount: newRetryCount,
                    completedAt: shouldRetry ? undefined : new Date().toISOString(),
                    error: {
                        message: errorMessage,
                        code: error?.code || this.getErrorCode(error),
                        details: error?.details,
                    },
                });
                // If we're under max retries and error is recoverable, the job will be retried by Service Bus
                if (shouldRetry) {
                    this.monitoring.trackEvent('content_generation.job.will_retry', {
                        jobId: job.id,
                        retryCount: newRetryCount,
                        maxRetries: job.maxRetries,
                        errorCode: this.getErrorCode(error),
                    });
                }
                else if (!isRecoverable) {
                    this.monitoring.trackEvent('content_generation.job.permanent_failure', {
                        jobId: job.id,
                        errorCode: this.getErrorCode(error),
                        reason: 'non_recoverable_error',
                    });
                }
            }
            catch (updateError) {
                this.monitoring.trackException(updateError, {
                    operation: 'generation.update_status',
                    jobId: job.id,
                    status: 'failed',
                });
                // Continue even if status update fails
            }
            this.monitoring.trackException(error, {
                operation: 'generation.processJob',
                jobId: job.id,
                duration,
            });
            // Send error notification if requested and service available
            if (job.options?.notifyOnComplete && this.notificationService) {
                try {
                    const template = job.template || await this.templateService.getTemplate(job.templateId, job.tenantId);
                    const templateName = template?.name || 'Unknown template';
                    await this.notificationService.createSystemNotification({
                        tenantId: job.tenantId,
                        userId: job.userId,
                        name: 'Document generation failed',
                        content: `Template "${templateName}" generation failed: ${errorMessage}`,
                        link: undefined,
                        type: 'error',
                        metadata: {
                            source: 'content_generation',
                            jobId: job.id,
                            templateId: job.templateId,
                            templateName,
                            error: errorMessage,
                            errorCode: error?.code || 'PROCESSING_ERROR',
                            eventType: 'content_generation.failed',
                        },
                    });
                }
                catch (notificationError) {
                    // Log but don't fail the job if notification fails
                    this.monitoring.trackException(notificationError, {
                        operation: 'generation.send_notification',
                        jobId: job.id,
                        notificationType: 'error',
                    });
                }
            }
            return {
                jobId: job.id,
                templateId: job.templateId,
                status: 'failed',
                placeholdersFilled: Object.keys(generatedValues || {}).length,
                placeholdersTotal: 0,
                errors: [
                    {
                        placeholderName: 'system',
                        error: errorMessage,
                    },
                    ...errors,
                ],
                metadata: {
                    duration,
                    generatedAt: new Date().toISOString(),
                },
            };
        }
    }
    /**
     * Generate content for a single placeholder
     */
    async generatePlaceholderContent(tenantId, userId, placeholder, config, template, context) {
        // Build prompt from configuration
        const prompt = this.buildPromptFromConfig(config, placeholder, context);
        // Assemble context if contextTemplateId is linked
        let contextShardId;
        if (config.contextTemplateId) {
            // Use context template to gather related shards
            contextShardId = await this.assembleContextFromTemplate(tenantId, config.contextTemplateId, context?.projectId);
        }
        else if (context?.projectId) {
            // Use project ID directly if provided
            contextShardId = context.projectId;
        }
        // Generate content using InsightService
        const insightRequest = {
            tenantId,
            userId,
            query: prompt,
            scope: contextShardId
                ? {
                    shardId: contextShardId,
                    shardTypeId: 'project', // Default to project, could be inferred
                }
                : undefined,
            templateId: config.contextTemplateId, // Pass template ID so InsightService can use it for context assembly
            options: {
                maxTokens: this.getMaxTokensForType(config.typeOverride || placeholder.type),
                temperature: config.temperature ?? this.config.defaultTemperature ?? 0.7,
            },
        };
        const insightResponse = await this.insightService.generate(tenantId, userId, insightRequest);
        // Extract generated content
        let generatedValue = insightResponse.content || insightResponse.result || '';
        // Trim whitespace
        generatedValue = generatedValue.trim();
        // Validate generated content against constraints
        const validation = this.validateGeneratedContent(generatedValue, config, placeholder);
        if (!validation.valid) {
            // If constraints are violated, log warning but continue
            // The content will be used anyway, but we track the violation
            this.monitoring.trackEvent('content_generation.placeholder.constraint_violation', {
                tenantId,
                placeholderName: placeholder.name,
                violations: validation.errors.join(', '),
                contentLength: generatedValue.length,
            });
        }
        // Check if content is empty and placeholder is required
        if (!generatedValue && config.isRequired) {
            throw new Error(`Required placeholder "${placeholder.name}" generated empty content. ` +
                `Please check the placeholder configuration and context.`);
        }
        // If content is empty but not required, use a fallback
        if (!generatedValue && !config.isRequired) {
            this.monitoring.trackEvent('content_generation.placeholder.empty_content', {
                tenantId,
                placeholderName: placeholder.name,
                reason: 'insight_service_returned_empty',
            });
            generatedValue = `[${placeholder.name}]`; // Fallback placeholder text
        }
        return {
            value: generatedValue,
            tokensUsed: insightResponse.usage?.totalTokens || insightResponse.tokensUsed?.total || 0,
            model: insightResponse.model,
        };
    }
    /**
     * Validate generated content against placeholder constraints
     */
    validateGeneratedContent(content, config, placeholder) {
        const errors = [];
        const constraints = config.constraints;
        if (constraints) {
            // Check min length
            if (constraints.minLength !== undefined && content.length < constraints.minLength) {
                errors.push(`Content length (${content.length}) is less than minimum (${constraints.minLength})`);
            }
            // Check max length
            if (constraints.maxLength !== undefined && content.length > constraints.maxLength) {
                errors.push(`Content length (${content.length}) exceeds maximum (${constraints.maxLength})`);
            }
            // Check pattern
            if (constraints.pattern && content.length > 0) {
                try {
                    const regex = new RegExp(constraints.pattern);
                    if (!regex.test(content)) {
                        errors.push(`Content does not match required pattern: ${constraints.pattern}`);
                    }
                }
                catch (regexError) {
                    // Invalid regex pattern - log but don't fail
                    this.monitoring.trackException(regexError, {
                        operation: 'generation.validate_content',
                        placeholderName: placeholder.name,
                        pattern: constraints.pattern,
                    });
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Build prompt from placeholder configuration
     */
    buildPromptFromConfig(config, placeholder, context) {
        let prompt = config.description || `Generate content for ${placeholder.name}`;
        // Add tone if specified
        if (config.tone) {
            prompt += ` Use a ${config.tone} tone.`;
        }
        // Add constraints
        if (config.constraints) {
            if (config.constraints.minLength) {
                prompt += ` Minimum length: ${config.constraints.minLength} characters.`;
            }
            if (config.constraints.maxLength) {
                prompt += ` Maximum length: ${config.constraints.maxLength} characters.`;
            }
        }
        // Add manual variables as context
        if (context?.variables) {
            const variableContext = Object.entries(context.variables)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            if (variableContext) {
                prompt += ` Context: ${variableContext}.`;
            }
        }
        return prompt;
    }
    /**
     * Assemble context from context template
     * Returns the shardId to use for scoping the generation
     */
    async assembleContextFromTemplate(tenantId, contextTemplateId, projectId) {
        try {
            // If no projectId is provided, we can't assemble context
            // ContextTemplateService requires a shardId to start from
            if (!projectId) {
                this.monitoring.trackEvent('content_generation.context_assembly.skipped', {
                    contextTemplateId,
                    reason: 'no_project_id',
                });
                return undefined;
            }
            // Use projectId as the shardId (projects are shards with type c_project)
            // Assemble context using ContextTemplateService
            const contextResult = await this.contextTemplateService.assembleContext(projectId, tenantId, {
                templateId: contextTemplateId,
            });
            if (!contextResult.success) {
                this.monitoring.trackEvent('content_generation.context_assembly.failed', {
                    contextTemplateId,
                    projectId,
                    error: contextResult.error,
                });
                // Fallback to using projectId directly
                return projectId;
            }
            // Context assembly successful - return the projectId as shardId
            // The assembled context will be used by InsightService when we pass it in scope
            this.monitoring.trackEvent('content_generation.context_assembly.success', {
                contextTemplateId,
                projectId,
                shardsIncluded: contextResult.context?.metadata?.totalShards || 0,
            });
            return projectId;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'generation.assembleContext',
                contextTemplateId,
                projectId,
            });
            // Fallback to using projectId directly if available
            return projectId;
        }
    }
    /**
     * Get max tokens for placeholder type
     */
    getMaxTokensForType(type) {
        const tokenLimits = {
            text: 500,
            number: 10,
            email: 50,
            domain: 100,
            list: 1000,
            chart: 100, // Chart data description
            image: 200, // Image description
        };
        return tokenLimits[type] || 500;
    }
    /**
     * Parse auth token from job
     */
    /**
     * Parse auth token from job
     * Decrypts the token if it's encrypted
     */
    parseAuthToken(userToken, job) {
        if (!userToken || userToken.trim().length === 0) {
            const error = new Error('User OAuth token is required for document generation');
            error.code = 'OAUTH_TOKEN_MISSING';
            this.monitoring.trackEvent('content_generation.oauth.token_missing', {
                jobId: job.id,
                templateId: job.templateId,
            });
            throw error;
        }
        // Decrypt token if it's encrypted (format: "iv:authTag:encryptedData")
        let decryptedToken;
        try {
            // Check if token is encrypted (encrypted tokens have the format "hex:hex:hex")
            if (userToken.includes(':') && userToken.split(':').length === 3) {
                decryptedToken = this.encryptionService.decrypt(userToken);
            }
            else {
                // Token is not encrypted (backward compatibility or dev mode)
                decryptedToken = userToken;
            }
            // Validate decrypted token is not empty
            if (!decryptedToken || decryptedToken.trim().length === 0) {
                const error = new Error('Decrypted OAuth token is empty');
                error.code = 'OAUTH_TOKEN_INVALID';
                this.monitoring.trackEvent('content_generation.oauth.token_empty_after_decrypt', {
                    jobId: job.id,
                    templateId: job.templateId,
                });
                throw error;
            }
        }
        catch (decryptError) {
            // If it's already an error with a code, rethrow it
            if (decryptError.code) {
                this.monitoring.trackException(decryptError, {
                    operation: 'generation.decrypt_token',
                    jobId: job.id,
                });
                throw decryptError;
            }
            // Otherwise, wrap it with proper error code
            this.monitoring.trackException(decryptError, {
                operation: 'generation.decrypt_token',
                jobId: job.id,
            });
            const error = new Error(`Failed to decrypt user token: ${decryptError.message}`);
            error.code = 'OAUTH_TOKEN_DECRYPTION_FAILED';
            throw error;
        }
        return {
            accessToken: decryptedToken,
            userId: job.userId,
            tenantId: job.tenantId,
        };
    }
    /**
     * Get MIME type for document format
     */
    getMimeTypeForFormat(format) {
        const mimeTypes = {
            google_slides: 'application/vnd.google-apps.presentation',
            google_docs: 'application/vnd.google-apps.document',
            word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            powerpoint: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        return mimeTypes[format] || 'application/octet-stream';
    }
    /**
     * Determine if an error is recoverable (should retry) or permanent (should fail immediately)
     */
    isRecoverableError(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Permanent errors (don't retry)
        const permanentErrorPatterns = [
            'Template.*not found',
            'Template.*not active',
            'Template.*archived',
            'Template.*deleted',
            'Template.*invalid',
            'Template.*missing',
            'Template.*corrupted',
            'TEMPLATE_NOT_FOUND',
            'TEMPLATE_NOT_ACTIVE',
            'TEMPLATE_INVALID',
            'FOLDER_NOT_FOUND',
            'FOLDER_ACCESS_DENIED',
            'NOT_A_FOLDER',
            'PLACEHOLDER_CONFIG_MISSING',
            'QUOTA_EXCEEDED',
            'ACCESS_DENIED',
            'PROVIDER_MISMATCH',
            'rate limit exceeded', // After max retries, rate limit is permanent
            'INSIGHT_GENERATION_ERROR',
            'AI_SERVICE_ERROR',
            'Required placeholder.*generated empty content', // Required placeholders that fail generation
            'QUEUE_AUTH_ERROR', // Authentication failures are permanent (was SERVICE_BUS_AUTH_ERROR)
            'QUEUE_QUOTA_EXCEEDED', // Quota exceeded is permanent (was SERVICE_BUS_QUOTA_EXCEEDED)
            'SERVICE_BUS_AUTH_ERROR', // Legacy error code - kept for backward compatibility
            'SERVICE_BUS_QUOTA_EXCEEDED', // Legacy error code - kept for backward compatibility
            'OAUTH_TOKEN_MISSING', // Missing OAuth token is permanent
            'OAUTH_TOKEN_INVALID', // Invalid OAuth token is permanent
            'OAUTH_TOKEN_DECRYPTION_FAILED', // Token decryption failure is permanent
            'OAuth token.*required', // Missing OAuth token (from error message)
            'Failed to decrypt.*token', // Token decryption failure (from error message)
            'JOB_INVALID', // Invalid job data is permanent
            'Unsupported document format', // Unsupported format is permanent
            'No rewriter available', // Missing rewriter is permanent
        ];
        for (const pattern of permanentErrorPatterns) {
            if (new RegExp(pattern, 'i').test(errorMessage)) {
                return false;
            }
        }
        // Transient errors (should retry)
        const transientErrorPatterns = [
            'timeout',
            'ECONNABORTED', // Axios timeout error code
            'ETIMEDOUT', // Axios timeout error code
            'network',
            'connection',
            'rate limit',
            'temporary',
            'service unavailable',
            '503',
            '502',
            '504',
            'QUEUE_CONNECTION_ERROR', // New error code (was SERVICE_BUS_CONNECTION_ERROR)
            'QUEUE_TIMEOUT', // New error code (was SERVICE_BUS_TIMEOUT)
            'SERVICE_BUS_CONNECTION_ERROR', // Legacy error code - kept for backward compatibility
            'SERVICE_BUS_TIMEOUT', // Legacy error code - kept for backward compatibility
        ];
        for (const pattern of transientErrorPatterns) {
            if (new RegExp(pattern, 'i').test(errorMessage)) {
                return true;
            }
        }
        // Default: assume recoverable (will retry up to maxRetries)
        return true;
    }
    /**
     * Extract error code from error
     */
    getErrorCode(error) {
        if (error instanceof Error) {
            const message = error.message;
            // Check for specific error codes in message
            if (message.includes('Template') && message.includes('not found')) {
                return 'TEMPLATE_NOT_FOUND';
            }
            if (message.includes('Template') && message.includes('not active')) {
                return 'TEMPLATE_NOT_ACTIVE';
            }
            if (message.includes('Template') && (message.includes('invalid') || message.includes('corrupted') || message.includes('missing'))) {
                return 'TEMPLATE_INVALID';
            }
            if (message.includes('Generation job') && message.includes('invalid')) {
                return 'JOB_INVALID';
            }
            if (message.includes('Unsupported document format') || message.includes('No rewriter available')) {
                return 'UNSUPPORTED_FORMAT';
            }
            if (message.includes('Folder') && message.includes('not found')) {
                return 'FOLDER_NOT_FOUND';
            }
            if (message.includes('access') && message.includes('denied')) {
                return 'ACCESS_DENIED';
            }
            if (message.includes('quota') || message.includes('limit')) {
                return 'QUOTA_EXCEEDED';
            }
            if (message.includes('timeout') || message.includes('ECONNABORTED') || message.includes('ETIMEDOUT')) {
                return 'TIMEOUT';
            }
            if (message.includes('network') || message.includes('connection')) {
                return 'NETWORK_ERROR';
            }
            if (message.includes('rate limit') || message.includes('429')) {
                return 'RATE_LIMIT_EXCEEDED';
            }
            if (message.includes('INSIGHT_GENERATION_ERROR') || message.includes('AI_SERVICE_ERROR')) {
                return 'INSIGHT_GENERATION_FAILED';
            }
            if (message.includes('Required placeholder') && message.includes('generated empty content')) {
                return 'PLACEHOLDER_GENERATION_FAILED';
            }
            if (message.includes('QUEUE_CONNECTION_ERROR') || message.includes('SERVICE_BUS_CONNECTION_ERROR') || message.includes('Redis') || message.includes('queue connection')) {
                return 'QUEUE_CONNECTION_ERROR';
            }
            if (message.includes('QUEUE_TIMEOUT') || message.includes('SERVICE_BUS_TIMEOUT') || (message.includes('timeout') && (message.includes('queue') || message.includes('Service Bus')))) {
                return 'QUEUE_TIMEOUT';
            }
            if (message.includes('QUEUE_QUOTA_EXCEEDED') || message.includes('SERVICE_BUS_QUOTA_EXCEEDED') || (message.includes('quota') && (message.includes('queue') || message.includes('Service Bus')))) {
                return 'QUEUE_QUOTA_EXCEEDED';
            }
            if (message.includes('QUEUE_AUTH_ERROR') || message.includes('SERVICE_BUS_AUTH_ERROR') || (message.includes('unauthorized') && (message.includes('queue') || message.includes('Service Bus')))) {
                return 'QUEUE_AUTH_ERROR';
            }
            if (message.includes('OAuth token') && (message.includes('required') || message.includes('missing'))) {
                return 'OAUTH_TOKEN_MISSING';
            }
            if (message.includes('Failed to decrypt') && message.includes('token')) {
                return 'OAUTH_TOKEN_DECRYPTION_FAILED';
            }
            if (message.includes('Decrypted OAuth token') && message.includes('empty')) {
                return 'OAUTH_TOKEN_INVALID';
            }
        }
        // Check for error codes in error objects
        if (error && typeof error === 'object' && 'code' in error) {
            const code = error.code;
            if (typeof code === 'string') {
                // Return the code directly if it's a recognized error code
                const recognizedCodes = [
                    'TEMPLATE_NOT_FOUND',
                    'TEMPLATE_NOT_ACTIVE',
                    'FOLDER_NOT_FOUND',
                    'QUOTA_EXCEEDED',
                    'OAUTH_TOKEN_MISSING',
                    'OAUTH_TOKEN_INVALID',
                    'OAUTH_TOKEN_DECRYPTION_FAILED',
                    'QUEUE_AUTH_ERROR',
                    'QUEUE_QUOTA_EXCEEDED',
                    'SERVICE_BUS_AUTH_ERROR', // Legacy - kept for backward compatibility
                    'SERVICE_BUS_QUOTA_EXCEEDED', // Legacy - kept for backward compatibility
                ];
                if (recognizedCodes.includes(code)) {
                    return code;
                }
            }
        }
        // Check for HTTP status codes in error objects
        if (error && typeof error === 'object' && 'code' in error) {
            const code = error.code;
            if (code === 429) {
                return 'RATE_LIMIT_EXCEEDED';
            }
            if (code === 401) {
                return 'UNAUTHORIZED';
            }
            if (code === 403) {
                return 'ACCESS_DENIED';
            }
            if (code === 404) {
                return 'NOT_FOUND';
            }
        }
        return 'PROCESSING_ERROR';
    }
}
//# sourceMappingURL=generation-processor.service.js.map