/**
 * AWS S3 Archive Provider
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { IArchiveProvider, ArchiveFileInfo } from './IArchiveProvider';
import { AuditLog } from '../../../types';
import { log } from '../../../utils/logger';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface S3ArchiveConfig {
  bucket: string;
  region: string;
  prefix?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/**
 * S3 Archive Provider
 * Archives logs to AWS S3 for cold storage
 */
export class S3ArchiveProvider implements IArchiveProvider {
  private bucket: string;
  private prefix: string;
  private region: string;
  private s3Client: S3Client;
  
  constructor(config: S3ArchiveConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'audit-logs/';
    this.region = config.region;
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: config.region,
      credentials: config.accessKeyId ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey || '',
      } : undefined,
    });
    
    log.info('S3 Archive Provider initialized', { bucket: this.bucket, region: this.region });
  }
  
  async upload(fileName: string, logs: AuditLog[]): Promise<string> {
    const key = `${this.prefix}${fileName}.json.gz`;
    
    try {
      // Serialize and compress logs
      const jsonContent = JSON.stringify(logs);
      const compressed = await gzipAsync(Buffer.from(jsonContent, 'utf8'));
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: compressed,
        ContentType: 'application/gzip',
        Metadata: {
          'log-count': String(logs.length),
          'archived-at': new Date().toISOString(),
        },
      }));
      
      log.info('Logs archived to S3', { bucket: this.bucket, key, logCount: logs.length });
      
      return `s3://${this.bucket}/${key}`;
    } catch (error) {
      log.error('Failed to upload logs to S3', error, { bucket: this.bucket, key, logCount: logs.length });
      throw error;
    }
  }
  
  async download(filePath: string): Promise<AuditLog[]> {
    const key = filePath.startsWith('s3://')
      ? filePath.replace(`s3://${this.bucket}/`, '')
      : `${this.prefix}${filePath}`;
    
    try {
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      
      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }
      
      const body = await response.Body.transformToByteArray();
      const decompressed = await gunzipAsync(Buffer.from(body));
      const logs = JSON.parse(decompressed.toString('utf8')) as AuditLog[];
      
      log.info('Logs downloaded from S3', { key, logCount: logs.length });
      
      return logs;
    } catch (error) {
      log.error('Failed to download logs from S3', error, { key });
      throw error;
    }
  }
  
  async list(prefix?: string, limit: number = 100): Promise<ArchiveFileInfo[]> {
    const searchPrefix = prefix
      ? `${this.prefix}${prefix}`
      : this.prefix;
    
    try {
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: searchPrefix,
        MaxKeys: limit,
      }));
      
      const files: ArchiveFileInfo[] = (response.Contents || []).map(obj => ({
        path: obj.Key || '',
        size: obj.Size || 0,
        createdAt: obj.LastModified || new Date(),
        metadata: {
          etag: obj.ETag || '',
        },
      }));
      
      log.debug('Listed S3 archive files', { prefix: searchPrefix, count: files.length });
      
      return files;
    } catch (error) {
      log.error('Failed to list S3 archive files', error, { prefix: searchPrefix });
      throw error;
    }
  }
  
  async delete(filePath: string): Promise<void> {
    const key = filePath.startsWith('s3://')
      ? filePath.replace(`s3://${this.bucket}/`, '')
      : filePath;
    
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      
      log.info('S3 archive deleted', { key });
    } catch (error) {
      log.error('Failed to delete S3 archive', error, { key });
      throw error;
    }
  }
  
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { status: 'ok' };
    } catch (error: any) {
      log.error('S3 health check failed', error, { bucket: this.bucket });
      return { status: 'error', message: error.message || 'Unknown error' };
    }
  }
}

