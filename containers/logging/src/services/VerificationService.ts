/**
 * Verification Service
 * Handles hash chain verification for tamper-evident logging (Cosmos DB only).
 */

import { IStorageProvider } from './providers/storage/IStorageProvider';
import { AuditLog, VerificationResult, VerificationStatus, HashCheckpoint } from '../types';
import { verifyHashChain, verifyLogHash } from '../utils/hash';
import { log } from '../utils/logger';
import { getConfig } from '../config';
import type { CosmosHashCheckpointsRepository } from '../data/cosmos/hash-checkpoints';

interface VerificationServiceDeps {
  storageProvider: IStorageProvider;
  cosmosCheckpoints: CosmosHashCheckpointsRepository;
}

export class VerificationService {
  private storage: IStorageProvider;
  private cosmosCheckpoints: CosmosHashCheckpointsRepository;

  constructor(deps: VerificationServiceDeps) {
    this.storage = deps.storageProvider;
    this.cosmosCheckpoints = deps.cosmosCheckpoints;
  }

  /**
   * Verify a single log entry's hash
   */
  async verifySingleLog(logId: string): Promise<{ valid: boolean; log: AuditLog | null }> {
    const auditLog = await this.storage.getById(logId);
    
    if (!auditLog) {
      return { valid: false, log: null };
    }

    const config = getConfig();
    const valid = verifyLogHash(auditLog, config.defaults.hash_chain.algorithm);
    
    return { valid, log: auditLog };
  }

  /**
   * Verify a range of logs in the hash chain
   */
  async verifyRange(startTime: Date, endTime: Date, maxLogs = 10000): Promise<VerificationResult> {
    const config = getConfig();
    
    log.info('Starting hash chain verification', { startTime, endTime, maxLogs });
    
    // Get logs in the range
    const logs = await this.storage.getLogsInRange(startTime, endTime, maxLogs);
    
    if (logs.length === 0) {
      return {
        status: VerificationStatus.VERIFIED,
        checkedLogs: 0,
        invalidLogs: [],
        lastValidHash: '',
        verifiedAt: new Date(),
      };
    }

    // Verify the chain
    const result = verifyHashChain(logs, config.defaults.hash_chain.algorithm);
    
    const verificationResult: VerificationResult = {
      status: result.valid ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
      checkedLogs: logs.length,
      invalidLogs: result.invalidLogIds,
      lastValidHash: logs[logs.length - 1]?.hash || '',
      verifiedAt: new Date(),
    };

    if (!result.valid) {
      log.error('Hash chain verification failed', {
        invalidLogIds: result.invalidLogIds,
        checkedLogs: logs.length,
      });
    } else {
      log.info('Hash chain verification passed', { checkedLogs: logs.length });
    }

    return verificationResult;
  }

  /**
   * Create a verification checkpoint
   */
  async createCheckpoint(): Promise<HashCheckpoint> {
    const lastLog = await this.storage.getLastLog();
    if (!lastLog) {
      throw new Error('No logs found to create checkpoint');
    }
    const totalCount = await this.storage.count({});

    const row = await this.cosmosCheckpoints.create({
      tenantId: null,
      checkpointTimestamp: new Date(),
      lastLogId: lastLog.id,
      lastHash: lastLog.hash,
      logCount: totalCount,
      verifiedBy: null,
      status: 'PENDING',
      verifiedAt: null,
    });
    log.info('Checkpoint created', { checkpointId: row.id, lastLogId: lastLog.id });
    return this.mapRowToCheckpoint(row);
  }

  /**
   * Verify from last checkpoint to now
   */
  async verifyFromLastCheckpoint(userId?: string): Promise<VerificationResult & { checkpointId: string }> {
    const rows = await this.cosmosCheckpoints.findMany({
      where: { status: 'VERIFIED' },
      orderBy: { checkpointTimestamp: 'desc' },
      take: 1,
    });
    const lastCheckpoint = rows.length ? this.mapRowToCheckpoint(rows[0]) : null;
    const startTime = lastCheckpoint?.checkpointTimestamp || new Date(0);
    const result = await this.verifyRange(startTime, new Date());

    const lastLog = result.lastValidHash ? (await this.storage.getLastLog())?.id || '' : '';
    const row = await this.cosmosCheckpoints.create({
      tenantId: null,
      checkpointTimestamp: new Date(),
      lastLogId: lastLog,
      lastHash: result.lastValidHash,
      logCount: result.checkedLogs,
      verifiedBy: userId ?? null,
      status: result.status,
      verifiedAt: result.verifiedAt,
    });
    return { ...result, checkpointId: row.id };
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(limit = 20): Promise<HashCheckpoint[]> {
    const rows = await this.cosmosCheckpoints.findMany({
      orderBy: { checkpointTimestamp: 'desc' },
      take: limit,
    });
    return rows.map(r => this.mapRowToCheckpoint(r));
  }

  /**
   * Get the last checkpoint
   */
  async getLastCheckpoint(): Promise<HashCheckpoint | null> {
    const rows = await this.cosmosCheckpoints.findMany({
      orderBy: { checkpointTimestamp: 'desc' },
      take: 1,
    });
    return rows.length ? this.mapRowToCheckpoint(rows[0]) : null;
  }

  /**
   * Map Cosmos row to domain type
   */
  private mapRowToCheckpoint(row: { id: string; checkpointTimestamp: Date; lastLogId: string; lastHash: string; logCount: number; verifiedAt: Date | null; verifiedBy: string | null; status: string; createdAt: Date }): HashCheckpoint {
    return {
      id: row.id,
      checkpointTimestamp: row.checkpointTimestamp,
      lastLogId: row.lastLogId,
      lastHash: row.lastHash,
      logCount: BigInt(row.logCount),
      verifiedAt: row.verifiedAt,
      verifiedBy: row.verifiedBy,
      status: row.status as VerificationStatus,
      createdAt: row.createdAt,
    };
  }
}

