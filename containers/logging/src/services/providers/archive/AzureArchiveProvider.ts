/**
 * Azure Blob Storage Archive Provider
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { IArchiveProvider, ArchiveFileInfo } from './IArchiveProvider';
import { AuditLog } from '../../../types';
import { log } from '../../../utils/logger';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface AzureArchiveConfig {
  containerName: string;
  connectionString: string;
  prefix?: string;
}

/**
 * Azure Blob Storage Archive Provider
 * Archives logs to Azure Blob Storage for cold storage
 */
export class AzureArchiveProvider implements IArchiveProvider {
  private containerName: string;
  private prefix: string;
  private containerClient: ContainerClient;
  
  constructor(config: AzureArchiveConfig) {
    this.containerName = config.containerName;
    this.prefix = config.prefix || 'audit-logs/';
    
    // Initialize Azure Blob Storage client
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    this.containerClient = blobServiceClient.getContainerClient(this.containerName);
    
    log.info('Azure Archive Provider initialized', { container: this.containerName });
  }
  
  async upload(fileName: string, logs: AuditLog[]): Promise<string> {
    const blobName = `${this.prefix}${fileName}.json.gz`;
    
    try {
      // Serialize and compress logs
      const jsonContent = JSON.stringify(logs);
      const compressed = await gzipAsync(Buffer.from(jsonContent, 'utf8'));
      
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.upload(compressed, compressed.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/gzip',
        },
        metadata: {
          'log-count': String(logs.length),
          'archived-at': new Date().toISOString(),
        },
      });
      
      log.info('Logs archived to Azure Blob Storage', { container: this.containerName, blobName, logCount: logs.length });
      
      return `azure://${this.containerName}/${blobName}`;
    } catch (error) {
      log.error('Failed to upload logs to Azure', error, { container: this.containerName, blobName, logCount: logs.length });
      throw error;
    }
  }
  
  async download(filePath: string): Promise<AuditLog[]> {
    const blobName = filePath.startsWith('azure://')
      ? filePath.replace(`azure://${this.containerName}/`, '')
      : `${this.prefix}${filePath}`;
    
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const downloadResponse = await blockBlobClient.download(0);
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('Empty response body from Azure Blob Storage');
      }
      
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }
      
      const body = Buffer.concat(chunks);
      const decompressed = await gunzipAsync(body);
      const logs = JSON.parse(decompressed.toString('utf8')) as AuditLog[];
      
      log.info('Logs downloaded from Azure Blob Storage', { blobName, logCount: logs.length });
      
      return logs;
    } catch (error) {
      log.error('Failed to download logs from Azure', error, { blobName });
      throw error;
    }
  }
  
  async list(prefix?: string, limit: number = 100): Promise<ArchiveFileInfo[]> {
    const searchPrefix = prefix
      ? `${this.prefix}${prefix}`
      : this.prefix;
    
    try {
      const files: ArchiveFileInfo[] = [];
      let count = 0;
      
      for await (const blob of this.containerClient.listBlobsFlat({ prefix: searchPrefix })) {
        if (count >= limit) break;
        
        files.push({
          path: blob.name,
          size: blob.properties.contentLength || 0,
          createdAt: blob.properties.createdOn || new Date(),
          metadata: {
            etag: blob.properties.etag || '',
            contentType: blob.properties.contentType || '',
          },
        });
        
        count++;
      }
      
      log.debug('Listed Azure archive files', { prefix: searchPrefix, count: files.length });
      
      return files;
    } catch (error) {
      log.error('Failed to list Azure archive files', error, { prefix: searchPrefix });
      throw error;
    }
  }
  
  async delete(filePath: string): Promise<void> {
    const blobName = filePath.startsWith('azure://')
      ? filePath.replace(`azure://${this.containerName}/`, '')
      : filePath;
    
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      
      log.info('Azure archive deleted', { blobName });
    } catch (error) {
      log.error('Failed to delete Azure archive', error, { blobName });
      throw error;
    }
  }
  
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Check if container exists and is accessible
      const exists = await this.containerClient.exists();
      if (!exists) {
        return { status: 'error', message: `Container ${this.containerName} does not exist` };
      }
      
      return { status: 'ok' };
    } catch (error: any) {
      log.error('Azure health check failed', error, { container: this.containerName });
      return { status: 'error', message: error.message || 'Unknown error' };
    }
  }
}



