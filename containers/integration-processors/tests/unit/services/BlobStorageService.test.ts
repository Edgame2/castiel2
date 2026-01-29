/**
 * Azure Blob Storage Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlobStorageService } from '../../../src/services/BlobStorageService';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

// Mock Azure Storage Blob
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn(),
  },
  ContainerClient: vi.fn(),
  generateBlobSASQueryParameters: vi.fn(() => ({
    toString: vi.fn(() => 'sas-token'),
  })),
  BlobSASPermissions: {
    parse: vi.fn(() => ({})),
  },
  StorageSharedKeyCredential: vi.fn(),
}));

describe('BlobStorageService', () => {
  let service: BlobStorageService;
  let mockContainerClient: any;
  let mockBlobClient: any;

  beforeEach(() => {
    mockBlobClient = {
      upload: vi.fn().mockResolvedValue(undefined),
      url: 'https://storage.azure.com/container/blob-path',
    };

    mockContainerClient = {
      createIfNotExists: vi.fn().mockResolvedValue(undefined),
      getBlockBlobClient: vi.fn(() => mockBlobClient),
    };

    (BlobServiceClient.fromConnectionString as any).mockReturnValue({
      getContainerClient: vi.fn(() => mockContainerClient),
    });

    service = new BlobStorageService({
      connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
      containerName: 'test-container',
    });
  });

  describe('constructor', () => {
    it('should initialize with valid connection string', () => {
      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net'
      );
    });

    it('should throw error if connection string is missing', () => {
      expect(() => {
        new BlobStorageService({
          connectionString: '',
          containerName: 'test-container',
        });
      }).toThrow('Azure Blob Storage connection string is required');
    });
  });

  describe('ensureContainer', () => {
    it('should create container if it does not exist', async () => {
      await service.ensureContainer();

      expect(mockContainerClient.createIfNotExists).toHaveBeenCalledWith();
    });

    it('should throw error if container client not initialized', async () => {
      const serviceWithoutClient = new BlobStorageService({
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
        containerName: 'test-container',
      });
      // Access private property to simulate uninitialized state
      (serviceWithoutClient as any).containerClient = null;

      await expect(serviceWithoutClient.ensureContainer()).rejects.toThrow(
        'Container client not initialized'
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const fileBuffer = Buffer.from('test content');
      const blobPath = 'tenant-123/2026/01/27/document.pdf';

      const result = await service.uploadFile(blobPath, fileBuffer, 'application/pdf');

      expect(result.path).toBe(blobPath);
      expect(result.size).toBe(fileBuffer.length);
      expect(result.url).toBe('https://storage.azure.com/container/blob-path');

      expect(mockContainerClient.createIfNotExists).toHaveBeenCalled();
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(blobPath);
      expect(mockBlobClient.upload).toHaveBeenCalledWith(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/pdf',
        },
      });
    });

    it('should use default content type if not provided', async () => {
      const fileBuffer = Buffer.from('test content');
      const blobPath = 'tenant-123/2026/01/27/document';

      await service.uploadFile(blobPath, fileBuffer);

      expect(mockBlobClient.upload).toHaveBeenCalledWith(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/octet-stream',
        },
      });
    });

    it('should throw error if container client not initialized', async () => {
      const serviceWithoutClient = new BlobStorageService({
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
        containerName: 'test-container',
      });
      (serviceWithoutClient as any).containerClient = null;

      await expect(
        serviceWithoutClient.uploadFile('path', Buffer.from('test'))
      ).rejects.toThrow('Container client not initialized');
    });

    it('should handle upload errors', async () => {
      const uploadError = new Error('Upload failed');
      mockBlobClient.upload.mockRejectedValue(uploadError);

      await expect(
        service.uploadFile('path', Buffer.from('test'))
      ).rejects.toThrow('Failed to upload file: Upload failed');
    });
  });

  describe('generateSasUrl', () => {
    it('should generate SAS URL successfully', () => {
      const blobPath = 'tenant-123/2026/01/27/document.pdf';
      const result = service.generateSasUrl(blobPath, 60);

      expect(result.url).toContain('sas-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should use custom expiration time', () => {
      const blobPath = 'tenant-123/2026/01/27/document.pdf';
      const result = service.generateSasUrl(blobPath, 120);

      const expectedExpiry = new Date();
      expectedExpiry.setMinutes(expectedExpiry.getMinutes() + 120);

      // Allow 1 second tolerance
      expect(Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should throw error if container client not initialized', () => {
      const serviceWithoutClient = new BlobStorageService({
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net',
        containerName: 'test-container',
      });
      (serviceWithoutClient as any).containerClient = null;

      expect(() => {
        serviceWithoutClient.generateSasUrl('path');
      }).toThrow('Container client not initialized');
    });

    it('should throw error if connection string is invalid', () => {
      const serviceWithInvalidConnection = new BlobStorageService({
        connectionString: 'invalid',
        containerName: 'test-container',
      });

      expect(() => {
        serviceWithInvalidConnection.generateSasUrl('path');
      }).toThrow('Failed to extract account name or key from connection string');
    });
  });
});
