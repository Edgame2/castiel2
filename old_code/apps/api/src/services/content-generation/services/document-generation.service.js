/**
 * Document Generation Service
 *
 * Handles document generation jobs from templates
 * Creates jobs and queues them to BullMQ/Redis for async processing
 */
import { v4 as uuidv4 } from 'uuid';
import { drive } from '@googleapis/drive';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { AppError } from '../../../middleware/error-handler.js';
import { GenerationJobRepository } from '../../../repositories/generation-job.repository.js';
import { CredentialEncryptionService } from '../../credential-encryption.service.js';
import { config } from '../../../config/env.js';
import { getContentGenerationConfig } from '../config/content-generation.config.js';
export class DocumentGenerationService {
    monitoring;
    templateService;
    serviceBus;
    jobRepository;
    encryptionService;
    redis;
    config;
    constructor(monitoring, templateService, serviceBus, redis) {
        this.monitoring = monitoring;
        this.templateService = templateService;
        this.serviceBus = serviceBus;
        this.jobRepository = new GenerationJobRepository();
        // Initialize encryption service for token encryption
        const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default-key-for-dev-only-change-in-prod';
        this.encryptionService = new CredentialEncryptionService(encryptionKey);
        this.redis = redis || null;
        this.config = getContentGenerationConfig();
    }
    /**
     * Generate a document from a template
     * Creates a job and queues it for async processing
     */
    async generateDocument(request, userToken // OAuth token for accessing user's Drive/OneDrive
    ) {
        const startTime = Date.now();
        try {
            // Validate request
            this.validateGenerationRequest(request);
            // Get template
            const template = await this.templateService.getTemplate(request.templateId, request.tenantId);
            if (!template) {
                throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
            }
            // Check template status
            if (template.status !== 'active') {
                throw new AppError('Template is not active. Only active templates can be used for generation.', 400, 'TEMPLATE_NOT_ACTIVE');
            }
            // Validate that template format matches destination provider
            // Google templates (google_docs, google_slides) must go to Google Drive
            // Microsoft templates (word, powerpoint) must go to OneDrive
            const isGoogleTemplate = template.documentFormat === 'google_docs' || template.documentFormat === 'google_slides';
            const isMicrosoftTemplate = template.documentFormat === 'word' || template.documentFormat === 'powerpoint';
            if (isGoogleTemplate && request.destinationProvider !== 'google') {
                throw new AppError(`Template format "${template.documentFormat}" requires Google Drive as destination. ` +
                    `Please specify a Google Drive folder.`, 400, 'PROVIDER_MISMATCH', {
                    templateFormat: template.documentFormat,
                    destinationProvider: request.destinationProvider,
                    requiredProvider: 'google',
                });
            }
            if (isMicrosoftTemplate && request.destinationProvider !== 'microsoft') {
                throw new AppError(`Template format "${template.documentFormat}" requires OneDrive as destination. ` +
                    `Please specify a OneDrive folder.`, 400, 'PROVIDER_MISMATCH', {
                    templateFormat: template.documentFormat,
                    destinationProvider: request.destinationProvider,
                    requiredProvider: 'microsoft',
                });
            }
            // Validate placeholder count
            const placeholderCount = template.placeholders?.length || 0;
            if (placeholderCount > this.config.maxPlaceholdersPerTemplate) {
                throw new AppError(`Template has ${placeholderCount} placeholders, which exceeds the maximum of ${this.config.maxPlaceholdersPerTemplate}`, 400, 'VALIDATION_ERROR', {
                    placeholderCount,
                    maxPlaceholders: this.config.maxPlaceholdersPerTemplate,
                });
            }
            // Validate skipPlaceholders contains only valid placeholder names
            if (request.options?.skipPlaceholders) {
                const validPlaceholderNames = new Set((template.placeholders || []).map(p => p.name));
                // Check for duplicates in skipPlaceholders
                const seen = new Set();
                const duplicates = [];
                for (const name of request.options.skipPlaceholders) {
                    if (seen.has(name)) {
                        duplicates.push(name);
                    }
                    else {
                        seen.add(name);
                    }
                }
                if (duplicates.length > 0) {
                    throw new AppError(`Duplicate placeholder names in skipPlaceholders: ${duplicates.join(', ')}. ` +
                        `Each placeholder can only be skipped once.`, 400, 'VALIDATION_ERROR', {
                        duplicates,
                    });
                }
                const invalidSkipPlaceholders = request.options.skipPlaceholders.filter(name => !validPlaceholderNames.has(name));
                if (invalidSkipPlaceholders.length > 0) {
                    throw new AppError(`Invalid placeholder names in skipPlaceholders: ${invalidSkipPlaceholders.join(', ')}. ` +
                        `These placeholders do not exist in the template.`, 400, 'VALIDATION_ERROR', {
                        invalidPlaceholders: invalidSkipPlaceholders,
                        validPlaceholders: Array.from(validPlaceholderNames),
                    });
                }
            }
            // Validate context variables contain only valid placeholder names
            if (request.context?.variables) {
                const validPlaceholderNames = new Set((template.placeholders || []).map(p => p.name));
                const invalidVariableNames = Object.keys(request.context.variables).filter(name => !validPlaceholderNames.has(name));
                if (invalidVariableNames.length > 0) {
                    throw new AppError(`Invalid placeholder names in context variables: ${invalidVariableNames.join(', ')}. ` +
                        `These placeholders do not exist in the template.`, 400, 'VALIDATION_ERROR', {
                        invalidVariables: invalidVariableNames,
                        validPlaceholders: Array.from(validPlaceholderNames),
                    });
                }
            }
            // Validate no conflicts between skipPlaceholders and context variables
            // A placeholder cannot be both skipped and overridden
            if (request.options?.skipPlaceholders && request.context?.variables) {
                const skipSet = new Set(request.options.skipPlaceholders);
                const variableKeys = Object.keys(request.context.variables);
                const conflicts = variableKeys.filter(name => skipSet.has(name));
                if (conflicts.length > 0) {
                    throw new AppError(`Conflicting placeholder configuration: ${conflicts.join(', ')}. ` +
                        `These placeholders are both in skipPlaceholders and context variables. ` +
                        `A placeholder cannot be both skipped and overridden. Please remove them from one of the lists.`, 400, 'VALIDATION_ERROR', {
                        conflictingPlaceholders: conflicts,
                    });
                }
            }
            // Validate placeholder configurations
            // Ensure all required placeholders have configurations
            const missingConfigs = [];
            for (const placeholder of template.placeholders || []) {
                // Skip validation for placeholders that will be skipped
                if (request.options?.skipPlaceholders?.includes(placeholder.name)) {
                    continue;
                }
                // Skip validation for placeholders with manual overrides
                if (request.context?.variables?.[placeholder.name]) {
                    continue;
                }
                const config = template.placeholderConfigs.find(c => c.placeholderName === placeholder.name);
                if (!config) {
                    missingConfigs.push(placeholder.name);
                }
                else if (!config.description || config.description.trim().length === 0) {
                    missingConfigs.push(placeholder.name);
                }
            }
            if (missingConfigs.length > 0) {
                throw new AppError(`Template has placeholders without configurations: ${missingConfigs.join(', ')}. Please configure all placeholders before generating documents.`, 400, 'PLACEHOLDER_CONFIG_MISSING', {
                    missingPlaceholders: missingConfigs,
                });
            }
            // Validate source document exists and is accessible
            // Use tenant-level OAuth token (same as when template was created)
            await this.templateService.validateSourceDocument(template, request.tenantId);
            // Validate destination folder
            await this.validateDestinationFolder(request.destinationProvider, request.destinationFolderId, userToken);
            // Check quota limits (daily and monthly)
            // Note: Quota is incremented in checkQuotaLimits, so we need to rollback on failure
            let quotaIncremented = false;
            try {
                await this.checkQuotaLimits(request.tenantId, request.userId);
                quotaIncremented = true;
            }
            catch (quotaError) {
                // Quota check failed - rethrow immediately
                throw quotaError;
            }
            // Create generation job
            const job = {
                id: uuidv4(),
                templateId: request.templateId,
                tenantId: request.tenantId,
                userId: request.userId,
                status: 'pending',
                destinationFolderId: request.destinationFolderId,
                destinationProvider: request.destinationProvider,
                context: request.context,
                options: request.options,
                requestId: request.options?.requestId, // Store request ID for traceability
                createdAt: new Date().toISOString(),
                retryCount: 0,
                maxRetries: 3,
            };
            let jobCreated = false;
            try {
                // Store job in Cosmos DB
                await this.jobRepository.create(job);
                jobCreated = true;
                // Queue job to Service Bus
                await this.queueGenerationJob(job, template, userToken);
            }
            catch (jobError) {
                // If job was created but queuing failed, clean up the orphaned job
                if (jobCreated) {
                    try {
                        await this.jobRepository.delete(job.id, request.tenantId);
                        this.monitoring.trackEvent('content_generation.job.cleaned_up_after_queue_failure', {
                            jobId: job.id,
                            templateId: request.templateId,
                            tenantId: request.tenantId,
                        });
                    }
                    catch (cleanupError) {
                        // Log cleanup failure but don't fail the request
                        // The job will remain in Cosmos DB but won't be processed
                        // This can be cleaned up later by a maintenance job
                        this.monitoring.trackException(cleanupError, {
                            operation: 'generation.cleanup_orphaned_job',
                            jobId: job.id,
                            tenantId: request.tenantId,
                        });
                        this.monitoring.trackEvent('content_generation.job.cleanup_failed', {
                            jobId: job.id,
                            templateId: request.templateId,
                            tenantId: request.tenantId,
                        });
                    }
                }
                // Rollback quota if it was incremented
                if (quotaIncremented) {
                    await this.rollbackQuota(request.tenantId, request.userId);
                }
                throw jobError;
            }
            // Track event
            this.monitoring.trackEvent('content_generation.job.created', {
                jobId: job.id,
                templateId: request.templateId,
                tenantId: request.tenantId,
                userId: request.userId,
                format: template.documentFormat,
                requestId: job.requestId, // Include request ID for traceability
            });
            // Return result
            return {
                jobId: job.id,
                templateId: request.templateId,
                status: 'pending',
                placeholdersFilled: 0,
                placeholdersTotal: template.placeholders?.length || 0,
                metadata: {
                    generatedAt: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'generation.create',
                templateId: request.templateId,
                tenantId: request.tenantId,
                duration,
            });
            throw error;
        }
    }
    /**
     * Get generation job status
     */
    async getJobStatus(jobId, tenantId, userId) {
        const startTime = Date.now();
        try {
            // Validate inputs
            if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
                throw new AppError('Job ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
                throw new AppError('Tenant ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
                throw new AppError('User ID must be a non-empty string if provided', 400, 'VALIDATION_ERROR');
            }
            // Get job from repository
            const job = await this.jobRepository.findById(jobId, tenantId);
            if (!job) {
                throw new AppError('Generation job not found', 404, 'JOB_NOT_FOUND');
            }
            // Verify user access (if userId provided)
            if (userId && job.userId !== userId) {
                throw new AppError('Access denied to this generation job', 403, 'ACCESS_DENIED');
            }
            // Get template for placeholder count
            const template = await this.templateService.getTemplate(job.templateId, tenantId);
            // Convert job to GenerationResult
            const result = {
                jobId: job.id,
                templateId: job.templateId,
                status: job.status,
                generatedDocumentId: job.generatedDocumentId,
                generatedDocumentUrl: job.generatedDocumentUrl,
                shardId: job.shardId,
                placeholdersFilled: job.placeholdersFilled ?? 0,
                placeholdersTotal: template?.placeholders?.length || 0,
                errors: job.error ? [
                    {
                        placeholderName: 'general',
                        error: job.error.message,
                    }
                ] : undefined,
                metadata: {
                    generatedAt: job.completedAt || job.createdAt,
                    model: job.resultMetadata?.model,
                    tokensUsed: job.resultMetadata?.tokensUsed,
                    duration: job.resultMetadata?.duration,
                },
            };
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('content_generation.job.status.retrieved', {
                jobId: job.id,
                templateId: job.templateId,
                tenantId,
                status: job.status,
                duration,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error instanceof AppError) {
                this.monitoring.trackException(error, {
                    operation: 'generation.get_status',
                    jobId,
                    tenantId,
                    userId,
                    duration,
                });
                throw error;
            }
            this.monitoring.trackException(error, {
                operation: 'generation.get_status',
                jobId,
                tenantId,
                userId,
                duration,
            });
            throw new AppError('Failed to retrieve job status', 500, 'STATUS_RETRIEVAL_ERROR', error);
        }
    }
    /**
     * Cancel a pending or processing generation job
     */
    async cancelJob(jobId, tenantId, userId) {
        const startTime = Date.now();
        try {
            // Validate inputs
            if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
                throw new AppError('Job ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
                throw new AppError('Tenant ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
                throw new AppError('User ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            // Get job
            const job = await this.jobRepository.findById(jobId, tenantId);
            if (!job) {
                throw new AppError('Generation job not found', 404, 'JOB_NOT_FOUND');
            }
            // Verify user access
            if (job.userId !== userId) {
                throw new AppError('Access denied to this generation job', 403, 'ACCESS_DENIED');
            }
            // Only allow cancellation of pending or processing jobs
            if (job.status !== 'pending' && job.status !== 'processing') {
                throw new AppError(`Cannot cancel job with status: ${job.status}. Only pending or processing jobs can be cancelled.`, 400, 'INVALID_JOB_STATUS');
            }
            // Update job status to cancelled
            await this.jobRepository.update(job.id, job.tenantId, {
                status: 'cancelled',
                completedAt: new Date().toISOString(),
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('content_generation.job.cancelled', {
                jobId: job.id,
                templateId: job.templateId,
                tenantId,
                userId,
                previousStatus: job.status,
                duration,
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
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'generation.cancel',
                jobId,
                tenantId,
                userId,
            });
            throw error;
        }
    }
    /**
     * Validate generation request
     */
    validateGenerationRequest(request) {
        if (!request.templateId) {
            throw new AppError('Template ID is required', 400, 'VALIDATION_ERROR');
        }
        if (typeof request.templateId !== 'string' || request.templateId.trim().length === 0) {
            throw new AppError('Template ID must be a non-empty string', 400, 'VALIDATION_ERROR');
        }
        if (!request.tenantId) {
            throw new AppError('Tenant ID is required', 400, 'VALIDATION_ERROR');
        }
        if (typeof request.tenantId !== 'string' || request.tenantId.trim().length === 0) {
            throw new AppError('Tenant ID must be a non-empty string', 400, 'VALIDATION_ERROR');
        }
        if (!request.userId) {
            throw new AppError('User ID is required', 400, 'VALIDATION_ERROR');
        }
        if (typeof request.userId !== 'string' || request.userId.trim().length === 0) {
            throw new AppError('User ID must be a non-empty string', 400, 'VALIDATION_ERROR');
        }
        if (!request.destinationFolderId) {
            throw new AppError('Destination folder ID is required', 400, 'VALIDATION_ERROR');
        }
        if (typeof request.destinationFolderId !== 'string' || request.destinationFolderId.trim().length === 0) {
            throw new AppError('Destination folder ID must be a non-empty string', 400, 'VALIDATION_ERROR');
        }
        if (!request.destinationProvider) {
            throw new AppError('Destination provider is required', 400, 'VALIDATION_ERROR');
        }
        if (!['google', 'microsoft'].includes(request.destinationProvider)) {
            throw new AppError('Destination provider must be "google" or "microsoft"', 400, 'VALIDATION_ERROR');
        }
        // Validate context if provided
        if (request.context !== undefined && request.context !== null) {
            // Ensure context is an object
            if (typeof request.context !== 'object' || Array.isArray(request.context)) {
                throw new AppError('Context must be an object', 400, 'VALIDATION_ERROR');
            }
            if (request.context.projectId !== undefined && request.context.projectId !== null) {
                if (typeof request.context.projectId !== 'string' || request.context.projectId.trim().length === 0) {
                    throw new AppError('Project ID must be a non-empty string if provided', 400, 'VALIDATION_ERROR');
                }
            }
            if (request.context.variables !== undefined && request.context.variables !== null) {
                if (typeof request.context.variables !== 'object' || Array.isArray(request.context.variables)) {
                    throw new AppError('Variables must be an object', 400, 'VALIDATION_ERROR');
                }
                // Validate maximum number of variables
                const variableCount = Object.keys(request.context.variables).length;
                if (variableCount > this.config.maxContextVariables) {
                    throw new AppError(`Number of context variables (${variableCount}) exceeds maximum (${this.config.maxContextVariables})`, 400, 'VALIDATION_ERROR', {
                        variableCount,
                        maxVariables: this.config.maxContextVariables,
                    });
                }
                // Validate that all variable keys are non-empty strings
                for (const key of Object.keys(request.context.variables)) {
                    if (typeof key !== 'string' || key.trim().length === 0) {
                        throw new AppError('All context variable keys must be non-empty strings', 400, 'VALIDATION_ERROR');
                    }
                }
                // Validate that all variable values are strings and within length limits
                for (const [key, value] of Object.entries(request.context.variables)) {
                    if (typeof value !== 'string') {
                        throw new AppError(`Variable "${key}" must be a string`, 400, 'VALIDATION_ERROR');
                    }
                    // Allow empty strings (they might be intentional), but validate length if non-empty
                    if (value.length > this.config.maxVariableValueLength) {
                        throw new AppError(`Variable "${key}" value length (${value.length}) exceeds maximum (${this.config.maxVariableValueLength} characters)`, 400, 'VALIDATION_ERROR', {
                            variableName: key,
                            valueLength: value.length,
                            maxLength: this.config.maxVariableValueLength,
                        });
                    }
                }
            }
        }
        // Validate options if provided
        if (request.options !== undefined && request.options !== null) {
            // Ensure options is an object
            if (typeof request.options !== 'object' || Array.isArray(request.options)) {
                throw new AppError('Options must be an object', 400, 'VALIDATION_ERROR');
            }
            if (request.options.skipPlaceholders !== undefined && request.options.skipPlaceholders !== null) {
                if (!Array.isArray(request.options.skipPlaceholders)) {
                    throw new AppError('skipPlaceholders must be an array', 400, 'VALIDATION_ERROR');
                }
                // Validate array size
                if (request.options.skipPlaceholders.length > this.config.maxSkipPlaceholders) {
                    throw new AppError(`skipPlaceholders array cannot exceed ${this.config.maxSkipPlaceholders} items`, 400, 'VALIDATION_ERROR');
                }
                // Validate that all skipPlaceholders are strings
                for (const placeholder of request.options.skipPlaceholders) {
                    if (typeof placeholder !== 'string' || placeholder.trim().length === 0) {
                        throw new AppError('All skipPlaceholders must be non-empty strings', 400, 'VALIDATION_ERROR');
                    }
                }
                // Validate no duplicate placeholder names in skipPlaceholders
                const skipSet = new Set(request.options.skipPlaceholders);
                if (skipSet.size !== request.options.skipPlaceholders.length) {
                    const duplicates = request.options.skipPlaceholders.filter((item, index) => request.options.skipPlaceholders.indexOf(item) !== index);
                    throw new AppError(`skipPlaceholders array contains duplicate placeholder names: ${[...new Set(duplicates)].join(', ')}`, 400, 'VALIDATION_ERROR', {
                        duplicates: [...new Set(duplicates)],
                    });
                }
                // Note: Validation that skipPlaceholders contains only valid placeholder names
                // happens after template is loaded (see generateDocument method)
            }
            if (request.options.notifyOnComplete !== undefined && request.options.notifyOnComplete !== null) {
                if (typeof request.options.notifyOnComplete !== 'boolean') {
                    throw new AppError('notifyOnComplete must be a boolean', 400, 'VALIDATION_ERROR');
                }
            }
            if (request.options.requestId !== undefined && request.options.requestId !== null) {
                if (typeof request.options.requestId !== 'string' || request.options.requestId.trim().length === 0) {
                    throw new AppError('Request ID must be a non-empty string if provided', 400, 'VALIDATION_ERROR');
                }
            }
            if (request.options.async !== undefined && request.options.async !== null) {
                if (typeof request.options.async !== 'boolean') {
                    throw new AppError('async must be a boolean', 400, 'VALIDATION_ERROR');
                }
            }
        }
    }
    /**
     * Validate destination folder exists and user has access
     */
    async validateDestinationFolder(provider, folderId, userToken) {
        if (!userToken) {
            throw new AppError('User OAuth token is required for folder validation', 400, 'VALIDATION_ERROR');
        }
        try {
            if (provider === 'google') {
                await this.validateGoogleDriveFolder(folderId, userToken);
            }
            else if (provider === 'microsoft') {
                await this.validateOneDriveFolder(folderId, userToken);
            }
            else {
                throw new AppError(`Unsupported provider: ${provider}`, 400, 'VALIDATION_ERROR');
            }
            this.monitoring.trackEvent('content_generation.folder_validated', {
                provider,
                folderId,
            });
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            this.monitoring.trackException(error, {
                operation: 'generation.validate_folder',
                provider,
                folderId,
            });
            throw new AppError(`Failed to validate destination folder: ${error.message}`, 400, 'FOLDER_VALIDATION_ERROR', error);
        }
    }
    /**
     * Validate Google Drive folder exists and user has access
     */
    async validateGoogleDriveFolder(folderId, userToken) {
        try {
            // Get OAuth config from environment
            const clientId = config.googleWorkspace?.clientId || '';
            const clientSecret = config.googleWorkspace?.clientSecret || '';
            if (!clientId || !clientSecret) {
                throw new AppError('Google Workspace OAuth credentials not configured', 500, 'CONFIGURATION_ERROR');
            }
            // Create OAuth2 client
            const oauth2Client = new OAuth2Client(clientId, clientSecret);
            oauth2Client.setCredentials({
                access_token: userToken,
            });
            // Initialize Drive client
            const driveClient = drive({ version: 'v3', auth: oauth2Client });
            // Get folder metadata
            const folder = await driveClient.files.get({
                fileId: folderId,
                fields: 'id,name,mimeType,capabilities',
            });
            // Verify it's actually a folder
            const mimeType = folder.data.mimeType;
            if (mimeType !== 'application/vnd.google-apps.folder') {
                throw new AppError(`The specified ID is not a folder (mimeType: ${mimeType})`, 400, 'NOT_A_FOLDER');
            }
            // Verify user has write access (canAddChildren capability)
            const capabilities = folder.data.capabilities;
            if (capabilities && !capabilities.canAddChildren) {
                throw new AppError('User does not have write access to the destination folder', 403, 'FOLDER_ACCESS_DENIED');
            }
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            // Handle Google API errors
            if (error.code === 404) {
                throw new AppError('Destination folder not found', 404, 'FOLDER_NOT_FOUND');
            }
            if (error.code === 403) {
                throw new AppError('Access denied to destination folder', 403, 'FOLDER_ACCESS_DENIED');
            }
            throw error;
        }
    }
    /**
     * Validate OneDrive folder exists and user has access
     */
    async validateOneDriveFolder(folderId, userToken) {
        try {
            const graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';
            // Get folder metadata
            const response = await axios.get(`${graphApiBaseUrl}/me/drive/items/${folderId}`, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
                timeout: this.config.apiRequestTimeoutMs,
            });
            const item = response.data;
            // Verify it's actually a folder
            if (item.folder === undefined) {
                throw new AppError('The specified ID is not a folder', 400, 'NOT_A_FOLDER');
            }
            // Verify user has write access (check permissions)
            // Note: Microsoft Graph API doesn't always return permissions in the basic item query
            // We'll verify by attempting to check if we can write (this is a basic check)
            // A more thorough check would query the permissions endpoint
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            // Handle Microsoft Graph API errors
            if (error.response?.status === 404) {
                throw new AppError('Destination folder not found', 404, 'FOLDER_NOT_FOUND');
            }
            if (error.response?.status === 403 || error.response?.status === 401) {
                throw new AppError('Access denied to destination folder', 403, 'FOLDER_ACCESS_DENIED');
            }
            throw error;
        }
    }
    /**
     * Queue generation job to Service Bus
     */
    async queueGenerationJob(job, template, userToken) {
        try {
            // Encrypt user token before sending to Service Bus
            let encryptedToken;
            if (userToken) {
                try {
                    encryptedToken = this.encryptionService.encrypt(userToken);
                }
                catch (encryptError) {
                    this.monitoring.trackException(encryptError, {
                        operation: 'generation.encrypt_token',
                        jobId: job.id,
                    });
                    throw new AppError('Failed to encrypt user token', 500, 'ENCRYPTION_ERROR', encryptError);
                }
            }
            // Prepare job message for Service Bus
            const jobMessage = {
                ...job,
                template: {
                    id: template.id,
                    name: template.name,
                    documentFormat: template.documentFormat,
                    sourceDocumentId: template.sourceDocumentId,
                    placeholders: template.placeholders,
                    placeholderConfigs: template.placeholderConfigs,
                    dominantColors: template.dominantColors,
                },
                userToken: encryptedToken, // Encrypted OAuth token
            };
            // Send to Service Bus
            await this.serviceBus.sendGenerationJob(jobMessage);
            this.monitoring.trackEvent('content_generation.job.queued', {
                jobId: job.id,
                templateId: template.id,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'generation.queue',
                jobId: job.id,
            });
            // Determine error code based on error type
            let errorCode = 'QUEUE_ERROR';
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('connection') || errorMessage.includes('Redis') || errorMessage.includes('queue')) {
                errorCode = 'QUEUE_CONNECTION_ERROR';
            }
            else if (errorMessage.includes('timeout')) {
                errorCode = 'QUEUE_TIMEOUT';
            }
            else if (errorMessage.includes('quota') || errorMessage.includes('throttle')) {
                errorCode = 'QUEUE_QUOTA_EXCEEDED';
            }
            else if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
                errorCode = 'QUEUE_AUTH_ERROR';
            }
            throw new AppError(`Failed to queue generation job: ${errorMessage}`, 500, errorCode, error);
        }
    }
    /**
     * Check quota limits (daily and monthly) for tenant/user
     * Uses Redis to track usage counters
     */
    async checkQuotaLimits(tenantId, userId) {
        if (!this.redis) {
            // If Redis is not available, skip quota checking (graceful degradation)
            this.monitoring.trackEvent('content_generation.quota_check_skipped', {
                tenantId,
                userId,
                reason: 'redis_unavailable',
            });
            return;
        }
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM
        // Build Redis keys
        const dailyKey = `content_gen:quota:daily:${tenantId}:${userId}:${today}`;
        const monthlyKey = `content_gen:quota:monthly:${tenantId}:${userId}:${currentMonth}`;
        try {
            // Get current usage
            const [dailyCount, monthlyCount] = await Promise.all([
                this.redis.get(dailyKey).then(v => parseInt(v || '0', 10)),
                this.redis.get(monthlyKey).then(v => parseInt(v || '0', 10)),
            ]);
            // Check daily limit
            if (dailyCount >= this.config.defaultDailyLimit) {
                throw new AppError(`Daily generation limit exceeded. Limit: ${this.config.defaultDailyLimit}, Used: ${dailyCount}. Please try again tomorrow.`, 429, 'QUOTA_EXCEEDED', {
                    limitType: 'daily',
                    limit: this.config.defaultDailyLimit,
                    used: dailyCount,
                    resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                });
            }
            // Check monthly limit
            if (monthlyCount >= this.config.defaultMonthlyLimit) {
                throw new AppError(`Monthly generation limit exceeded. Limit: ${this.config.defaultMonthlyLimit}, Used: ${monthlyCount}. Please try again next month.`, 429, 'QUOTA_EXCEEDED', {
                    limitType: 'monthly',
                    limit: this.config.defaultMonthlyLimit,
                    used: monthlyCount,
                    resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(), // First day of next month
                });
            }
            // Increment counters (will be set when job is created)
            // We increment here to reserve the quota slot
            const dailyExpiry = Math.ceil((new Date(today + 'T23:59:59Z').getTime() - now.getTime()) / 1000);
            const monthlyExpiry = Math.ceil((new Date(currentMonth + '-01T00:00:00Z').getTime() + 32 * 24 * 60 * 60 * 1000 - now.getTime()) / 1000);
            await Promise.all([
                this.redis.incr(dailyKey),
                this.redis.expire(dailyKey, dailyExpiry > 0 ? dailyExpiry : 86400), // At least 24 hours
                this.redis.incr(monthlyKey),
                this.redis.expire(monthlyKey, monthlyExpiry > 0 ? monthlyExpiry : 31 * 86400), // At least 31 days
            ]);
            this.monitoring.trackEvent('content_generation.quota_checked', {
                tenantId,
                userId,
                dailyCount: dailyCount + 1,
                monthlyCount: monthlyCount + 1,
                dailyLimit: this.config.defaultDailyLimit,
                monthlyLimit: this.config.defaultMonthlyLimit,
            });
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            // If Redis operation fails, log but don't block generation (graceful degradation)
            this.monitoring.trackException(error, {
                operation: 'generation.check_quota',
                tenantId,
                userId,
            });
            this.monitoring.trackEvent('content_generation.quota_check_failed', {
                tenantId,
                userId,
                error: error.message,
            });
            // Don't throw - allow generation to proceed if quota check fails
            // This is a graceful degradation approach
        }
    }
    /**
     * Rollback quota increment if job creation fails
     */
    async rollbackQuota(tenantId, userId) {
        if (!this.redis) {
            return; // No rollback needed if Redis unavailable
        }
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentMonth = now.toISOString().substring(0, 7);
        const dailyKey = `content_gen:quota:daily:${tenantId}:${userId}:${today}`;
        const monthlyKey = `content_gen:quota:monthly:${tenantId}:${userId}:${currentMonth}`;
        try {
            // Decrement counters (but don't go below 0)
            const [dailyCount, monthlyCount] = await Promise.all([
                this.redis.get(dailyKey).then(v => parseInt(v || '0', 10)),
                this.redis.get(monthlyKey).then(v => parseInt(v || '0', 10)),
            ]);
            if (dailyCount > 0) {
                await this.redis.decr(dailyKey);
            }
            if (monthlyCount > 0) {
                await this.redis.decr(monthlyKey);
            }
            this.monitoring.trackEvent('content_generation.quota_rolled_back', {
                tenantId,
                userId,
                reason: 'job_creation_failed',
            });
        }
        catch (error) {
            // Log but don't throw - rollback failure shouldn't block error handling
            this.monitoring.trackException(error, {
                operation: 'generation.rollback_quota',
                tenantId,
                userId,
            });
        }
    }
    /**
     * List generation jobs for a tenant/user
     */
    async listJobs(tenantId, options) {
        const startTime = Date.now();
        try {
            // Validate inputs
            if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
                throw new AppError('Tenant ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (options) {
                if (options.userId && (typeof options.userId !== 'string' || options.userId.trim().length === 0)) {
                    throw new AppError('User ID must be a non-empty string if provided', 400, 'VALIDATION_ERROR');
                }
                if (options.templateId && (typeof options.templateId !== 'string' || options.templateId.trim().length === 0)) {
                    throw new AppError('Template ID must be a non-empty string if provided', 400, 'VALIDATION_ERROR');
                }
                if (options.status && !['pending', 'processing', 'completed', 'failed', 'cancelled'].includes(options.status)) {
                    throw new AppError('Invalid job status', 400, 'VALIDATION_ERROR');
                }
                if (options.limit !== undefined) {
                    if (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 1000) {
                        throw new AppError('Limit must be a number between 1 and 1000', 400, 'VALIDATION_ERROR');
                    }
                }
                if (options.offset !== undefined) {
                    if (typeof options.offset !== 'number' || options.offset < 0) {
                        throw new AppError('Offset must be a non-negative number', 400, 'VALIDATION_ERROR');
                    }
                }
                if (options.createdAfter !== undefined) {
                    if (!(options.createdAfter instanceof Date) || isNaN(options.createdAfter.getTime())) {
                        throw new AppError('createdAfter must be a valid Date', 400, 'VALIDATION_ERROR');
                    }
                }
                if (options.createdBefore !== undefined) {
                    if (!(options.createdBefore instanceof Date) || isNaN(options.createdBefore.getTime())) {
                        throw new AppError('createdBefore must be a valid Date', 400, 'VALIDATION_ERROR');
                    }
                }
                // Validate date range
                if (options.createdAfter && options.createdBefore && options.createdAfter > options.createdBefore) {
                    throw new AppError('createdAfter must be before createdBefore', 400, 'VALIDATION_ERROR');
                }
            }
            const result = await this.jobRepository.list(tenantId, options);
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('content_generation.jobs.listed', {
                tenantId,
                jobCount: result.jobs.length,
                total: result.total,
                duration,
                hasFilters: !!options,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'generation.list_jobs',
                tenantId,
                duration,
            });
            throw error;
        }
    }
    /**
     * Get generation job statistics for a tenant
     */
    async getJobStats(tenantId) {
        const startTime = Date.now();
        try {
            // Validate inputs
            if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
                throw new AppError('Tenant ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            const stats = await this.jobRepository.getStats(tenantId);
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('content_generation.stats.retrieved', {
                tenantId,
                total: stats.total,
                duration,
                hasAnalytics: !!stats.analytics,
            });
            return stats;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'generation.get_stats',
                tenantId,
                duration,
            });
            throw error;
        }
    }
    /**
     * Retry a failed generation job
     */
    async retryJob(jobId, tenantId, userId) {
        const startTime = Date.now();
        try {
            // Validate inputs
            if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
                throw new AppError('Job ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
                throw new AppError('Tenant ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
                throw new AppError('User ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            // Get job
            const job = await this.jobRepository.findById(jobId, tenantId);
            if (!job) {
                throw new AppError('Generation job not found', 404, 'JOB_NOT_FOUND');
            }
            // Verify user access
            if (job.userId !== userId) {
                throw new AppError('Access denied to this generation job', 403, 'ACCESS_DENIED');
            }
            // Only allow retry of failed jobs
            if (job.status !== 'failed') {
                throw new AppError(`Cannot retry job with status: ${job.status}. Only failed jobs can be retried.`, 400, 'INVALID_JOB_STATUS');
            }
            // Get template to retrieve OAuth token
            const template = await this.templateService.getTemplate(job.templateId, tenantId);
            if (!template) {
                throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
            }
            // Reset job status and retry count
            const updatedJob = await this.jobRepository.update(job.id, job.tenantId, {
                status: 'pending',
                retryCount: 0,
                startedAt: undefined,
                completedAt: undefined,
                error: undefined,
            });
            // Re-queue job to Service Bus
            // Note: OAuth token should be retrieved by the controller and passed here
            // For retry, we'll queue without token - the processor will need to retrieve it
            await this.queueGenerationJob(updatedJob, template, undefined);
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('content_generation.job.retried', {
                jobId: job.id,
                templateId: job.templateId,
                tenantId,
                userId,
                previousRetryCount: job.retryCount,
                duration,
            });
            return {
                jobId: updatedJob.id,
                templateId: updatedJob.templateId,
                status: 'pending',
                placeholdersFilled: 0,
                placeholdersTotal: template.placeholders?.length || 0,
                metadata: {
                    generatedAt: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'generation.retry',
                jobId,
                tenantId,
                userId,
                duration,
            });
            throw error;
        }
    }
    /**
     * Cleanup old generation jobs (delete completed/failed/cancelled jobs older than specified days)
     * Admin operation
     */
    async cleanupOldJobs(tenantId, olderThanDays = 30) {
        const startTime = Date.now();
        try {
            // Validate inputs
            if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
                throw new AppError('Tenant ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            if (typeof olderThanDays !== 'number' || olderThanDays < 1 || olderThanDays > 365) {
                throw new AppError('olderThanDays must be a number between 1 and 365', 400, 'VALIDATION_ERROR');
            }
            const deletedCount = await this.jobRepository.deleteOldJobs(tenantId, olderThanDays);
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('content_generation.jobs.cleaned_up', {
                tenantId,
                deletedCount,
                olderThanDays,
                duration,
            });
            return deletedCount;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'generation.cleanup_old_jobs',
                tenantId,
                olderThanDays,
                duration,
            });
            throw error;
        }
    }
    /**
     * Find stuck jobs (processing jobs that have exceeded timeout)
     */
    async findStuckJobs(tenantId) {
        try {
            const timeoutMs = this.config.jobTimeoutMs || 300000; // Default 5 minutes
            return await this.jobRepository.findStuckJobs(tenantId, timeoutMs);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'generation.find_stuck_jobs',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Mark stuck jobs as failed (cleanup operation)
     */
    async markStuckJobsAsFailed(tenantId) {
        try {
            // Validate inputs
            if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
                throw new AppError('Tenant ID is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
            }
            const timeoutMs = this.config.jobTimeoutMs || 300000; // Default 5 minutes
            const markedCount = await this.jobRepository.markStuckJobsAsFailed(tenantId, timeoutMs);
            if (markedCount > 0) {
                this.monitoring.trackEvent('content_generation.jobs.stuck_marked_failed', {
                    tenantId,
                    markedCount,
                    timeoutMs,
                });
            }
            return markedCount;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'generation.mark_stuck_jobs_failed',
                tenantId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=document-generation.service.js.map