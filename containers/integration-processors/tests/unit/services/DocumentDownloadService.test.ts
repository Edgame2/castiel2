/**
 * Document Download Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentDownloadService } from '../../../src/services/DocumentDownloadService';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('DocumentDownloadService', () => {
  let service: DocumentDownloadService;

  beforeEach(() => {
    service = new DocumentDownloadService();
    vi.clearAllMocks();
  });

  describe('downloadDocument', () => {
    it('should download document successfully', async () => {
      const mockBuffer = Buffer.from('test document content');
      const mockResponse = {
        data: mockBuffer,
        headers: {
          'content-type': 'application/pdf',
        },
        status: 200,
      };

      (axios.get as any).mockResolvedValue(mockResponse);

      const result = await service.downloadDocument('https://example.com/document.pdf');

      expect(result.buffer).toEqual(mockBuffer);
      expect(result.contentType).toBe('application/pdf');
      expect(result.size).toBe(mockBuffer.length);

      expect(axios.get).toHaveBeenCalledWith('https://example.com/document.pdf', {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
        headers: {},
        validateStatus: expect.any(Function),
      });
    });

    it('should use custom timeout and maxSize', async () => {
      const mockBuffer = Buffer.from('test');
      const mockResponse = {
        data: mockBuffer,
        headers: { 'content-type': 'application/pdf' },
        status: 200,
      };

      (axios.get as any).mockResolvedValue(mockResponse);

      await service.downloadDocument('https://example.com/document.pdf', {
        timeout: 60000,
        maxSize: 100 * 1024 * 1024,
      });

      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/document.pdf',
        expect.objectContaining({
          timeout: 60000,
          maxContentLength: 100 * 1024 * 1024,
          maxBodyLength: 100 * 1024 * 1024,
        })
      );
    });

    it('should use default content type if not provided', async () => {
      const mockBuffer = Buffer.from('test');
      const mockResponse = {
        data: mockBuffer,
        headers: {},
        status: 200,
      };

      (axios.get as any).mockResolvedValue(mockResponse);

      const result = await service.downloadDocument('https://example.com/document');

      expect(result.contentType).toBe('application/octet-stream');
    });

    it('should throw error if file size exceeds maxSize', async () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60 MB
      const mockResponse = {
        data: largeBuffer,
        headers: { 'content-type': 'application/pdf' },
        status: 200,
      };

      (axios.get as any).mockResolvedValue(mockResponse);

      await expect(
        service.downloadDocument('https://example.com/document.pdf', {
          maxSize: 50 * 1024 * 1024, // 50 MB limit
        })
      ).rejects.toThrow('File size (62914560 bytes) exceeds maximum allowed size (52428800 bytes)');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout',
      };

      (axios.get as any).mockRejectedValue(timeoutError);

      await expect(
        service.downloadDocument('https://example.com/document.pdf', { timeout: 5000 })
      ).rejects.toThrow('Download timeout after 5000ms');
    });

    it('should handle 404 errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
        },
        message: 'Not Found',
      };

      (axios.get as any).mockRejectedValue(notFoundError);

      await expect(service.downloadDocument('https://example.com/missing.pdf')).rejects.toThrow(
        'Document not found at URL: https://example.com/missing.pdf'
      );
    });

    it('should handle other HTTP errors', async () => {
      const serverError = {
        response: {
          status: 500,
        },
        message: 'Internal Server Error',
      };

      (axios.get as any).mockRejectedValue(serverError);

      await expect(service.downloadDocument('https://example.com/document.pdf')).rejects.toThrow(
        'Failed to download document: HTTP 500'
      );
    });

    it('should handle maxContentLength errors', async () => {
      const sizeError = {
        message: 'maxContentLength exceeded',
        response: {
          status: 200,
        },
      };

      (axios.get as any).mockRejectedValue(sizeError);

      await expect(
        service.downloadDocument('https://example.com/document.pdf', {
          maxSize: 50 * 1024 * 1024,
        })
      ).rejects.toThrow('File size exceeds maximum allowed size (52428800 bytes)');
    });

    it('should pass custom headers', async () => {
      const mockBuffer = Buffer.from('test');
      const mockResponse = {
        data: mockBuffer,
        headers: { 'content-type': 'application/pdf' },
        status: 200,
      };

      (axios.get as any).mockResolvedValue(mockResponse);

      await service.downloadDocument('https://example.com/document.pdf', {
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'value',
        },
      });

      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/document.pdf',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token',
            'X-Custom-Header': 'value',
          },
        })
      );
    });
  });
});
