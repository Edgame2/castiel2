/**
 * Azure Blob Storage Service
 * Handles file upload, download, and management in Azure Blob Storage
 * @module integration-processors/services
 */

import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

export interface BlobStorageServiceConfig {
  connectionString: string;
  containerName: string;
}

/**
 * Azure Blob Storage Service
 */
export class BlobStorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private config: BlobStorageServiceConfig;

  constructor(config: BlobStorageServiceConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    if (!this.config.connectionString) {
      throw new Error('Azure Blob Storage connection string is required');
    }

    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(this.config.connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(this.config.containerName);
    } catch (error: any) {
      throw new Error(`Failed to initialize Blob Storage client: ${error.message}`);
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
      await this.containerClient.createIfNotExists();
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
  ): Promise<{ path: string; size: number; url: string }> {
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
        url: blobClient.url,
      };
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Generate SAS URL for secure download
   */
  generateSasUrl(
    blobPath: string,
    expiresInMinutes: number = 60
  ): { url: string; expiresAt: Date } {
    if (!this.containerClient || !this.config.connectionString) {
      throw new Error('Container client not initialized');
    }

    try {
      // Extract account name and key from connection string
      const connectionStringParts = this.config.connectionString.split(';');
      const accountName = connectionStringParts.find((p) => p.startsWith('AccountName='))?.split('=')[1];
      const accountKey = connectionStringParts.find((p) => p.startsWith('AccountKey='))?.split('=')[1];

      if (!accountName || !accountKey) {
        throw new Error('Failed to extract account name or key from connection string');
      }

      const blobClient = this.containerClient.getBlockBlobClient(blobPath);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.config.containerName,
          blobName: blobPath,
          permissions: BlobSASPermissions.parse('r'), // read-only
          expiresOn: expiresAt,
        },
        credential
      ).toString();

      return {
        url: `${blobClient.url}?${sasToken}`,
        expiresAt,
      };
    } catch (error: any) {
      throw new Error(`Failed to generate SAS URL: ${error.message}`);
    }
  }
}
