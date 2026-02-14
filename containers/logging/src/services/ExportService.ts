/**
 * Export Service
 * Handles CSV/JSON export of audit logs (Cosmos DB only).
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { IStorageProvider } from './providers/storage/IStorageProvider';
import { LogSearchParams } from '../types/log.types';
import { ExportFormat, ExportJob, CreateExportInput } from '../types/policy.types';
import { log } from '../utils/logger';
import { randomUUID } from 'crypto';
import { getConfig } from '../config';
import type { CosmosExportsRepository } from '../data/cosmos/exports';

export class ExportService {
  private storage: IStorageProvider;
  private cosmosExports: CosmosExportsRepository;
  private exportDir: string;
  private batchSize = 5000;

  constructor(
    storage: IStorageProvider,
    cosmosExports: CosmosExportsRepository,
    exportDir?: string
  ) {
    this.storage = storage;
    this.cosmosExports = cosmosExports;
    this.exportDir = exportDir || '/tmp/audit-exports';
  }

  /**
   * Create an export job
   */
  async createExport(
    tenantId: string,
    input: CreateExportInput,
    requestedBy: string
  ): Promise<ExportJob> {
    const row = await this.cosmosExports.create({
      tenantId,
      format: input.format,
      filters: input.filters ?? {},
      status: 'PENDING',
      progress: 0,
      requestedBy,
    });
    this.processExport(row.id).catch(error => {
      log.error('Export processing failed', error, { exportId: row.id });
    });
    return this.mapToExportJob(row);
  }

  /**
   * Get export job status
   */
  async getExport(exportId: string, tenantId?: string): Promise<ExportJob | null> {
    const row = await this.cosmosExports.findUnique({ where: { id: exportId } });
    if (!row) return null;
    if (tenantId !== undefined && row.tenantId !== tenantId) return null;
    return this.mapToExportJob(row);
  }

  /**
   * List export jobs
   */
  async listExports(tenantId?: string, limit: number = 50): Promise<ExportJob[]> {
    const rows = await this.cosmosExports.findMany({
      where: tenantId !== undefined ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(e => this.mapToExportJob(e));
  }

  /**
   * Process export job with progress tracking
   */
  private async processExport(exportId: string): Promise<void> {
    const exportJob = await this.getExport(exportId);
    if (!exportJob) throw new Error('Export job not found');
    try {
      await this.cosmosExports.update(exportId, exportJob.tenantId, {
        status: 'PROCESSING',
        progress: 0,
      });

      await fs.mkdir(this.exportDir, { recursive: true });

      const filters = (exportJob.filters || {}) as Record<string, unknown>;
      const baseSearchParams: LogSearchParams = {
        tenantId: exportJob.tenantId,
        startDate: filters.startDate ? new Date(filters.startDate as string) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate as string) : undefined,
        category: filters.category as any,
        severity: filters.severity as any,
        action: filters.action as string | undefined,
        userId: filters.userId as string | undefined,
      };

      const totalCount = await this.storage.count(baseSearchParams);
      log.info('Starting export', { exportId, totalCount, format: exportJob.format });

      const fileExtension = exportJob.format === 'CSV' ? 'csv' : 'json';
      const fileName = `${exportId}.${fileExtension}`;
      const filePath = join(this.exportDir, fileName);

      let processedCount = 0;
      let fileSizeBytes = BigInt(0);

      if (exportJob.format === 'CSV') {
        fileSizeBytes = await this.exportToCSV(filePath, baseSearchParams, totalCount, async (progress) => {
          processedCount = progress;
          const percent = totalCount > 0 ? Math.floor((progress / totalCount) * 100) : 0;
          await this.updateProgress(exportId, exportJob.tenantId, percent);
        });
      } else {
        fileSizeBytes = await this.exportToJSON(filePath, baseSearchParams, totalCount, async (progress) => {
          processedCount = progress;
          const percent = totalCount > 0 ? Math.floor((progress / totalCount) * 100) : 0;
          await this.updateProgress(exportId, exportJob.tenantId, percent);
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.cosmosExports.update(exportId, exportJob.tenantId, {
        status: 'COMPLETED',
        progress: 100,
        totalRecords: processedCount,
        fileUrl: filePath,
        fileSizeBytes: Number(fileSizeBytes),
        expiresAt,
        completedAt: new Date(),
      });

      log.info('Export completed', {
        exportId,
        format: exportJob.format,
        recordCount: processedCount,
        fileSize: fileSizeBytes.toString(),
        filePath,
      });
    } catch (error) {
      log.error('Export processing failed', error, { exportId });
      const errMsg = error instanceof Error ? error.message : String(error);
      const job = await this.getExport(exportId);
      if (job) {
        await this.cosmosExports.update(exportId, job.tenantId, { status: 'FAILED', errorMessage: errMsg });
      }
      throw error;
    }
  }

  /**
   * Update export progress
   */
  private async updateProgress(exportId: string, tenantId: string, progress: number): Promise<void> {
    try {
      await this.cosmosExports.update(exportId, tenantId, { progress });
    } catch (error) {
      log.debug('Failed to update export progress', { exportId, progress });
    }
  }

  /**
   * Export logs to CSV file with streaming
   */
  private async exportToCSV(
    filePath: string,
    searchParams: LogSearchParams,
    totalCount: number,
    onProgress: (count: number) => Promise<void>
  ): Promise<bigint> {
    const writeStream = createWriteStream(filePath);
    
    // Write CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'Tenant ID',
      'User ID',
      'Session ID',
      'IP Address',
      'Action',
      'Category',
      'Severity',
      'Message',
      'Resource Type',
      'Resource ID',
      'Source',
      'Correlation ID',
      'Hash',
    ];
    writeStream.write(headers.join(',') + '\n');

    let offset = 0;
    let processedCount = 0;

    while (offset < totalCount) {
      const result = await this.storage.search({
        ...searchParams,
        limit: this.batchSize,
        offset,
        sortBy: 'timestamp',
        sortOrder: 'asc',
      });

      for (const logEntry of result.items) {
        const row = [
          logEntry.id,
          logEntry.timestamp.toISOString(),
          logEntry.tenantId,
          logEntry.userId || '',
          logEntry.sessionId || '',
          logEntry.ipAddress || '',
          logEntry.action,
          logEntry.category,
          logEntry.severity,
          `"${(logEntry.message || '').replace(/"/g, '""')}"`,
          logEntry.resourceType || '',
          logEntry.resourceId || '',
          logEntry.source,
          logEntry.correlationId || '',
          logEntry.hash,
        ];
        writeStream.write(row.join(',') + '\n');
        processedCount++;
      }

      offset += this.batchSize;
      await onProgress(processedCount);

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Close stream and get file size
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const stats = await fs.stat(filePath);
    return BigInt(stats.size);
  }

  /**
   * Export logs to JSON file with streaming
   */
  private async exportToJSON(
    filePath: string,
    searchParams: LogSearchParams,
    totalCount: number,
    onProgress: (count: number) => Promise<void>
  ): Promise<bigint> {
    const writeStream = createWriteStream(filePath);
    
    // Start JSON array
    writeStream.write('[\n');

    let offset = 0;
    let processedCount = 0;
    let isFirst = true;

    while (offset < totalCount) {
      const result = await this.storage.search({
        ...searchParams,
        limit: this.batchSize,
        offset,
        sortBy: 'timestamp',
        sortOrder: 'asc',
      });

      for (const logEntry of result.items) {
        if (!isFirst) {
          writeStream.write(',\n');
        }
        isFirst = false;
        
        writeStream.write('  ' + JSON.stringify(logEntry));
        processedCount++;
      }

      offset += this.batchSize;
      await onProgress(processedCount);

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // End JSON array
    writeStream.write('\n]');

    // Close stream and get file size
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const stats = await fs.stat(filePath);
    return BigInt(stats.size);
  }

  /**
   * Get export file path for download
   */
  async getExportFilePath(exportId: string, tenantId?: string): Promise<string | null> {
    const exportJob = await this.getExport(exportId, tenantId);
    
    if (!exportJob) {
      return null;
    }

    if (exportJob.status !== 'COMPLETED') {
      return null;
    }

    if (exportJob.expiresAt && new Date() > exportJob.expiresAt) {
      return null;
    }

    return exportJob.fileUrl || null;
  }

  /**
   * Cancel an export job
   */
  async cancelExport(exportId: string, tenantId?: string): Promise<boolean> {
    const exportJob = await this.getExport(exportId, tenantId);
    if (!exportJob) return false;
    if (exportJob.status === 'COMPLETED' || exportJob.status === 'FAILED') return false;
    await this.cosmosExports.update(exportId, exportJob.tenantId, {
      status: 'FAILED',
      errorMessage: 'Export cancelled by user',
    });
    return true;
  }

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    const now = new Date();
    const rows = await this.cosmosExports.findExpired(now);
    const expired = rows.map(r => ({ id: r.id, tenantId: r.tenantId, fileUrl: r.fileUrl }));

    let deletedCount = 0;
    for (const exportJob of expired) {
      try {
        if (exportJob.fileUrl) {
          await fs.unlink(exportJob.fileUrl).catch(() => {});
        }
        await this.cosmosExports.delete(exportJob.id, exportJob.tenantId);
        deletedCount++;
      } catch (error) {
        log.error('Failed to cleanup export', error, { exportId: exportJob.id });
      }
    }
    if (deletedCount > 0) {
      log.info('Cleaned up expired exports', { deletedCount });
    }
    return deletedCount;
  }

  /**
   * Generate CSV content
   */
  private generateCSV(logs: any[]): string {
    if (logs.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'Tenant ID',
      'User ID',
      'Action',
      'Category',
      'Severity',
      'Message',
      'Resource Type',
      'Resource ID',
      'Source',
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.tenantId,
      log.userId || '',
      log.action,
      log.category,
      log.severity,
      log.message.replace(/"/g, '""'), // Escape quotes
      log.resourceType || '',
      log.resourceId || '',
      log.source,
    ]);

    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ];

    return csvRows.join('\n');
  }

  /**
   * Generate JSON content
   */
  private generateJSON(logs: any[]): string {
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Map Prisma model or Cosmos row to ExportJob type
   */
  private mapToExportJob(exportJob: any): ExportJob {
    const fileSizeBytes =
      exportJob.fileSizeBytes != null
        ? typeof exportJob.fileSizeBytes === 'bigint'
          ? exportJob.fileSizeBytes
          : BigInt(exportJob.fileSizeBytes)
        : null;
    return {
      id: exportJob.id,
      tenantId: exportJob.tenantId,
      format: exportJob.format as ExportFormat,
      filters: (exportJob.filters ?? {}) as Record<string, unknown>,
      status: exportJob.status as any,
      progress: exportJob.progress,
      totalRecords: exportJob.totalRecords,
      fileUrl: exportJob.fileUrl,
      fileSizeBytes,
      expiresAt: exportJob.expiresAt,
      errorMessage: exportJob.errorMessage,
      requestedBy: exportJob.requestedBy,
      createdAt: exportJob.createdAt,
      completedAt: exportJob.completedAt,
    };
  }
}

