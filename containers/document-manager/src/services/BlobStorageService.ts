/**
 * Azure Blob Storage Service
 * Handles file upload, download, and management in Azure Blob Storage
 */

import {
  BlobServiceClient,
  ContainerClient,
  BlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { StorageProvider } from '../types/document.types';

export interface BlobStorageConfig {
  provider: StorageProvider;
  azure?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
}

export class BlobStorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private config: BlobStorageConfig;

  constructor(config: BlobStorageConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    if (this.config.provider === StorageProvider.AZURE) {
      if (!this.config.azure) {
        throw new Error('Azure storage configuration is required');
      }

      const { accountName, accountKey, containerName } = this.config.azure;
      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );
      this.containerClient = this.blobServiceClient.getContainerClient(containerName);
    } else {
      throw new Error(`Storage provider ${this.config.provider} is not yet implemented`);
    }
  }

  /**
   * Ensure container exists
   */
  async ensureContainer(): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Container client not initialized');
    }

    try {
      await this.containerClient.createIfNotExists({
        access: 'private',
      });
    } catch (error: any) {
      throw new Error(`Failed to ensure container exists: ${error.message}`);
    }
  }

  /**
   * Upload file to blob storage
   */
  async uploadFile(
    blobPath: string,
    fileBuffer: Buffer,
    contentType?: string
  ): Promise<{ path: string; size: number }> {
    if (!this.containerClient) {
      throw new Error('Container client not initialized');
    }

    await this.ensureContainer();

    const blobClient = this.containerClient.getBlockBlobClient(blobPath);

    try {
      await blobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType || 'application/octet-stream',
        },
      });

      return {
        path: blobPath,
        size: fileBuffer.length,
      };
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download file from blob storage
   */
  async downloadFile(blobPath: string): Promise<Buffer> {
    if (!this.containerClient) {
      throw new Error('Container client not initialized');
    }

    const blobClient = this.containerClient.getBlockBlobClient(blobPath);

    try {
      const downloadResponse = await blobClient.download();
      if (!downloadResponse.readableStreamBody) {
        throw new NotFoundError(`File not found: ${blobPath}`);
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.statusCode === 404) {
        throw new NotFoundError(`File not found: ${blobPath}`);
      }
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Generate SAS URL for secure download
   */
  generateDownloadUrl(
    blobPath: string,
    expiresInMinutes: number = 15
  ): { url: string; expiresAt: Date } {
    if (!this.containerClient || !this.config.azure) {
      throw new Error('Container client not initialized');
    }

    const blobClient = this.containerClient.getBlockBlobClient(blobPath);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const credential = new StorageSharedKeyCredential(
      this.config.azure.accountName,
      this.config.azure.accountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.config.azure.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'), // Read only
        startsOn: new Date(),
        expiresOn: expiresAt,
      },
      credential
    ).toString();

    const url = `${blobClient.url}?${sasToken}`;

    return {
      url,
      expiresAt,
    };
  }

  /**
   * Generate SAS URL for upload
   */
  generateUploadUrl(
    blobPath: string,
    expiresInMinutes: number = 60
  ): { url: string; expiresAt: Date } {
    if (!this.containerClient || !this.config.azure) {
      throw new Error('Container client not initialized');
    }

    const blobClient = this.containerClient.getBlockBlobClient(blobPath);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const credential = new StorageSharedKeyCredential(
      this.config.azure.accountName,
      this.config.azure.accountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.config.azure.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('w'), // Write only
        startsOn: new Date(),
        expiresOn: expiresAt,
      },
      credential
    ).toString();

    const url = `${blobClient.url}?${sasToken}`;

    return {
      url,
      expiresAt,
    };
  }

  /**
   * Delete file from blob storage
   */
  async deleteFile(blobPath: string): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Container client not initialized');
    }

    const blobClient = this.containerClient.getBlockBlobClient(blobPath);

    try {
      await blobClient.delete();
    } catch (error: any) {
      if (error.statusCode === 404) {
        // File doesn't exist, consider it deleted
        return;
      }
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(blobPath: string): Promise<boolean> {
    if (!this.containerClient) {
      throw new Error('Container client not initialized');
    }

    const blobClient = this.containerClient.getBlockBlobClient(blobPath);

    try {
      await blobClient.getProperties();
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file properties
   */
  async getFileProperties(blobPath: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  }> {
    if (!this.containerClient) {
      throw new Error('Container client not initialized');
    }

    const blobClient = this.containerClient.getBlockBlobClient(blobPath);

    try {
      const properties = await blobClient.getProperties();
      return {
        size: properties.contentLength || 0,
        contentType: properties.contentType || 'application/octet-stream',
        lastModified: properties.lastModified || new Date(),
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new NotFoundError(`File not found: ${blobPath}`);
      }
      throw new Error(`Failed to get file properties: ${error.message}`);
    }
  }
}

