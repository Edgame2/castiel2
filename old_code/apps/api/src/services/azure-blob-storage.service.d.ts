/**
 * Azure Blob Storage Service
 * Handles document storage, chunked uploads, SAS token generation
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ChunkedUploadSession } from '../types/document.types.js';
import { BaseError } from '../utils/errors.js';
/**
 * Azure Blob Storage configuration
 */
interface AzureBlobStorageConfig {
    connectionString: string;
    accountName: string;
    accountKey: string;
    documentsContainer: string;
    quarantineContainer: string;
}
/**
 * Upload options
 */
interface UploadOptions {
    mimeType: string;
    metadata?: Record<string, string>;
    tags?: Record<string, string>;
}
/**
 * Chunked upload initialization result
 */
interface InitChunkedUploadResult {
    sessionId: string;
    uploadUrl: string;
    chunkSize: number;
    totalChunks: number;
}
/**
 * Chunk upload result
 */
interface UploadChunkResult {
    chunkNumber: number;
    blockId: string;
    uploaded: boolean;
}
/**
 * Complete chunked upload result
 */
interface CompleteChunkedUploadResult {
    blobUrl: string;
    blobPath: string;
    fileSize: number;
}
export declare class AzureBlobStorageError extends BaseError {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
/**
 * Azure Blob Storage Service
 */
export declare class AzureBlobStorageService {
    private config;
    private monitoring;
    private blobServiceClient;
    private documentsContainer;
    private quarantineContainer;
    private accountName;
    private accountKey;
    private sharedKeyCredential;
    private uploadSessions;
    constructor(config: AzureBlobStorageConfig, monitoring: IMonitoringProvider);
    /**
     * Ensure containers exist
     */
    ensureContainersExist(): Promise<void>;
    /**
     * Get container client
     */
    private getContainerClient;
    /**
     * Upload file to blob storage
     * @param tenantId Tenant ID
     * @param shardId Shard ID
     * @param version Version number
     * @param fileName File name
     * @param fileBuffer File buffer
     * @param options Upload options
     * @param useQuarantine Whether to upload to quarantine (default: true)
     */
    uploadFile(tenantId: string, shardId: string, version: number, fileName: string, fileBuffer: Buffer, options: UploadOptions, useQuarantine?: boolean): Promise<{
        url: string;
        path: string;
    }>;
    /**
     * Initialize chunked upload session
     */
    initChunkedUpload(tenantId: string, shardId: string, version: number, fileName: string, fileSize: number, mimeType: string, userId: string, documentMetadata: ChunkedUploadSession['documentMetadata'], useQuarantine?: boolean): Promise<InitChunkedUploadResult>;
    /**
     * Upload a single chunk
     */
    uploadChunk(sessionId: string, chunkNumber: number, chunkData: Buffer): Promise<UploadChunkResult>;
    /**
     * Complete chunked upload
     */
    completeChunkedUpload(sessionId: string, options: UploadOptions): Promise<CompleteChunkedUploadResult>;
    /**
     * Cancel chunked upload session
     */
    cancelChunkedUpload(sessionId: string): Promise<void>;
    /**
     * Get chunked upload session
     */
    getChunkedUploadSession(sessionId: string): ChunkedUploadSession | undefined;
    /**
     * Clean up expired sessions
     */
    private cleanupExpiredSessions;
    /**
     * Generate SAS URL for download (15-minute expiry)
     */
    generateDownloadUrl(blobPath: string, containerName?: string, expiryMinutes?: number): Promise<{
        url: string;
        expiresAt: Date;
    }>;
    /**
     * Download blob as buffer
     */
    downloadBlob(blobPath: string, containerName?: string): Promise<Buffer>;
    /**
     * Delete blob
     */
    deleteBlob(blobPath: string, containerName?: string): Promise<void>;
    /**
     * Move blob from quarantine to documents
     */
    moveFromQuarantine(quarantinePath: string, tenantId: string, shardId: string, version: number, fileName: string): Promise<string>;
    /**
     * Check if blob exists
     */
    blobExists(blobPath: string, containerName?: string): Promise<boolean>;
    /**
     * Get blob metadata
     */
    getBlobMetadata(blobPath: string, containerName?: string): Promise<{
        size: number;
        contentType: string;
        lastModified: Date;
    }>;
    /**
     * Construct blob path
     */
    private constructBlobPath;
    /**
     * Parse blob path to extract components
     */
    parseBlobPath(blobPath: string): {
        tenantId: string;
        shardId: string;
        version: number;
        fileName: string;
        isQuarantine: boolean;
    } | null;
    /**
     * List blobs by prefix
     */
    listBlobs(prefix: string, containerName?: string): Promise<Array<{
        name: string;
        size: number;
        lastModified: Date;
    }>>;
    /**
     * Calculate tenant storage usage
     */
    calculateTenantStorageUsage(tenantId: string): Promise<number>;
}
export {};
//# sourceMappingURL=azure-blob-storage.service.d.ts.map