/**
 * Archive Provider Interface
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { AuditLog } from '../../../types';

/**
 * Archive provider interface for cold storage of audit logs.
 * Supports S3, Azure Blob Storage, and local filesystem.
 */
export interface IArchiveProvider {
  /**
   * Upload logs to archive storage
   * @param fileName - Name of the archive file
   * @param logs - Logs to archive
   * @returns Path/URL to the archived file
   */
  upload(fileName: string, logs: AuditLog[]): Promise<string>;
  
  /**
   * Download archived logs
   * @param filePath - Path/URL of the archive file
   * @returns Array of audit logs
   */
  download(filePath: string): Promise<AuditLog[]>;
  
  /**
   * List archived files
   * @param prefix - Optional prefix filter
   * @param limit - Maximum number of files to return
   * @returns List of archive file paths
   */
  list(prefix?: string, limit?: number): Promise<ArchiveFileInfo[]>;
  
  /**
   * Delete an archived file
   * @param filePath - Path/URL of the archive file
   */
  delete(filePath: string): Promise<void>;
  
  /**
   * Check if archive storage is accessible
   */
  healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }>;
}

export interface ArchiveFileInfo {
  path: string;
  size: number;
  createdAt: Date;
  metadata?: Record<string, string>;
}

/**
 * Archive provider configuration
 */
export interface ArchiveProviderConfig {
  provider: 'local' | 's3' | 'azure';
  local?: {
    basePath: string;
  };
  s3?: {
    bucket: string;
    region: string;
    prefix?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  azure?: {
    containerName: string;
    connectionString: string;
    prefix?: string;
  };
}



