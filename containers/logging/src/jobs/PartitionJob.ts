/**
 * Partition Job
 * Creates and manages table partitions for performance
 * Per ModuleImplementationGuide Section 8: Database Standards
 */

import { PrismaClient } from '.prisma/logging-client';
import { CronJob } from 'cron';
import { log } from '../utils/logger';

export interface PartitionResult {
  partitionsCreated: number;
  partitionsDropped: number;
  errors: string[];
  durationMs: number;
}

export class PartitionJob {
  private prisma: PrismaClient;
  private cronJob: CronJob | null = null;
  private isRunning = false;
  private partitionBy: 'month' | 'week' | 'day';
  private retainPartitions: number; // Number of partitions to keep
  
  constructor(prisma: PrismaClient, partitionBy: 'month' | 'week' | 'day' = 'month', retainPartitions: number = 12) {
    this.prisma = prisma;
    this.partitionBy = partitionBy;
    this.retainPartitions = retainPartitions;
  }
  
  /**
   * Start the partition job with cron schedule
   */
  start(schedule: string = '0 0 25 * *'): void {
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
    
    log.info('Partition job started', { schedule, partitionBy: this.partitionBy });
  }
  
  /**
   * Stop the partition job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    log.info('Partition job stopped');
  }
  
  /**
   * Run partition management manually
   */
  async runNow(): Promise<PartitionResult> {
    if (this.isRunning) {
      log.warn('Partition job already running, skipping');
      return {
        partitionsCreated: 0,
        partitionsDropped: 0,
        errors: ['Job already running'],
        durationMs: 0,
      };
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const result: PartitionResult = {
      partitionsCreated: 0,
      partitionsDropped: 0,
      errors: [],
      durationMs: 0,
    };
    
    try {
      log.info('Starting partition management');
      
      // Check if table is partitioned
      const isPartitioned = await this.checkIfPartitioned();
      
      if (!isPartitioned) {
        log.info('Table is not partitioned, skipping partition management');
        log.info('To enable partitioning, run the partition migration script');
        result.durationMs = Date.now() - startTime;
        return result;
      }
      
      // Create future partitions
      const created = await this.createFuturePartitions();
      result.partitionsCreated = created;
      
      // Drop old partitions (beyond retention)
      const dropped = await this.dropOldPartitions();
      result.partitionsDropped = dropped;
      
      result.durationMs = Date.now() - startTime;
      
      log.info('Partition management completed', {
        partitionsCreated: result.partitionsCreated,
        partitionsDropped: result.partitionsDropped,
        durationMs: result.durationMs,
      });
      
      return result;
    } catch (error: any) {
      log.error('Partition job failed', error);
      result.errors.push(error.message);
      result.durationMs = Date.now() - startTime;
      return result;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Check if the audit_logs table is partitioned
   */
  private async checkIfPartitioned(): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<{ relkind: string }[]>`
        SELECT relkind 
        FROM pg_class 
        WHERE relname = 'audit_logs'
      `;
      
      // 'p' indicates a partitioned table
      return result.length > 0 && result[0].relkind === 'p';
    } catch (error: unknown) {
      log.warn('Could not check if table is partitioned', { error: String(error) });
      return false;
    }
  }
  
  /**
   * Create future partitions
   * Creates partitions for the next N periods based on partitionBy setting
   */
  private async createFuturePartitions(): Promise<number> {
    const now = new Date();
    let created = 0;
    
    // Create partitions for the next 3 periods
    for (let i = 0; i < 3; i++) {
      const partitionDate = this.getPartitionDate(now, i);
      const partitionName = this.getPartitionName(partitionDate);
      const { start, end } = this.getPartitionBounds(partitionDate);
      
      try {
        // Check if partition exists
        const exists = await this.partitionExists(partitionName);
        
        if (!exists) {
          await this.createPartition(partitionName, start, end);
          created++;
          log.info('Created partition', { partitionName, start, end });
        }
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          log.error('Failed to create partition', error, { partitionName });
        }
      }
    }
    
    return created;
  }
  
