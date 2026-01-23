/**
 * Local Buffer Utility
 * Provides file-based buffering for resilience when service is unavailable
 * Per ModuleImplementationGuide Section 6: Abstraction Layer
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { AuditLog } from '../types/log.types';
import { getConfig } from '../config';
import { log } from './logger';

export class LocalBuffer {
  private filePath: string;
  private maxSize: number;
  private buffer: AuditLog[] = [];
  private isFlushing: boolean = false;

  constructor(filePath?: string, maxSize?: number) {
    const config = getConfig();
    this.filePath = filePath || config.ingestion.buffer.file_path;
    this.maxSize = maxSize || config.ingestion.buffer.max_size;
  }

  /**
   * Add log to buffer
   */
  async add(log: AuditLog): Promise<void> {
    this.buffer.push(log);

    // Flush if buffer is full
    if (this.buffer.length >= this.maxSize) {
      await this.flush();
    }
  }

  /**
   * Add multiple logs to buffer
   */
  async addBatch(logs: AuditLog[]): Promise<void> {
    this.buffer.push(...logs);

    // Flush if buffer is full
    if (this.buffer.length >= this.maxSize) {
      await this.flush();
    }
  }

  /**
   * Flush buffer to disk
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const toFlush = [...this.buffer];
      this.buffer = [];

      // Ensure directory exists
      const dir = join(this.filePath, '..');
      await fs.mkdir(dir, { recursive: true });

      // Append to buffer file
      const bufferFile = join(this.filePath, 'buffer.jsonl');
      const lines = toFlush.map(log => JSON.stringify(log)).join('\n') + '\n';
      
      await fs.appendFile(bufferFile, lines, 'utf8');

      log.debug('Flushed buffer to disk', { 
        count: toFlush.length,
        file: bufferFile,
      });
    } catch (error) {
      // Re-add to buffer on error
      this.buffer = [...this.buffer, ...this.buffer];
      log.error('Failed to flush buffer to disk', error);
      throw error;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Load logs from disk buffer
   */
  async load(): Promise<AuditLog[]> {
    try {
      const bufferFile = join(this.filePath, 'buffer.jsonl');
      const content = await fs.readFile(bufferFile, 'utf8');
      
      const logs: AuditLog[] = [];
      for (const line of content.split('\n')) {
        if (line.trim()) {
          try {
            logs.push(JSON.parse(line) as AuditLog);
          } catch (error) {
            log.warn('Failed to parse buffer line', { line, error });
          }
        }
      }

      log.info('Loaded logs from buffer', { count: logs.length });
      return logs;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Buffer file doesn't exist yet
        return [];
      }
      log.error('Failed to load buffer from disk', error);
      throw error;
    }
  }

  /**
   * Clear buffer file
   */
  async clear(): Promise<void> {
    try {
      const bufferFile = join(this.filePath, 'buffer.jsonl');
      await fs.unlink(bufferFile);
      log.info('Cleared buffer file', { file: bufferFile });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log.error('Failed to clear buffer file', error);
        throw error;
      }
    }
  }

  /**
   * Get current buffer size
   */
  getSize(): number {
    return this.buffer.length;
  }

  /**
   * Get buffer file path
   */
  getFilePath(): string {
    return join(this.filePath, 'buffer.jsonl');
  }
}



