/**
 * Azure Blob Storage Service
 * Handles document storage, chunked uploads, SAS token generation
 */
import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential, } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { BaseError } from '../utils/errors.js';
export class AzureBlobStorageError extends BaseError {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AzureBlobStorageError';
    }
}
/**
 * Azure Blob Storage Service
 */
export class AzureBlobStorageService {
    config;
    monitoring;
    blobServiceClient;
    documentsContainer;
    quarantineContainer;
    accountName;
    accountKey;
    sharedKeyCredential;
    // In-memory session storage (consider Redis for production)
    uploadSessions = new Map();
    constructor(config, monitoring) {
        this.config = config;
        this.monitoring = monitoring;
        this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
        this.documentsContainer = config.documentsContainer;
        this.quarantineContainer = config.quarantineContainer;
        this.accountName = config.accountName;
        this.accountKey = config.accountKey;
        this.sharedKeyCredential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
        monitoring.trackTrace('AzureBlobStorageService initialized', 1, {
            documentsContainer: this.documentsContainer,
            quarantineContainer: this.quarantineContainer,
        });
    }
    // ============================================================================
    // CONTAINER OPERATIONS
    // ============================================================================
    /**
     * Ensure containers exist
     */
    async ensureContainersExist() {
        try {
            const documentsContainerClient = this.blobServiceClient.getContainerClient(this.documentsContainer);
            await documentsContainerClient.createIfNotExists({
                access: 'private',
            });
            const quarantineContainerClient = this.blobServiceClient.getContainerClient(this.quarantineContainer);
            await quarantineContainerClient.createIfNotExists({
                access: 'private',
            });
            this.monitoring.trackEvent('Blob storage containers verified');
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to initialize blob storage containers', 'CONTAINER_INIT_ERROR', error);
        }
    }
    /**
     * Get container client
     */
    getContainerClient(containerName) {
        return this.blobServiceClient.getContainerClient(containerName);
    }
    // ============================================================================
    // SIMPLE UPLOAD (< 100MB)
    // ============================================================================
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
    async uploadFile(tenantId, shardId, version, fileName, fileBuffer, options, useQuarantine = true) {
        const startTime = Date.now();
        try {
            const containerName = useQuarantine
                ? this.quarantineContainer
                : this.documentsContainer;
            const blobPath = this.constructBlobPath(tenantId, shardId, version, fileName, useQuarantine);
            const containerClient = this.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
            // Upload with options
            const uploadResponse = await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: {
                    blobContentType: options.mimeType,
                },
                metadata: options.metadata,
                tags: options.tags,
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('File uploaded successfully', {
                blobPath,
                fileSize: fileBuffer.length,
                durationMs: duration,
                useQuarantine,
            });
            return {
                url: blockBlobClient.url,
                path: blobPath,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to upload file', 'UPLOAD_ERROR', error);
        }
    }
    // ============================================================================
    // CHUNKED UPLOAD (> 100MB, resumable)
    // ============================================================================
    /**
     * Initialize chunked upload session
     */
    async initChunkedUpload(tenantId, shardId, version, fileName, fileSize, mimeType, userId, documentMetadata, useQuarantine = true) {
        try {
            const sessionId = uuidv4();
            const chunkSize = 4 * 1024 * 1024; // 4MB chunks
            const totalChunks = Math.ceil(fileSize / chunkSize);
            const containerName = useQuarantine
                ? this.quarantineContainer
                : this.documentsContainer;
            const blobPath = this.constructBlobPath(tenantId, shardId, version, fileName, useQuarantine);
            // Create session
            const session = {
                sessionId,
                tenantId,
                userId,
                fileName,
                fileSize,
                mimeType,
                totalChunks,
                chunkSize,
                uploadedChunks: [],
                blockIds: [],
                containerName,
                blobPath,
                documentMetadata,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            };
            // Store session (consider Redis for production)
            this.uploadSessions.set(sessionId, session);
            // Clean up expired sessions
            this.cleanupExpiredSessions();
            this.monitoring.trackEvent('Chunked upload session initialized', {
                sessionId,
                fileSize,
                totalChunks,
                chunkSize,
            });
            return {
                sessionId,
                uploadUrl: blobPath,
                chunkSize,
                totalChunks,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to initialize chunked upload', 'CHUNKED_INIT_ERROR', error);
        }
    }
    /**
     * Upload a single chunk
     */
    async uploadChunk(sessionId, chunkNumber, chunkData) {
        try {
            const session = this.uploadSessions.get(sessionId);
            if (!session) {
                throw new AzureBlobStorageError('Upload session not found or expired', 'SESSION_NOT_FOUND');
            }
            // Check if session expired
            if (new Date() > session.expiresAt) {
                this.uploadSessions.delete(sessionId);
                throw new AzureBlobStorageError('Upload session expired', 'SESSION_EXPIRED');
            }
            // Generate block ID (base64 encoded, consistent length)
            const blockId = Buffer.from(`block-${chunkNumber.toString().padStart(6, '0')}`).toString('base64');
            const containerClient = this.getContainerClient(session.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(session.blobPath);
            // Upload block
            await blockBlobClient.stageBlock(blockId, chunkData, chunkData.length);
            // Update session
            session.uploadedChunks.push(chunkNumber);
            session.blockIds.push(blockId);
            session.lastChunkAt = new Date();
            this.uploadSessions.set(sessionId, session);
            this.monitoring.trackEvent('Chunk uploaded', {
                sessionId,
                chunkNumber,
                totalChunks: session.totalChunks,
                progress: `${session.uploadedChunks.length}/${session.totalChunks}`,
            });
            return {
                chunkNumber,
                blockId,
                uploaded: true,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to upload chunk', 'CHUNK_UPLOAD_ERROR', error);
        }
    }
    /**
     * Complete chunked upload
     */
    async completeChunkedUpload(sessionId, options) {
        try {
            const session = this.uploadSessions.get(sessionId);
            if (!session) {
                throw new AzureBlobStorageError('Upload session not found', 'SESSION_NOT_FOUND');
            }
            // Verify all chunks uploaded
            if (session.uploadedChunks.length !== session.totalChunks) {
                throw new AzureBlobStorageError(`Missing chunks: ${session.totalChunks - session.uploadedChunks.length} remaining`, 'INCOMPLETE_UPLOAD');
            }
            const containerClient = this.getContainerClient(session.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(session.blobPath);
            // Commit block list
            await blockBlobClient.commitBlockList(session.blockIds, {
                blobHTTPHeaders: {
                    blobContentType: options.mimeType || session.mimeType,
                },
                metadata: options.metadata,
                tags: options.tags,
            });
            // Clean up session
            this.uploadSessions.delete(sessionId);
            this.monitoring.trackEvent('Chunked upload completed', {
                sessionId,
                blobPath: session.blobPath,
                fileSize: session.fileSize,
                totalChunks: session.totalChunks,
            });
            return {
                blobUrl: blockBlobClient.url,
                blobPath: session.blobPath,
                fileSize: session.fileSize,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to complete chunked upload', 'COMPLETE_UPLOAD_ERROR', error);
        }
    }
    /**
     * Cancel chunked upload session
     */
    async cancelChunkedUpload(sessionId) {
        const session = this.uploadSessions.get(sessionId);
        if (session) {
            this.uploadSessions.delete(sessionId);
            this.monitoring.trackEvent('Chunked upload cancelled', { sessionId });
        }
    }
    /**
     * Get chunked upload session
     */
    getChunkedUploadSession(sessionId) {
        return this.uploadSessions.get(sessionId);
    }
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = new Date();
        let cleaned = 0;
        for (const [sessionId, session] of this.uploadSessions.entries()) {
            if (now > session.expiresAt) {
                this.uploadSessions.delete(sessionId);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.monitoring.trackEvent('Cleaned up expired upload sessions', { count: cleaned });
        }
    }
    // ============================================================================
    // DOWNLOAD & SAS TOKEN GENERATION
    // ============================================================================
    /**
     * Generate SAS URL for download (15-minute expiry)
     */
    async generateDownloadUrl(blobPath, containerName, expiryMinutes = 15) {
        try {
            const container = containerName || this.documentsContainer;
            const containerClient = this.getContainerClient(container);
            const blobClient = containerClient.getBlobClient(blobPath);
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
            // account for clock skew
            const startsOn = new Date();
            startsOn.setMinutes(startsOn.getMinutes() - 5);
            const sasToken = generateBlobSASQueryParameters({
                containerName: container,
                blobName: blobPath,
                permissions: BlobSASPermissions.parse('r'), // Read only
                startsOn,
                expiresOn: expiresAt,
            }, this.sharedKeyCredential).toString();
            const sasUrl = `${blobClient.url}?${sasToken}`;
            this.monitoring.trackEvent('SAS URL generated', {
                blobPath,
                expiryMinutes,
                expiresAt: expiresAt.toISOString(),
            });
            return {
                url: sasUrl,
                expiresAt,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to generate download URL', 'SAS_GENERATION_ERROR', error);
        }
    }
    /**
     * Download blob as buffer
     */
    async downloadBlob(blobPath, containerName) {
        try {
            const container = containerName || this.documentsContainer;
            const containerClient = this.getContainerClient(container);
            const blobClient = containerClient.getBlobClient(blobPath);
            const downloadResponse = await blobClient.download();
            const chunks = [];
            if (downloadResponse.readableStreamBody) {
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(Buffer.from(chunk));
                }
            }
            return Buffer.concat(chunks);
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to download blob', 'DOWNLOAD_ERROR', error);
        }
    }
    // ============================================================================
    // FILE OPERATIONS
    // ============================================================================
    /**
     * Delete blob
     */
    async deleteBlob(blobPath, containerName) {
        try {
            const container = containerName || this.documentsContainer;
            const containerClient = this.getContainerClient(container);
            const blobClient = containerClient.getBlobClient(blobPath);
            await blobClient.delete();
            this.monitoring.trackEvent('Blob deleted', { blobPath, container });
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to delete blob', 'DELETE_ERROR', error);
        }
    }
    /**
     * Move blob from quarantine to documents
     */
    async moveFromQuarantine(quarantinePath, tenantId, shardId, version, fileName) {
        try {
            const destinationPath = this.constructBlobPath(tenantId, shardId, version, fileName, false);
            const sourceClient = this.getContainerClient(this.quarantineContainer)
                .getBlobClient(quarantinePath);
            const destClient = this.getContainerClient(this.documentsContainer)
                .getBlobClient(destinationPath);
            // Copy to destination
            const copyPoller = await destClient.beginCopyFromURL(sourceClient.url);
            await copyPoller.pollUntilDone();
            // Delete from quarantine
            await sourceClient.delete();
            this.monitoring.trackEvent('Blob moved from quarantine', {
                from: quarantinePath,
                to: destinationPath,
            });
            return destinationPath;
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to move blob from quarantine', 'MOVE_ERROR', error);
        }
    }
    /**
     * Check if blob exists
     */
    async blobExists(blobPath, containerName) {
        try {
            const container = containerName || this.documentsContainer;
            const containerClient = this.getContainerClient(container);
            const blobClient = containerClient.getBlobClient(blobPath);
            return await blobClient.exists();
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get blob metadata
     */
    async getBlobMetadata(blobPath, containerName) {
        try {
            const container = containerName || this.documentsContainer;
            const containerClient = this.getContainerClient(container);
            const blobClient = containerClient.getBlobClient(blobPath);
            const properties = await blobClient.getProperties();
            return {
                size: properties.contentLength || 0,
                contentType: properties.contentType || 'application/octet-stream',
                lastModified: properties.lastModified || new Date(),
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to get blob metadata', 'METADATA_ERROR', error);
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    /**
     * Construct blob path
     */
    constructBlobPath(tenantId, shardId, version, fileName, useQuarantine) {
        if (useQuarantine) {
            return `quarantine/${tenantId}/${shardId}/v${version}/${fileName}`;
        }
        else {
            return `${tenantId}/documents/${shardId}/v${version}/${fileName}`;
        }
    }
    /**
     * Parse blob path to extract components
     */
    parseBlobPath(blobPath) {
        // Pattern: quarantine/{tenantId}/{shardId}/v{version}/{fileName}
        // Or: {tenantId}/documents/{shardId}/v{version}/{fileName}
        const quarantinePattern = /^quarantine\/([^/]+)\/([^/]+)\/v(\d+)\/(.+)$/;
        const documentsPattern = /^([^/]+)\/documents\/([^/]+)\/v(\d+)\/(.+)$/;
        let match = blobPath.match(quarantinePattern);
        if (match) {
            return {
                tenantId: match[1],
                shardId: match[2],
                version: parseInt(match[3], 10),
                fileName: match[4],
                isQuarantine: true,
            };
        }
        match = blobPath.match(documentsPattern);
        if (match) {
            return {
                tenantId: match[1],
                shardId: match[2],
                version: parseInt(match[3], 10),
                fileName: match[4],
                isQuarantine: false,
            };
        }
        return null;
    }
    /**
     * List blobs by prefix
     */
    async listBlobs(prefix, containerName) {
        try {
            const container = containerName || this.documentsContainer;
            const containerClient = this.getContainerClient(container);
            const blobs = [];
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                blobs.push({
                    name: blob.name,
                    size: blob.properties.contentLength || 0,
                    lastModified: blob.properties.lastModified || new Date(),
                });
            }
            return blobs;
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            throw new AzureBlobStorageError('Failed to list blobs', 'LIST_ERROR', error);
        }
    }
    /**
     * Calculate tenant storage usage
     */
    async calculateTenantStorageUsage(tenantId) {
        try {
            const prefix = `${tenantId}/documents/`;
            const blobs = await this.listBlobs(prefix);
            const totalSize = blobs.reduce((sum, blob) => sum + blob.size, 0);
            this.monitoring.trackEvent('Calculated tenant storage usage', {
                tenantId,
                totalSize,
                fileCount: blobs.length,
            });
            return totalSize;
        }
        catch (error) {
            if (error instanceof Error) {
                this.monitoring.trackException(error, { context: 'azure-blob-storage' });
            }
            return 0;
        }
    }
}
//# sourceMappingURL=azure-blob-storage.service.js.map