/**
 * Document Download Service
 * Downloads documents from external URLs
 * @module integration-processors/services
 */

import axios, { AxiosResponse } from 'axios';

export interface DownloadOptions {
  timeout?: number;
  maxSize?: number; // Maximum file size in bytes
  headers?: Record<string, string>;
}

/**
 * Document Download Service
 */
export class DocumentDownloadService {
  private defaultTimeout: number = 30000; // 30 seconds
  private defaultMaxSize: number = 50 * 1024 * 1024; // 50 MB

  /**
   * Download document from URL
   */
  async downloadDocument(
    url: string,
    options: DownloadOptions = {}
  ): Promise<{ buffer: Buffer; contentType: string; size: number }> {
    const timeout = options.timeout || this.defaultTimeout;
    const maxSize = options.maxSize || this.defaultMaxSize;

    try {
      const response: AxiosResponse<Buffer> = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout,
        maxContentLength: maxSize,
        maxBodyLength: maxSize,
        headers: options.headers || {},
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const buffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const size = buffer.length;

      if (size > maxSize) {
        throw new Error(`File size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
      }

      return {
        buffer,
        contentType,
        size,
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Download timeout after ${timeout}ms`);
      }
      if (error.response?.status === 404) {
        throw new Error(`Document not found at URL: ${url}`);
      }
      if (error.response?.status >= 400) {
        throw new Error(`Failed to download document: HTTP ${error.response.status}`);
      }
      if (error.message?.includes('maxContentLength')) {
        throw new Error(`File size exceeds maximum allowed size (${maxSize} bytes)`);
      }
      throw new Error(`Failed to download document: ${error.message}`);
    }
  }
}
