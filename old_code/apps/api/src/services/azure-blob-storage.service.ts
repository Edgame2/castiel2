/**
 * Azure Blob Storage Service
 * Handles document storage, chunked uploads, SAS token generation
 */

import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
  BlobUploadCommonResponse,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Redis } from 'ioredis';
import type { ChunkedUploadSession } from '../types/document.types.js';
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

export class AzureBlobStorageError extends BaseError {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AzureBlobStorageError';
  }
}

/**
 * Azure Blob Storage Service
 */
export class AzureBlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private documentsContainer: string;
  private quarantineContainer: string;
  private accountName: string;
  private accountKey: string;
  private sharedKeyCredential: StorageSharedKeyCredential;

  // Redis session storage (with in-memory fallback)
  private uploadSessions: Map<string, ChunkedUploadSession> = new Map();
  private redis?: Redis;
  private readonly SESSION_KEY_PREFIX = 'chunked-upload-session:';
  private readonly SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

  constructor(
    private config: AzureBlobStorageConfig,
    private monitoring: IMonitoringProvider,
    redis?: Redis
  ) {
    this.redis = redis;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      config.connectionString
    );
    this.documentsContainer = config.documentsContainer;
    this.quarantineContainer = config.quarantineContainer;
    this.accountName = config.accountName;
    this.accountKey = config.accountKey;
    this.sharedKeyCredential = new StorageSharedKeyCredential(
      config.accountName,
      config.accountKey
    );

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
  async ensureContainersExist(): Promise<void> {
    try {
      const documentsContainerClient = this.blobServiceClient.getContainerClient(
        this.documentsContainer
      );
      await documentsContainerClient.createIfNotExists({
        access: undefined, // Private access
      });

      const quarantineContainerClient = this.blobServiceClient.getContainerClient(
        this.quarantineContainer
      );
      await quarantineContainerClient.createIfNotExists({
        access: undefined, // Private access
      });

      this.monitoring.trackEvent('Blob storage containers verified');
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to initialize blob storage containers',
        'CONTAINER_INIT_ERROR',
        error
      );
    }
  }

  /**
   * Get container client
   */
  private getContainerClient(containerName: string): ContainerClient {
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
  async uploadFile(
    tenantId: string,
    shardId: string,
    version: number,
    fileName: string,
    fileBuffer: Buffer,
    options: UploadOptions,
    useQuarantine: boolean = true
  ): Promise<{ url: string; path: string }> {
    const startTime = Date.now();

    try {
      const containerName = useQuarantine
        ? this.quarantineContainer
        : this.documentsContainer;

      const blobPath = this.constructBlobPath(
        tenantId,
        shardId,
        version,
        fileName,
        useQuarantine
      );

      const containerClient = this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

      // Upload with options
      const uploadResponse = await blockBlobClient.upload(
        fileBuffer,
        fileBuffer.length,
        {
          blobHTTPHeaders: {
            blobContentType: options.mimeType,
          },
          metadata: options.metadata,
          tags: options.tags,
        }
      );

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
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to upload file',
        'UPLOAD_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // CHUNKED UPLOAD (> 100MB, resumable)
  // ============================================================================

  /**
   * Initialize chunked upload session
   */
  async initChunkedUpload(
    tenantId: string,
    shardId: string,
    version: number,
    fileName: string,
    fileSize: number,
    mimeType: string,
    userId: string,
    documentMetadata: ChunkedUploadSession['documentMetadata'],
    useQuarantine: boolean = true
  ): Promise<InitChunkedUploadResult> {
    try {
      const sessionId = uuidv4();
      const chunkSize = 4 * 1024 * 1024; // 4MB chunks
      const totalChunks = Math.ceil(fileSize / chunkSize);

      const containerName = useQuarantine
        ? this.quarantineContainer
        : this.documentsContainer;

      const blobPath = this.constructBlobPath(
        tenantId,
        shardId,
        version,
        fileName,
        useQuarantine
      );

      // Create session
      const session: ChunkedUploadSession = {
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

      // Store session in Redis (with in-memory fallback)
      await this.setSession(sessionId, session);

      // Clean up expired sessions (async, non-blocking)
      this.cleanupExpiredSessions().catch((error) => {
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          context: 'azure-blob-storage.cleanup-expired-sessions',
        });
      });

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
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to initialize chunked upload',
        'CHUNKED_INIT_ERROR',
        error
      );
    }
  }

  /**
   * Upload a single chunk
   */
  async uploadChunk(
    sessionId: string,
    chunkNumber: number,
    chunkData: Buffer
  ): Promise<UploadChunkResult> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new AzureBlobStorageError(
          'Upload session not found or expired',
          'SESSION_NOT_FOUND'
        );
      }

      // Check if session expired
      if (new Date() > session.expiresAt) {
        await this.deleteSession(sessionId);
        throw new AzureBlobStorageError(
          'Upload session expired',
          'SESSION_EXPIRED'
        );
      }

      // Generate block ID (base64 encoded, consistent length)
      const blockId = Buffer.from(
        `block-${chunkNumber.toString().padStart(6, '0')}`
      ).toString('base64');

      const containerClient = this.getContainerClient(session.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(session.blobPath);

      // Upload block
      await blockBlobClient.stageBlock(blockId, chunkData, chunkData.length);

      // Update session
      session.uploadedChunks.push(chunkNumber);
      session.blockIds.push(blockId);
      session.lastChunkAt = new Date();
      await this.setSession(sessionId, session);

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
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to upload chunk',
        'CHUNK_UPLOAD_ERROR',
        error
      );
    }
  }

  /**
   * Complete chunked upload
   */
  async completeChunkedUpload(
    sessionId: string,
    options: UploadOptions
  ): Promise<CompleteChunkedUploadResult> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new AzureBlobStorageError(
          'Upload session not found',
          'SESSION_NOT_FOUND'
        );
      }

      // Verify all chunks uploaded
      if (session.uploadedChunks.length !== session.totalChunks) {
        throw new AzureBlobStorageError(
          `Missing chunks: ${session.totalChunks - session.uploadedChunks.length} remaining`,
          'INCOMPLETE_UPLOAD'
        );
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
      await this.deleteSession(sessionId);

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
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to complete chunked upload',
        'COMPLETE_UPLOAD_ERROR',
        error
      );
    }
  }

  /**
   * Cancel chunked upload session
   */
  async cancelChunkedUpload(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.deleteSession(sessionId);
      this.monitoring.trackEvent('Chunked upload cancelled', { sessionId });
    }
  }

  /**
   * Get chunked upload session
   */
  async getChunkedUploadSession(sessionId: string): Promise<ChunkedUploadSession | undefined> {
    return await this.getSession(sessionId);
  }

  /**
   * Get session from Redis or in-memory fallback
   */
  private async getSession(sessionId: string): Promise<ChunkedUploadSession | undefined> {
    if (this.redis) {
      try {
        const key = `${this.SESSION_KEY_PREFIX}${sessionId}`;
        const data = await this.redis.get(key);
        if (data) {
          const session = JSON.parse(data) as ChunkedUploadSession;
          // Convert date strings back to Date objects
          session.createdAt = new Date(session.createdAt);
          session.expiresAt = new Date(session.expiresAt);
          if (session.lastChunkAt) {
            session.lastChunkAt = new Date(session.lastChunkAt);
          }
          return session;
        }
        return undefined;
      } catch (error) {
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          context: 'azure-blob-storage.get-session-redis',
          sessionId,
        });
        // Fallback to in-memory
        return this.uploadSessions.get(sessionId);
      }
    }
    return this.uploadSessions.get(sessionId);
  }

  /**
   * Set session in Redis or in-memory fallback
   */
  private async setSession(sessionId: string, session: ChunkedUploadSession): Promise<void> {
    if (this.redis) {
      try {
        const key = `${this.SESSION_KEY_PREFIX}${sessionId}`;
        const data = JSON.stringify(session);
        await this.redis.setex(key, this.SESSION_TTL, data);
        return;
      } catch (error) {
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          context: 'azure-blob-storage.set-session-redis',
          sessionId,
        });
        // Fallback to in-memory
        this.uploadSessions.set(sessionId, session);
      }
    } else {
      this.uploadSessions.set(sessionId, session);
    }
  }

  /**
   * Delete session from Redis or in-memory fallback
   */
  private async deleteSession(sessionId: string): Promise<void> {
    if (this.redis) {
      try {
        const key = `${this.SESSION_KEY_PREFIX}${sessionId}`;
        await this.redis.del(key);
        return;
      } catch (error) {
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          context: 'azure-blob-storage.delete-session-redis',
          sessionId,
        });
        // Fallback to in-memory
        this.uploadSessions.delete(sessionId);
      }
    } else {
      this.uploadSessions.delete(sessionId);
    }
  }

  /**
   * Clean up expired sessions (Redis TTL handles expiration automatically, but we clean in-memory fallback)
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    
    // Clean up in-memory sessions (fallback)
    for (const [sessionId, session] of this.uploadSessions.entries()) {
      if (now > session.expiresAt) {
        this.uploadSessions.delete(sessionId);
      }
    }

    // Redis TTL automatically expires keys, but we can optionally scan for expired keys
    // This is optional since Redis handles TTL automatically
    if (this.redis) {
      try {
        // Optional: Scan for expired sessions (Redis TTL handles this automatically)
        // This is just for monitoring/cleanup purposes
        const pattern = `${this.SESSION_KEY_PREFIX}*`;
        const stream = this.redis.scanStream({
          match: pattern,
          count: 100,
        });

        let expiredCount = 0;
        for await (const keys of stream) {
          for (const key of keys) {
            const ttl = await this.redis.ttl(key);
            if (ttl === -1) {
              // Key exists but has no TTL (shouldn't happen, but handle it)
              await this.redis.del(key);
              expiredCount++;
            }
          }
        }

        if (expiredCount > 0) {
          this.monitoring.trackEvent('chunked-upload.cleanup-expired-redis', {
            expiredCount,
          });
        }
      } catch (error) {
        // Non-critical: Redis cleanup failed, but TTL will handle expiration
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          context: 'azure-blob-storage.cleanup-expired-redis',
          severity: 'warning',
        });
      }
    }
  }

  // ============================================================================
  // DOWNLOAD & SAS TOKEN GENERATION
  // ============================================================================

  /**
   * Generate SAS URL for download (15-minute expiry)
   */
  async generateDownloadUrl(
    blobPath: string,
    containerName?: string,
    expiryMinutes: number = 15
  ): Promise<{ url: string; expiresAt: Date }> {
    try {
      const container = containerName || this.documentsContainer;
      const containerClient = this.getContainerClient(container);
      const blobClient = containerClient.getBlobClient(blobPath);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

      // account for clock skew
      const startsOn = new Date();
      startsOn.setMinutes(startsOn.getMinutes() - 5);

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: container,
          blobName: blobPath,
          permissions: BlobSASPermissions.parse('r'), // Read only
          startsOn,
          expiresOn: expiresAt,
        },
        this.sharedKeyCredential
      ).toString();

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
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to generate download URL',
        'SAS_GENERATION_ERROR',
        error
      );
    }
  }

  /**
   * Download blob as buffer
   */
  async downloadBlob(blobPath: string, containerName?: string): Promise<Buffer> {
    try {
      const container = containerName || this.documentsContainer;
      const containerClient = this.getContainerClient(container);
      const blobClient = containerClient.getBlobClient(blobPath);

      const downloadResponse = await blobClient.download();
      const chunks: Buffer[] = [];

      if (downloadResponse.readableStreamBody) {
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(Buffer.from(chunk));
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to download blob',
        'DOWNLOAD_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  /**
   * Delete blob
   */
  async deleteBlob(blobPath: string, containerName?: string): Promise<void> {
    try {
      const container = containerName || this.documentsContainer;
      const containerClient = this.getContainerClient(container);
      const blobClient = containerClient.getBlobClient(blobPath);

      await blobClient.delete();

      this.monitoring.trackEvent('Blob deleted', { blobPath, container });
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to delete blob',
        'DELETE_ERROR',
        error
      );
    }
  }

  /**
   * Move blob from quarantine to documents
   */
  async moveFromQuarantine(
    quarantinePath: string,
    tenantId: string,
    shardId: string,
    version: number,
    fileName: string
  ): Promise<string> {
    try {
      const destinationPath = this.constructBlobPath(
        tenantId,
        shardId,
        version,
        fileName,
        false
      );

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
    } catch (error) {
      if (error instanceof Error) {
        this.monitoring.trackException(error, { context: 'azure-blob-storage' });
      }
      throw new AzureBlobStorageError(
        'Failed to move blob from quarantine',
        'MOVE_ERROR',
        error
      );
    }
  }

  /**
   * Check if blob exists
   */
  async blobExists(blobPath: string, containerName?: string): Promise<boolean> {
    try {
      const container = containerName || this.documentsContainer;
      const containerClient = this.getContainerClient(container);
      const blobClient = containerClient.getBlobClient(blobPath);

      return await blobClient.exists();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get blob metadata
   */
  async getBlobMetadata(
    blobPath: string,
    containerName?: string
  ): Promise<{ size: number; contentType: string; lastModified: Date }> {
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
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to get blob metadata',
        'METADATA_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Construct blob path
   */
  private constructBlobPath(
    tenantId: string,
    shardId: string,
    version: number,
    fileName: string,
    useQuarantine: boolean
  ): string {
    if (useQuarantine) {
      return `quarantine/${tenantId}/${shardId}/v${version}/${fileName}`;
    } else {
      return `${tenantId}/documents/${shardId}/v${version}/${fileName}`;
    }
  }

  /**
   * Parse blob path to extract components
   */
  parseBlobPath(blobPath: string): {
    tenantId: string;
    shardId: string;
    version: number;
    fileName: string;
    isQuarantine: boolean;
  } | null {
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
  async listBlobs(
    prefix: string,
    containerName?: string
  ): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    try {
      const container = containerName || this.documentsContainer;
      const containerClient = this.getContainerClient(container);
      const blobs: Array<{ name: string; size: number; lastModified: Date }> = [];

      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
        });
      }

      return blobs;
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      throw new AzureBlobStorageError(
        'Failed to list blobs',
        'LIST_ERROR',
        error
      );
    }
  }

  /**
   * Calculate tenant storage usage
   */
  async calculateTenantStorageUsage(tenantId: string): Promise<number> {
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
    } catch (error) {
      if (error instanceof Error) { this.monitoring.trackException(error, { context: 'azure-blob-storage' }); }
      return 0;
    }
  }
}
