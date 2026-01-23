/**
 * Retention Job
 * Cleans up old logs based on retention policies
 * Per ModuleImplementationGuide Section 8: Database Standards
 */

import { PrismaClient } from '.prisma/logging-client';
import { CronJob } from 'cron';
import { IStorageProvider } from '../services/providers/storage/IStorageProvider';
import { log } from '../utils/logger';

export interface RetentionResult {
  deletedCount: number;
  archivedCount: number;
  policies: {
    id: string;
    organizationId: string | null;
    deletedCount: number;
  }[];
  errors: string[];
  durationMs: number;
}

export class RetentionJob {
  private prisma: PrismaClient;
  private storage: IStorageProvider;
  private cronJob: CronJob | null = null;
  private isRunning = false;
  
  constructor(prisma: PrismaClient, storage: IStorageProvider) {
    this.prisma = prisma;
    this.storage = storage;
  }
  
  /**
   * Start the retention job with cron schedule
   */
  start(schedule: string = '0 2 * * *'): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    
    this.cronJob = new CronJob(
      schedule,
      async () => {
        await this.runNow();
      },
      null, // onComplete
      true, // start
      'UTC'
    );
    
    log.info('Retention job started', { schedule });
  }
  
  /**
   * Stop the retention job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    log.info('Retention job stopped');
  }
  
  /**
   * Run retention cleanup manually
   */
  async runNow(): Promise<RetentionResult> {
    if (this.isRunning) {
      log.warn('Retention job already running, skipping');
      return {
        deletedCount: 0,
        archivedCount: 0,
        policies: [],
        errors: ['Job already running'],
        durationMs: 0,
      };
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const result: RetentionResult = {
      deletedCount: 0,
      archivedCount: 0,
      policies: [],
      errors: [],
      durationMs: 0,
    };
    
    try {
      log.info('Starting retention cleanup');
      
      // Get all active retention policies
      const policies = await this.prisma.audit_retention_policies.findMany({
        where: {
          immutable: false, // Don't delete immutable logs
        },
      });
      
      if (policies.length === 0) {
        log.info('No retention policies found, using defaults');
        // Apply default retention (90 days)
        const defaultCutoffDate = new Date();
        defaultCutoffDate.setDate(defaultCutoffDate.getDate() - 90);
        
        const deletedCount = await this.storage.deleteOlderThan(defaultCutoffDate);
        result.deletedCount = deletedCount;
        
        log.info('Default retention applied', { deletedCount, cutoffDate: defaultCutoffDate });
      } else {
        // Process each policy
        for (const policy of policies) {
          try {
            const policyResult = await this.applyPolicy(policy);
            result.deletedCount += policyResult.deletedCount;
            result.policies.push({
              id: policy.id,
              organizationId: policy.organizationId,
              deletedCount: policyResult.deletedCount,
            });
          } catch (error: any) {
            const errorMsg = `Failed to apply policy ${policy.id}: ${error.message}`;
            log.error(errorMsg, error);
            result.errors.push(errorMsg);
          }
        }
      }
      
      result.durationMs = Date.now() - startTime;
      
      log.info('Retention cleanup completed', {
        deletedCount: result.deletedCount,
        archivedCount: result.archivedCount,
        policiesProcessed: result.policies.length,
        errors: result.errors.length,
        durationMs: result.durationMs,
      });
      
      return result;
    } catch (error: any) {
      log.error('Retention job failed', error);
      result.errors.push(error.message);
      result.durationMs = Date.now() - startTime;
      return result;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Apply a specific retention policy
   */
  private async applyPolicy(policy: {
    id: string;
    organizationId: string | null;
    category: string | null;
    severity: string | null;
    retentionDays: number;
    deleteAfterDays: number;
    minRetentionDays: number;
    maxRetentionDays: number;
  }): Promise<{ deletedCount: number }> {
    // Calculate cutoff date (respecting min/max constraints)
    const effectiveDays = Math.max(
      policy.minRetentionDays,
      Math.min(policy.maxRetentionDays, policy.deleteAfterDays)
    );
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - effectiveDays);
    
    // Build where clause
    const where: any = {
      timestamp: { lt: cutoffDate },
    };
    
    if (policy.organizationId) {
      where.organizationId = policy.organizationId;
    }
    
    if (policy.category) {
      where.category = policy.category;
    }
    
    if (policy.severity) {
      where.severity = policy.severity;
    }
    
    // Delete matching logs
    const deleteResult = await this.prisma.audit_logs.deleteMany({ where });
    
    log.debug('Policy applied', {
      policyId: policy.id,
      cutoffDate,
      deletedCount: deleteResult.count,
    });
    
    return { deletedCount: deleteResult.count };
  }
  
  /**
   * Get retention statistics
   */
  async getStats(): Promise<{
    totalLogs: number;
    oldestLog: Date | null;
    newestLog: Date | null;
    logsOlderThan30Days: number;
    logsOlderThan90Days: number;
    logsOlderThan365Days: number;
  }> {
    const now = new Date();
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const days365Ago = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const [
      totalLogs,
      oldestLog,
      newestLog,
      logsOlderThan30Days,
      logsOlderThan90Days,
      logsOlderThan365Days,
    ] = await Promise.all([
      this.prisma.audit_logs.count(),
      this.prisma.audit_logs.findFirst({
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
      }),
      this.prisma.audit_logs.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
      this.prisma.audit_logs.count({
        where: { timestamp: { lt: days30Ago } },
      }),
      this.prisma.audit_logs.count({
        where: { timestamp: { lt: days90Ago } },
      }),
      this.prisma.audit_logs.count({
        where: { timestamp: { lt: days365Ago } },
      }),
    ]);
    
    return {
      totalLogs,
      oldestLog: oldestLog?.timestamp || null,
      newestLog: newestLog?.timestamp || null,
      logsOlderThan30Days,
      logsOlderThan90Days,
      logsOlderThan365Days,
    };
  }
}
