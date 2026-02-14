/**
 * Hash Chain Service
 * Manages tamper-evident hash chains for audit logs (Cosmos DB only).
 */

import { IStorageProvider } from './providers/storage/IStorageProvider';
import { randomUUID } from 'crypto';
import { generateLogHash } from '../utils/hash';
import { log } from '../utils/logger';
import type { CosmosHashCheckpointsRepository } from '../data/cosmos/hash-checkpoints';

export interface VerificationResult {
  status: 'verified' | 'failed' | 'pending';
  checkedLogs: number;
  failedLogs: string[];
  message?: string;
}

export class HashChainService {
  private storage: IStorageProvider;
  private cosmosCheckpoints: CosmosHashCheckpointsRepository;

  constructor(storage: IStorageProvider, cosmosCheckpoints: CosmosHashCheckpointsRepository) {
    this.storage = storage;
    this.cosmosCheckpoints = cosmosCheckpoints;
  }

  /**
   * Verify hash chain integrity
   */
  async verifyChain(
    tenantId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<VerificationResult> {
    try {
      log.info('Starting hash chain verification', { tenantId, startDate, endDate });
      const logs = await this.storage.getLogsInRange(
        startDate || new Date(0),
        endDate || new Date(),
        10000
      );

      if (logs.length === 0) {
        return {
          status: 'verified',
          checkedLogs: 0,
          failedLogs: [],
          message: 'No logs to verify',
        };
      }

      const filteredLogs = tenantId
        ? logs.filter(l => l.tenantId === tenantId)
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
              tenantId || '',
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
   * Create a verification checkpoint (tenant-scoped).
   */
  async createCheckpoint(
    lastLogId: string,
    lastHash: string,
    logCount: bigint,
    verifiedBy?: string,
    tenantId?: string
  ): Promise<string> {
    const row = await this.cosmosCheckpoints.create({
      tenantId: tenantId ?? null,
      checkpointTimestamp: new Date(),
      lastLogId,
      lastHash,
      logCount: Number(logCount),
      verifiedBy: verifiedBy ?? null,
      status: 'VERIFIED',
      verifiedAt: new Date(),
    });
    log.info('Verification checkpoint created', {
      checkpointId: row.id,
      lastLogId,
      logCount: logCount.toString(),
    });
    return row.id;
  }

  /**
   * Get verification checkpoints (tenant-scoped).
   */
  async getCheckpoints(tenantId: string, limit: number = 10): Promise<any[]> {
    return this.cosmosCheckpoints.findMany({
      where: { tenantId },
      orderBy: { checkpointTimestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Verify logs since checkpoint (tenant-scoped: only checkpoints belonging to tenantId).
   */
  async verifySinceCheckpoint(checkpointId: string, tenantId: string): Promise<VerificationResult> {
    const checkpoint = await this.cosmosCheckpoints.findUnique({ where: { id: checkpointId } });
    if (!checkpoint || checkpoint.tenantId !== tenantId) {
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

