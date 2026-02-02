/**
 * Unit tests for BlobStorageService
 * @azure/storage-blob is mocked in setup.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@coder/shared/utils/errors';
import { BlobStorageService } from '../../../src/services/BlobStorageService';
import { StorageProvider } from '../../../src/types/document.types';

const azureConfig = {
  provider: StorageProvider.AZURE as const,
  azure: {
    accountName: 'testaccount',
    accountKey: 'testkey',
    containerName: 'testcontainer',
  },
};

describe('BlobStorageService', () => {
  let service: BlobStorageService;

  beforeEach(() => {
    service = new BlobStorageService(azureConfig);
  });

  describe('constructor', () => {
    it('throws when provider is not AZURE', () => {
      expect(
        () =>
          new BlobStorageService({
            provider: 'aws' as StorageProvider,
          })
      ).toThrow(/Storage provider aws is not yet implemented/);
    });

    it('throws when azure config is missing for AZURE provider', () => {
      expect(
        () =>
          new BlobStorageService({
            provider: StorageProvider.AZURE,
          })
      ).toThrow('Azure storage configuration is required');
    });
  });

  describe('uploadFile', () => {
    it('returns path and size after upload', async () => {
      const result = await service.uploadFile('path/to/file.txt', Buffer.from('hello'), 'text/plain');
      expect(result.path).toBe('path/to/file.txt');
      expect(result.size).toBe(5);
    });
  });

  describe('downloadFile', () => {
    it('throws NotFoundError when blob has no readable stream', async () => {
      await expect(service.downloadFile('missing.txt')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteFile', () => {
    it('resolves without error', async () => {
      await expect(service.deleteFile('path/to/delete.txt')).resolves.toBeUndefined();
    });
  });

  describe('fileExists', () => {
    it('returns true when getProperties resolves', async () => {
      const result = await service.fileExists('path/to/file.txt');
      expect(result).toBe(true);
    });
  });

  describe('getFileProperties', () => {
    it('returns size, contentType, lastModified', async () => {
      const result = await service.getFileProperties('path/to/file.txt');
      expect(result).toMatchObject({
        size: 0,
        contentType: 'application/octet-stream',
      });
      expect(result.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('generateDownloadUrl', () => {
    it('returns url and expiresAt', () => {
      const result = service.generateDownloadUrl('path/to/file.txt', 15);
      expect(result.url).toContain('sas=token');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('generateUploadUrl', () => {
    it('returns url and expiresAt', () => {
      const result = service.generateUploadUrl('path/to/upload.txt', 60);
      expect(result.url).toContain('sas=token');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });
});
