/**
 * Archive Job
 * Archives old logs to cold storage before deletion
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { PrismaClient } from '.prisma/logging-client';
import { CronJob } from 'cron';
import { IStorageProvider } from '../services/providers/storage/IStorageProvider';
import { IArchiveProvider } from '../services/providers/archive/IArchiveProvider';
import { AuditLog } from '../types';
import { log } from '../utils/logger';

export interface ArchiveResult {
  archivedCount: number;
  archiveFiles: string[];
  errors: string[];
  durationMs: number;
}

export class ArchiveJob {
  private prisma: PrismaClient;
  private storage: IStorageProvider;
  private archiveProvider: IArchiveProvider | null = null;
  private cronJob: CronJob | null = null;
  private isRunning = false;
  private batchSize = 10000;
  
  constructor(
    prisma: PrismaClient,
    storage: IStorageProvider,
    archiveProvider?: IArchiveProvider
  ) {
    this.prisma = prisma;
    this.storage = storage;
    this.archiveProvider = archiveProvider || null;
  }
  
  /**
   * Set the archive provider
   */
  setArchiveProvider(provider: IArchiveProvider): void {
    this.archiveProvider = provider;
  }
  
  /**
   * Start the archive job with cron schedule
   */
  start(schedule: string = '0 3 * * *'): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    
    this.cronJob = new CronJob(
      schedule,
      async () => {
        await this.runNow();
      },
      null,
      true,
      'UTC'
    );
    
    log.info('Archive job started', { schedule });
  }
  
  /**
   * Stop the archive job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    log.info('Archive job stopped');
  }
  
  /**
   * Run archive process manually
   */
  async runNow(): Promise<ArchiveResult> {
    if (this.isRunning) {
      log.warn('Archive job already running, skipping');
      return {
        archivedCount: 0,
        archiveFiles: [],
        errors: ['Job already running'],
        durationMs: 0,
      };
    }
    
    if (!this.archiveProvider) {
      log.warn('No archive provider configured, skipping archive job');
      return {
        archivedCount: 0,
        archiveFiles: [],
        errors: ['No archive provider configured'],
        durationMs: 0,
      };
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const result: ArchiveResult = {
      archivedCount: 0,
      archiveFiles: [],
      errors: [],
      durationMs: 0,
    };
    
    try {
      log.info('Starting archive process');
      
      // Get policies that have archive settings
      const policies = await this.prisma.audit_retention_policies.findMany({
        where: {
          archiveAfterDays: { not: null },
        },
      });
      
      if (policies.length === 0) {
        log.info('No archive policies configured');
        result.durationMs = Date.now() - startTime;
        return result;
      }
      
      // Process each policy
      for (const policy of policies) {
        if (!policy.archiveAfterDays) continue;
        
        try {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - policy.archiveAfterDays);
          
          // Get logs to archive
          const logsToArchive = await this.getLogsToArchive(
            cutoffDate,
            policy.organizationId,
            policy.category,
            policy.severity
          );
          
          if (logsToArchive.length === 0) {
            log.debug('No logs to archive for policy', { policyId: policy.id });
            continue;
          }
          
          // Archive in batches
          const archiveFile = await this.archiveBatch(logsToArchive, policy.organizationId);
          
          result.archivedCount += logsToArchive.length;
          result.archiveFiles.push(archiveFile);
          
          log.info('Logs archived for policy', {
            policyId: policy.id,
            count: logsToArchive.length,
            archiveFile,
          });
        } catch (error: any) {
          const errorMsg = `Failed to archive for policy ${policy.id}: ${error.message}`;
          log.error(errorMsg, error);
          result.errors.push(errorMsg);
        }
      }
      
      result.durationMs = Date.now() - startTime;
      
      log.info('Archive process completed', {
        archivedCount: result.archivedCount,
        archiveFiles: result.archiveFiles.length,
        errors: result.errors.length,
        durationMs: result.durationMs,
      });
      
      return result;
    } catch (error: any) {
      log.error('Archive job failed', error);
      result.errors.push(error.message);
      result.durationMs = Date.now() - startTime;
      return result;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Get logs that need to be archived
   */
  private async getLogsToArchive(
    cutoffDate: Date,
    organizationId: string | null,
    category: string | null,
    severity: string | null
  ): Promise<AuditLog[]> {
    const where: any = {
      timestamp: { lt: cutoffDate },
    };
    
    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (category) {
      where.category = category;
    }
    if (severity) {
      where.severity = severity;
    }
    
    const logs = await this.prisma.audit_logs.findMany({
      where,
      take: this.batchSize,
      orderBy: { timestamp: 'asc' },
    });
    
    return logs as unknown as AuditLog[];
  }
  
  /**
   * Archive a batch of logs
   */
  private async archiveBatch(
    logs: AuditLog[],
    organizationId: string | null
  ): Promise<string> {
    if (!this.archiveProvider) {
      throw new Error('No archive provider configured');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const orgPrefix = organizationId || 'global';
    const fileName = `audit-logs-${orgPrefix}-${timestamp}.json`;
    
    // Upload to archive storage
    const archivePath = await this.archiveProvider.upload(fileName, logs);
    
    return archivePath;
  }
}