  /**
   * Drop old partitions beyond retention period
   */
  private async dropOldPartitions(): Promise<number> {
    const now = new Date();
    const cutoffDate = this.getPartitionDate(now, -this.retainPartitions);
    let dropped = 0;
    
    try {
      // Get all partitions
      const partitions = await this.prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'audit_logs_%'
        ORDER BY tablename
      `;
      
      for (const partition of partitions) {
        const partitionDate = this.parsePartitionName(partition.tablename);
        
        if (partitionDate && partitionDate < cutoffDate) {
          try {
            await this.dropPartition(partition.tablename);
            dropped++;
            log.info('Dropped old partition', { partitionName: partition.tablename });
          } catch (error) {
            log.error('Failed to drop partition', error, { partitionName: partition.tablename });
          }
        }
      }
    } catch (error) {
      log.error('Failed to list partitions', error);
    }
    
    return dropped;
  }
  
  /**
   * Get partition date offset from current date
   */
  private getPartitionDate(baseDate: Date, offset: number): Date {
    const date = new Date(baseDate);
    
    switch (this.partitionBy) {
      case 'day':
        date.setDate(date.getDate() + offset);
        break;
      case 'week':
        date.setDate(date.getDate() + offset * 7);
        break;
      case 'month':
      default:
        date.setMonth(date.getMonth() + offset);
        break;
    }
    
    return date;
  }
  
  /**
   * Get partition name for a date
   */
  private getPartitionName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (this.partitionBy) {
      case 'day':
        return `audit_logs_${year}${month}${day}`;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `audit_logs_${year}w${String(weekNum).padStart(2, '0')}`;
      case 'month':
      default:
        return `audit_logs_${year}${month}`;
    }
  }
  
  /**
   * Get partition bounds (start and end dates)
   */
  private getPartitionBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);
    
    switch (this.partitionBy) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(0, 0, 0, 0);
        break;
      case 'week':
        // Start of week (Monday)
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 7);
        end.setHours(0, 0, 0, 0);
        break;
      case 'month':
      default:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(1);
        end.setHours(0, 0, 0, 0);
        break;
    }
    
    return { start, end };
  }
  
  /**
   * Parse partition name to get date
   */
  private parsePartitionName(name: string): Date | null {
    // Match patterns like audit_logs_202501 or audit_logs_20250122 or audit_logs_2025w03
    const monthMatch = name.match(/audit_logs_(\d{4})(\d{2})$/);
    const dayMatch = name.match(/audit_logs_(\d{4})(\d{2})(\d{2})$/);
    const weekMatch = name.match(/audit_logs_(\d{4})w(\d{2})$/);
    
    if (dayMatch) {
      return new Date(parseInt(dayMatch[1]), parseInt(dayMatch[2]) - 1, parseInt(dayMatch[3]));
    }
    if (monthMatch) {
      return new Date(parseInt(monthMatch[1]), parseInt(monthMatch[2]) - 1, 1);
    }
    if (weekMatch) {
      // Approximate - first day of that week
      const year = parseInt(weekMatch[1]);
      const week = parseInt(weekMatch[2]);
      const jan1 = new Date(year, 0, 1);
      return new Date(jan1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    }
    
    return null;
  }
  
  /**
   * Get week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  /**
   * Check if a partition exists
   */
  private async partitionExists(partitionName: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables WHERE tablename = ${partitionName}
      ) as exists
    `;
    
    return result[0]?.exists || false;
  }
  
  /**
   * Create a new partition
   */
  private async createPartition(partitionName: string, start: Date, end: Date): Promise<void> {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF audit_logs
      FOR VALUES FROM ('${startStr}') TO ('${endStr}')
    `);
  }
  
  /**
   * Drop a partition
   */
  private async dropPartition(partitionName: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS ${partitionName}
    `);
  }
  
  /**
   * Get partition statistics
   */
  async getStats(): Promise<{
    isPartitioned: boolean;
    partitionCount: number;
    partitions: { name: string; rowCount: number; sizeBytes: number }[];
  }> {
    const isPartitioned = await this.checkIfPartitioned();
    
    if (!isPartitioned) {
      return {
        isPartitioned: false,
        partitionCount: 0,
        partitions: [],
      };
    }
    
    const partitions = await this.prisma.$queryRaw<{ tablename: string; row_estimate: number; total_bytes: number }[]>`
      SELECT 
        c.relname as tablename,
        c.reltuples::bigint as row_estimate,
        pg_total_relation_size(c.oid) as total_bytes
      FROM pg_class c
      JOIN pg_inherits i ON i.inhrelid = c.oid
      JOIN pg_class p ON p.oid = i.inhparent
      WHERE p.relname = 'audit_logs'
      ORDER BY c.relname
    `;
    
    return {
      isPartitioned: true,
      partitionCount: partitions.length,
      partitions: partitions.map(p => ({
        name: p.tablename,
        rowCount: Number(p.row_estimate),
        sizeBytes: Number(p.total_bytes),
      })),
    };
  }
}
