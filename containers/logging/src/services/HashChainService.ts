/**
 * Hash Chain Service
 * Manages tamper-evident hash chains for audit logs
 * Per ModuleImplementationGuide Section 6: Abstraction Layer
 */

import { PrismaClient } from '.prisma/logging-client';
import { IStorageProvider } from './providers/storage/IStorageProvider';
import { AuditLog } from '../types/log.types';
import { randomUUID } from 'crypto';
import { generateLogHash } from '../utils/hash';
import { log } from '../utils/logger';

export interface VerificationResult {
  status: 'verified' | 'failed' | 'pending';
  checkedLogs: number;
  failedLogs: string[];
  message?: string;
}

export class HashChainService {
  private prisma: PrismaClient;
  private storage: IStorageProvider;

  constructor(prisma: PrismaClient, storage: IStorageProvider) {
    this.prisma = prisma;
    this.storage = storage;
  }

  /**
   * Verify hash chain integrity
   */
  async verifyChain(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VerificationResult> {
    try {
      log.info('Starting hash chain verification', { organizationId, startDate, endDate });

      // Get logs in range
      const logs = await this.storage.getLogsInRange(
        startDate || new Date(0),
        endDate || new Date(),
        10000 // Limit for verification
      );

      if (logs.length === 0) {
        return {
          status: 'verified',
          checkedLogs: 0,
          failedLogs: [],
          message: 'No logs to verify',
        };
      }

      // Filter by organization if specified
      const filteredLogs = organizationId
        ? logs.filter(l => l.organizationId === organizationId)
        : logs;

      // Sort by timestamp
      filteredLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const failedLogs: string[] = [];
      let previousHash: string | null = null;

      for (const logEntry of filteredLogs) {
        // Verify hash
        const expectedHash = generateLogHash(logEntry, previousHash, 'sha256');
        
        if (logEntry.hash !== expectedHash) {
          failedLogs.push(logEntry.id);
          log.warn('Hash mismatch detected', {
            logId: logEntry.id,
            expected: expectedHash,
            actual: logEntry.hash,
          });
          
          // Publish verification failed event if this is a critical failure
          if (failedLogs.length === 1) {
            const { publishVerificationFailed } = await import('../events/publisher');
            await publishVerificationFailed(
              organizationId || '',
              failedLogs,
              'system'
            );
          }
        }

        previousHash = logEntry.hash;
      }

      const status = failedLogs.length === 0 ? 'verified' : 'failed';

      log.info('Hash chain verification completed', {
        status,
        checkedLogs: filteredLogs.length,
        failedLogs: failedLogs.length,
      });

      return {
        status,
        checkedLogs: filteredLogs.length,
        failedLogs,
        message: failedLogs.length === 0
          ? 'All logs verified successfully'
          : `Found ${failedLogs.length} logs with hash mismatches`,
      };
    } catch (error) {
      log.error('Hash chain verification failed', error);
      return {
        status: 'failed',
        checkedLogs: 0,
        failedLogs: [],
        message: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Create a verification checkpoint
   */
  async createCheckpoint(
    lastLogId: string,
    lastHash: string,
    logCount: bigint,
    verifiedBy?: string
  ): Promise<string> {
    const checkpoint = await this.prisma.audit_hash_checkpoints.create({
      data: {
        id: randomUUID(),
        checkpointTimestamp: new Date(),
        lastLogId,
        lastHash,
        logCount,
        verifiedBy: verifiedBy || null,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    log.info('Verification checkpoint created', {
      checkpointId: checkpoint.id,
      lastLogId,
      logCount: logCount.toString(),
    });

    return checkpoint.id;
  }

  /**
   * Get verification checkpoints
   */
  async getCheckpoints(limit: number = 10): Promise<any[]> {
    const checkpoints = await this.prisma.audit_hash_checkpoints.findMany({
      orderBy: { checkpointTimestamp: 'desc' },
      take: limit,
    });

    return checkpoints;
  }

  /**
   * Verify logs since last checkpoint
   */
  async verifySinceCheckpoint(checkpointId: string): Promise<VerificationResult> {
    const checkpoint = await this.prisma.audit_hash_checkpoints.findUnique({
      where: { id: checkpointId },
    });

    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    // Get logs after checkpoint
    const logs = await this.storage.getLogsInRange(
      checkpoint.checkpointTimestamp,
      new Date(),
      10000
    );

    if (logs.length === 0) {
      return {
        status: 'verified',
        checkedLogs: 0,
        failedLogs: [],
        message: 'No new logs since checkpoint',
      };
    }

    // Verify chain starting from checkpoint hash
    const failedLogs: string[] = [];
    let previousHash = checkpoint.lastHash;

    for (const logEntry of logs) {
      const expectedHash = generateLogHash(logEntry, previousHash, 'sha256');
      
      if (logEntry.hash !== expectedHash) {
        failedLogs.push(logEntry.id);
      }

      previousHash = logEntry.hash;
    }

    const status = failedLogs.length === 0 ? 'verified' : 'failed';

    return {
      status,
      checkedLogs: logs.length,
      failedLogs,
      message: failedLogs.length === 0
        ? 'All logs verified since checkpoint'
        : `Found ${failedLogs.length} logs with hash mismatches`,
    };
  }
}

