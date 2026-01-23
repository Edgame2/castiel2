/**
 * Document Upload Service
 * Orchestrates document upload: validation, blob storage, shard creation
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { AzureBlobStorageService } from './azure-blob-storage.service.js';
import { DocumentValidationService } from './document-validation.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { AuditLogService } from './audit/audit-log.service.js';
import { QueueService } from './queue.service.js';
import { DocumentUploadResult, TenantDocumentSettings, GlobalDocumentSettings, CreateDocumentRequest } from '../types/document.types.js';
import { BaseError } from '../utils/errors.js';
export declare class DocumentUploadError extends BaseError {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
/**
 * Upload file data
 */
interface UploadFileData {
    fileName: string;
    fileBuffer: Buffer;
    fileSize: number;
    mimeType: string;
}
/**
 * Document Upload Service
 */
export declare class DocumentUploadService {
    private blobStorageService;
    private validationService;
    private shardRepository;
    private auditLogService;
    private monitoring;
    private serviceBusService?;
    constructor(blobStorageService: AzureBlobStorageService, validationService: DocumentValidationService, shardRepository: ShardRepository, auditLogService: AuditLogService, monitoring: IMonitoringProvider, serviceBusService?: QueueService | undefined);
    /**
     * Upload a single document (simple upload < 100MB)
     */
    uploadDocument(fileData: UploadFileData, metadata: CreateDocumentRequest, tenantId: string, userId: string, userEmail: string, tenantSettings: TenantDocumentSettings, globalSettings: GlobalDocumentSettings): Promise<DocumentUploadResult>;
    /**
     * Initialize chunked upload (for files > 100MB)
     */
    initializeChunkedUpload(fileName: string, fileSize: number, mimeType: string, metadata: CreateDocumentRequest, tenantId: string, userId: string, _userEmail: string, tenantSettings: TenantDocumentSettings, globalSettings: GlobalDocumentSettings): Promise<{
        success: boolean;
        sessionId?: string;
        uploadUrl?: string;
        chunkSize?: number;
        totalChunks?: number;
        error?: string;
        errorCode?: string;
    }>;
    /**
     * Complete chunked upload and create document shard
     */
    completeChunkedUpload(sessionId: string, tenantId: string, userId: string, userEmail: string, tenantSettings: TenantDocumentSettings): Promise<DocumentUploadResult>;
    /**
     * Validate upload
     */
    private validateUpload;
    /**
     * Validate metadata
     */
    private validateMetadata;
    /**
     * Update tenant storage counters
     */
    private updateTenantCounters;
}
export {};
//# sourceMappingURL=document-upload.service.d.ts.map