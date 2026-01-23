/**
 * Local Filesystem Archive Provider
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { IArchiveProvider, ArchiveFileInfo } from './IArchiveProvider';
import { AuditLog } from '../../../types';
import { log } from '../../../utils/logger';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface LocalArchiveConfig {
  basePath: string;
  compress?: boolean;
}

export class LocalArchiveProvider implements IArchiveProvider {
  private basePath: string;
  private compress: boolean;
  
  constructor(config: LocalArchiveConfig) {
    this.basePath = config.basePath;
    this.compress = config.compress ?? true;
  }
  
  /**
   * Upload logs to local filesystem
   */
  async upload(fileName: string, logs: AuditLog[]): Promise<string> {
    const filePath = join(this.basePath, fileName + (this.compress ? '.gz' : ''));
    
    // Ensure directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });
    
    // Serialize logs to JSON
    const jsonContent = JSON.stringify(logs, null, 2);
    
    if (this.compress) {
      // Compress with gzip
      const compressed = await gzipAsync(Buffer.from(jsonContent, 'utf8'));
      await fs.writeFile(filePath, compressed);
    } else {
      await fs.writeFile(filePath, jsonContent, 'utf8');
    }
    
    log.info('Logs archived to local filesystem', { filePath, logCount: logs.length });
    
    return filePath;
  }
  
  /**
   * Download archived logs from local filesystem
   */
  async download(filePath: string): Promise<AuditLog[]> {
    const fullPath = filePath.startsWith('/') ? filePath : join(this.basePath, filePath);
    
    let content: string;
    
    if (fullPath.endsWith('.gz')) {
      const compressed = await fs.readFile(fullPath);
      const decompressed = await gunzipAsync(compressed);
      content = decompressed.toString('utf8');
    } else {
      content = await fs.readFile(fullPath, 'utf8');
    }
    
    return JSON.parse(content) as AuditLog[];
  }
  
  /**
   * List archived files
   */
  async list(prefix?: string, limit: number = 100): Promise<ArchiveFileInfo[]> {
    const searchPath = prefix ? join(this.basePath, prefix) : this.basePath;
    
    try {
      const files = await this.listFilesRecursive(searchPath);
      
      // Get file info for each
      const fileInfos: ArchiveFileInfo[] = [];
      for (const file of files.slice(0, limit)) {
        try {
          const stat = await fs.stat(file);
          fileInfos.push({
            path: file.replace(this.basePath + '/', ''),
            size: stat.size,
            createdAt: stat.birthtime,
          });
        } catch {
          // Skip files we can't stat
        }
      }
      
      // Sort by creation date (newest first)
      return fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * Delete an archived file
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = filePath.startsWith('/') ? filePath : join(this.basePath, filePath);
    
    await fs.unlink(fullPath);
    
    log.info('Archived file deleted', { filePath: fullPath });
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Check if base path is writable
      const testFile = join(this.basePath, '.health-check');
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.writeFile(testFile, 'ok');
      await fs.unlink(testFile);
      
      return { status: 'ok' };
    } catch (error: any) {
      return {
        status: 'error',
        message: `Local archive storage not accessible: ${error.message}`,
      };
    }
  }
  
  /**
   * Recursively list files in a directory
   */
  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursive(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.json.gz'))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors (directory might not exist)
    }
    
    return files;
  }
}



