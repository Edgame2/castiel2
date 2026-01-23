/**
 * Document Upload Service
 * Orchestrates document upload: validation, blob storage, shard creation
 */
import { v4 as uuidv4 } from 'uuid';
import { SeverityLevel } from '@castiel/monitoring';
import { AuditCategory, AuditEventType, AuditSeverity, AuditOutcome, } from '../types/audit.types.js';
import { config } from '../config/env.js';
import { StorageProvider,
// ChunkedUploadSession, // Removed unused
 } from '../types/document.types.js';
import { ShardStatus, ShardSource } from '../types/shard.types.js';
import { BaseError } from '../utils/errors.js';
export class DocumentUploadError extends BaseError {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        Object.defineProperty(this, 'name', { value: 'DocumentUploadError' });
    }
}
/**
 * Document Upload Service
 */
export class DocumentUploadService {
    blobStorageService;
    validationService;
    shardRepository;
    auditLogService;
    monitoring;
    serviceBusService;
    constructor(blobStorageService, validationService, shardRepository, auditLogService, monitoring, serviceBusService) {
        this.blobStorageService = blobStorageService;
        this.validationService = validationService;
        this.shardRepository = shardRepository;
        this.auditLogService = auditLogService;
        this.monitoring = monitoring;
        this.serviceBusService = serviceBusService;
    }
    /**
     * Upload a single document (simple upload < 100MB)
     */
    async uploadDocument(fileData, metadata, tenantId, userId, userEmail, tenantSettings, globalSettings) {
        const startTime = Date.now();
        this.monitoring.trackEvent('document-upload.received', { tenantId: metadata.tenantId, fileName: metadata.fileName });
        try {
            // Step 1: Validate upload
            const validation = await this.validateUpload(fileData, tenantSettings, globalSettings);
            if (!validation.valid) {
                this.monitoring.trackTrace('Document upload validation failed', SeverityLevel.Warning, {
                    tenantId,
                    userId,
                    fileName: fileData.fileName,
                    errors: validation.errors.join('; '),
                });
                return {
                    success: false,
                    error: validation.errors.join('; '),
                    errorCode: 'VALIDATION_FAILED',
                };
            }
            // Step 2: Validate metadata
            const metadataValidation = await this.validateMetadata(metadata, tenantSettings);
            if (!metadataValidation.valid) {
                return {
                    success: false,
                    error: metadataValidation.errors.join('; '),
                    errorCode: 'METADATA_VALIDATION_FAILED',
                };
            }
            // Step 3: Generate shard ID
            const shardId = uuidv4();
            const version = 1;
            // Step 4: Upload to blob storage
            const verifyVirus = config.azureStorage?.verifyVirus || false;
            const useQuarantine = verifyVirus;
            const blobUpload = await this.blobStorageService.uploadFile(tenantId, shardId, version, fileData.fileName, fileData.fileBuffer, {
                mimeType: fileData.mimeType,
                metadata: {
                    tenantId,
                    userId,
                    shardId,
                    originalFileName: fileData.fileName,
                },
            }, useQuarantine);
            // Step 5: Create version history entry
            const versionEntry = {
                version,
                uploadedAt: new Date(),
                uploadedBy: userId,
                uploadedByEmail: userEmail,
                fileSize: fileData.fileSize,
                mimeType: fileData.mimeType,
                storageProvider: StorageProvider.AZURE,
                storagePath: blobUpload.path,
            };
            // Step 6: Create document shard
            const structuredData = {
                name: metadata.name || fileData.fileName,
                description: metadata.description,
                documentType: metadata.documentType,
                mimeType: fileData.mimeType,
                fileSize: fileData.fileSize,
                storageProvider: StorageProvider.AZURE,
                storagePath: blobUpload.path,
                category: metadata.category,
                tags: metadata.tags || [],
                visibility: metadata.visibility || tenantSettings.defaultVisibility,
                version,
                versionHistory: [versionEntry],
                uploadedBy: userId,
                uploadedByEmail: userEmail,
                uploadedAt: new Date(),
            };
            const shard = await this.shardRepository.create({
                tenantId,
                userId,
                shardTypeId: 'c_document',
                structuredData,
                status: ShardStatus.ACTIVE,
                source: ShardSource.API,
                skipEnqueueing: true, // Don't enqueue for embedding yet
            });
            // Step 7: Update tenant storage usage and counters
            await this.updateTenantCounters(tenantId, fileData.fileSize, tenantSettings);
            // Step 8: Log audit event
            await this.auditLogService.log({
                tenantId,
                category: AuditCategory.DATA_MODIFICATION,
                eventType: AuditEventType.DOCUMENT_UPLOAD,
                severity: AuditSeverity.INFO,
                outcome: AuditOutcome.SUCCESS,
                actorId: userId,
                actorEmail: userEmail,
                targetId: shard.id,
                targetType: 'document',
                targetName: structuredData.name,
                message: `Document uploaded: ${structuredData.name}`,
                details: {
                    fileName: fileData.fileName,
                    fileSize: fileData.fileSize,
                    mimeType: fileData.mimeType,
                    category: metadata.category,
                    visibility: structuredData.visibility,
                    storageProvider: StorageProvider.AZURE,
                    storagePath: blobUpload.path,
                    container: useQuarantine ? 'quarantine' : 'documents',
                },
            });
            // Step 9: Send messages to queue (BullMQ/Redis)
            if (this.serviceBusService) {
                if (verifyVirus) {
                    // Virus Verification Flow:
                    // Send to document-check-queue
                    try {
                        const projectId = metadata.projectId;
                        const documentCheckMessage = {
                            shardId: shard.id,
                            tenantId,
                            userId,
                            projectId,
                            containerName: useQuarantine ? 'quarantine' : 'documents', // Add container name
                            documentFileName: fileData.fileName,
                            filePath: blobUpload.path,
                            enqueuedAt: new Date().toISOString(),
                        };
                        // We need a new method in ServiceBusService for this, or use a generic send.
                        // Since I cannot modify ServiceBusService concurrently, I'll assume I'll add sendDocumentCheckJob later.
                        // Send document check job to queue (BullMQ)
                        await this.serviceBusService.sendDocumentCheckJob(documentCheckMessage);
                        this.monitoring.trackTrace('Document check job enqueued', SeverityLevel.Information, {
                            shardId: shard.id,
                            tenantId,
                            queue: 'document-check'
                        });
                    }
                    catch (error) {
                        this.monitoring.trackException(error, { operation: 'document-upload.send-check-job' });
                        this.monitoring.trackException(error, {
                            context: 'document-upload.document-check-job',
                            shardId: shard.id,
                            severity: 'warning',
                        });
                    }
                }
                else {
                    // Standard Flow (No Virus Check):
                    // Send to embedding queue AND chunk queue
                    try {
                        const embeddingJobMessage = {
                            shardId: shard.id,
                            tenantId,
                            shardTypeId: 'c_document',
                            revisionNumber: 1,
                            dedupeKey: `doc-embed-${shard.id}-1`,
                            enqueuedAt: new Date().toISOString(),
                        };
                        await this.serviceBusService.sendEmbeddingJob(embeddingJobMessage);
                        this.monitoring.trackTrace('Embedding job enqueued for document', SeverityLevel.Information, {
                            shardId: shard.id,
                            tenantId,
                        });
                    }
                    catch (error) {
                        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                            context: 'document-upload.embedding-job',
                            shardId: shard.id,
                            severity: 'warning',
                        });
                    }
                    try {
                        const projectId = metadata.projectId;
                        const documentChunkJobMessage = {
                            shardId: shard.id,
                            tenantId,
                            userId, // Adding userId as requested
                            projectId, // Adding projectId as requested
                            containerName: useQuarantine ? 'quarantine' : 'documents', // Add container name
                            documentFileName: fileData.fileName,
                            filePath: blobUpload.path,
                            enqueuedAt: new Date().toISOString(),
                        };
                        await this.serviceBusService.sendDocumentChunkJob(documentChunkJobMessage);
                        this.monitoring.trackTrace('Document chunk job enqueued', SeverityLevel.Information, {
                            shardId: shard.id,
                            tenantId,
                        });
                    }
                    catch (error) {
                        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                            context: 'document-upload.chunk-job',
                            shardId: shard.id,
                            severity: 'warning',
                        });
                    }
                }
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackTrace('Document uploaded successfully', SeverityLevel.Information, {
                tenantId,
                userId,
                shardId: shard.id,
                fileName: fileData.fileName,
                fileSize: fileData.fileSize,
                durationMs: duration,
            });
            return {
                success: true,
                shard: shard,
                storagePath: blobUpload.path,
                fileSize: fileData.fileSize,
                uploadDurationMs: duration,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, {
                    context: 'document-upload',
                    tenantId,
                    userId,
                    fileName: fileData.fileName,
                });
            }
            // Log audit failure
            await this.auditLogService.log({
                tenantId,
                category: AuditCategory.DATA_MODIFICATION,
                eventType: AuditEventType.DOCUMENT_UPLOAD,
                severity: AuditSeverity.ERROR,
                outcome: AuditOutcome.FAILURE,
                actorId: userId,
                actorEmail: userEmail,
                targetType: 'document',
                targetName: fileData.fileName,
                message: `Document upload failed: ${fileData.fileName}`,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                details: {
                    fileName: fileData.fileName,
                    fileSize: fileData.fileSize,
                },
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
                errorCode: 'UPLOAD_FAILED',
            };
        }
    }
    /**
     * Initialize chunked upload (for files > 100MB)
     */
    async initializeChunkedUpload(fileName, fileSize, mimeType, metadata, tenantId, userId, _userEmail, tenantSettings, globalSettings) {
        try {
            // Validate without buffer
            const validation = await this.validationService.validateUpload(fileName, fileSize, mimeType, tenantSettings, globalSettings);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join('; '),
                    errorCode: 'VALIDATION_FAILED',
                };
            }
            // Validate metadata
            const metadataValidation = await this.validateMetadata(metadata, tenantSettings);
            if (!metadataValidation.valid) {
                return {
                    success: false,
                    error: metadataValidation.errors.join('; '),
                    errorCode: 'METADATA_VALIDATION_FAILED',
                };
            }
            // Generate shard ID
            const shardId = uuidv4();
            const version = 1;
            // Initialize chunked upload
            const initResult = await this.blobStorageService.initChunkedUpload(tenantId, shardId, version, fileName, fileSize, mimeType, userId, {
                name: metadata.name,
                category: metadata.category,
                tags: metadata.tags,
                visibility: metadata.visibility,
                description: metadata.description,
            }, true // useQuarantine
            );
            this.monitoring.trackTrace('Chunked upload initialized', SeverityLevel.Information, {
                tenantId,
                userId,
                sessionId: initResult.sessionId,
                fileName,
                fileSize,
                totalChunks: initResult.totalChunks,
            });
            return {
                success: true,
                ...initResult,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, {
                    context: 'document-upload-init',
                    tenantId,
                    userId,
                    fileName,
                });
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Initialization failed',
                errorCode: 'INIT_FAILED',
            };
        }
    }
    /**
     * Complete chunked upload and create document shard
     */
    async completeChunkedUpload(sessionId, tenantId, userId, userEmail, tenantSettings) {
        const startTime = Date.now();
        try {
            // Get session
            const session = this.blobStorageService.getChunkedUploadSession(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: 'Upload session not found or expired',
                    errorCode: 'SESSION_NOT_FOUND',
                };
            }
            // Complete blob upload
            const completeResult = await this.blobStorageService.completeChunkedUpload(sessionId, {
                mimeType: session.mimeType,
                metadata: {
                    tenantId,
                    userId,
                    originalFileName: session.fileName,
                },
            });
            // Extract shard ID from blob path
            const pathParts = this.blobStorageService.parseBlobPath(completeResult.blobPath);
            if (!pathParts) {
                throw new DocumentUploadError('Failed to parse blob path', 'INVALID_BLOB_PATH');
            }
            // const shardId = pathParts.shardId; // Unused
            const version = pathParts.version;
            // Create version history entry
            const versionEntry = {
                version,
                uploadedAt: new Date(),
                uploadedBy: userId,
                uploadedByEmail: userEmail,
                fileSize: session.fileSize,
                mimeType: session.mimeType,
                storageProvider: StorageProvider.AZURE,
                storagePath: completeResult.blobPath,
            };
            // Create document shard
            const structuredData = {
                name: session.documentMetadata.name || session.fileName,
                description: session.documentMetadata.description,
                mimeType: session.mimeType,
                fileSize: session.fileSize,
                storageProvider: StorageProvider.AZURE,
                storagePath: completeResult.blobPath,
                category: session.documentMetadata.category,
                tags: session.documentMetadata.tags || [],
                visibility: session.documentMetadata.visibility || tenantSettings.defaultVisibility,
                version,
                versionHistory: [versionEntry],
                uploadedBy: userId,
                uploadedByEmail: userEmail,
                uploadedAt: new Date(),
            };
            const shard = await this.shardRepository.create({
                tenantId,
                userId,
                shardTypeId: 'c_document',
                structuredData,
                status: ShardStatus.ACTIVE,
                source: ShardSource.API,
                skipEnqueueing: true,
            });
            // Update tenant counters
            await this.updateTenantCounters(tenantId, session.fileSize, tenantSettings);
            // Log audit event
            await this.auditLogService.log({
                tenantId,
                category: AuditCategory.DATA_MODIFICATION,
                eventType: AuditEventType.DOCUMENT_UPLOAD,
                severity: AuditSeverity.INFO,
                outcome: AuditOutcome.SUCCESS,
                actorId: userId,
                actorEmail: userEmail,
                targetId: shard.id,
                targetType: 'document',
                targetName: structuredData.name,
                message: `Document uploaded (chunked): ${structuredData.name}`,
                details: {
                    fileName: session.fileName,
                    fileSize: session.fileSize,
                    mimeType: session.mimeType,
                    totalChunks: session.totalChunks,
                    category: session.documentMetadata.category,
                    visibility: structuredData.visibility,
                    storagePath: completeResult.blobPath,
                },
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackTrace('Chunked upload completed successfully', SeverityLevel.Information, {
                tenantId,
                userId,
                shardId: shard.id,
                sessionId,
                fileName: session.fileName,
                fileSize: session.fileSize,
                durationMs: duration,
            });
            return {
                success: true,
                shard: shard,
                storagePath: completeResult.blobPath,
                fileSize: session.fileSize,
                uploadDurationMs: duration,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, {
                    context: 'document-upload-complete',
                    tenantId,
                    userId,
                    sessionId,
                });
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Completion failed',
                errorCode: 'COMPLETION_FAILED',
            };
        }
    }
    /**
     * Validate upload
     */
    async validateUpload(fileData, tenantSettings, globalSettings) {
        // Reset rate limit counters if needed
        const resetResult = this.validationService.resetRateLimitCounters(tenantSettings);
        if (resetResult.dailyReset || resetResult.monthlyReset) {
            // Update tenant settings with reset counters
            Object.assign(tenantSettings, resetResult.updatedSettings);
        }
        return this.validationService.validateUpload(fileData.fileName, fileData.fileSize, fileData.mimeType, tenantSettings, globalSettings);
    }
    /**
     * Validate metadata
     */
    async validateMetadata(metadata, tenantSettings) {
        const errors = [];
        // Validate category
        if (metadata.category) {
            const categoryValidation = this.validationService.validateCategory(metadata.category, tenantSettings);
            if (!categoryValidation.valid && categoryValidation.error) {
                errors.push(categoryValidation.error);
            }
        }
        // Validate tags
        if (metadata.tags && metadata.tags.length > 0) {
            const tagsValidation = this.validationService.validateTags(metadata.tags, tenantSettings);
            if (!tagsValidation.valid) {
                errors.push(...tagsValidation.errors);
            }
        }
        // Validate visibility
        if (metadata.visibility) {
            const visibilityValidation = this.validationService.validateVisibility(metadata.visibility, tenantSettings);
            if (!visibilityValidation.valid && visibilityValidation.error) {
                errors.push(visibilityValidation.error);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Update tenant storage counters
     */
    async updateTenantCounters(tenantId, fileSize, tenantSettings) {
        // This should be implemented to update the tenant document
        // For now, just log the action
        this.monitoring.trackTrace('Tenant counters should be updated', SeverityLevel.Information, {
            tenantId,
            fileSize,
            newStorageUsed: tenantSettings.currentStorageUsed + fileSize,
            newDailyCount: tenantSettings.dailyUploadCount + 1,
            newMonthlyCount: tenantSettings.monthlyUploadCount + 1,
        });
        // TODO: Implement actual tenant document update
        // await this.tenantRepository.update(tenantId, {
        //   'documentSettings.currentStorageUsed': tenantSettings.currentStorageUsed + fileSize,
        //   'documentSettings.dailyUploadCount': tenantSettings.dailyUploadCount + 1,
        //   'documentSettings.monthlyUploadCount': tenantSettings.monthlyUploadCount + 1,
        // });
    }
}
//# sourceMappingURL=document-upload.service.js.map