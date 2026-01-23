/**
 * Verification Service
 * Handles hash chain verification for tamper-evident logging
 */

import { PrismaClient } from '.prisma/logging-client';
import { IStorageProvider } from './providers/storage/IStorageProvider';
import { AuditLog, VerificationResult, VerificationStatus, HashCheckpoint } from '../types';
import { verifyHashChain, verifyLogHash } from '../utils/hash';
import { log } from '../utils/logger';
import { getConfig } from '../config';

interface VerificationServiceDeps {
  storageProvider: IStorageProvider;
  prisma: PrismaClient;
}

export class VerificationService {
  private storage: IStorageProvider;
  private prisma: PrismaClient;

  constructor(deps: VerificationServiceDeps) {
    this.storage = deps.storageProvider;
    this.prisma = deps.prisma;
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
    
    const checkpoint = await this.prisma.audit_hash_checkpoints.create({
      data: {
        checkpointTimestamp: new Date(),
        lastLogId: lastLog.id,
        lastHash: lastLog.hash,
        logCount: BigInt(totalCount),
        status: 'PENDING',
      },
    });

    log.info('Checkpoint created', { checkpointId: checkpoint.id, lastLogId: lastLog.id });

    return this.mapCheckpoint(checkpoint);
  }

  /**
   * Verify from last checkpoint to now
   */
  async verifyFromLastCheckpoint(userId?: string): Promise<VerificationResult & { checkpointId: string }> {
    // Get the last verified checkpoint
    const lastCheckpoint = await this.prisma.audit_hash_checkpoints.findFirst({
      where: { status: 'VERIFIED' },
      orderBy: { checkpointTimestamp: 'desc' },
    });

    const startTime = lastCheckpoint?.checkpointTimestamp || new Date(0);
    const result = await this.verifyRange(startTime, new Date());

    // Create a new checkpoint with results
    const checkpoint = await this.prisma.audit_hash_checkpoints.create({
      data: {
        checkpointTimestamp: new Date(),
        lastLogId: result.lastValidHash ? (await this.storage.getLastLog())?.id || '' : '',
        lastHash: result.lastValidHash,
        logCount: BigInt(result.checkedLogs),
        status: result.status,
        verifiedAt: result.verifiedAt,
        verifiedBy: userId,
      },
    });

    return {
      ...result,
      checkpointId: checkpoint.id,
    };
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(limit = 20): Promise<HashCheckpoint[]> {
    const checkpoints = await this.prisma.audit_hash_checkpoints.findMany({
      orderBy: { checkpointTimestamp: 'desc' },
      take: limit,
    });

    return checkpoints.map(this.mapCheckpoint);
  }

  /**
   * Get the last checkpoint
   */
  async getLastCheckpoint(): Promise<HashCheckpoint | null> {
    const checkpoint = await this.prisma.audit_hash_checkpoints.findFirst({
      orderBy: { checkpointTimestamp: 'desc' },
    });

    return checkpoint ? this.mapCheckpoint(checkpoint) : null;
  }

  /**
   * Map Prisma checkpoint to domain type
   */
  private mapCheckpoint(checkpoint: any): HashCheckpoint {
    return {
      id: checkpoint.id,
      checkpointTimestamp: checkpoint.checkpointTimestamp,
      lastLogId: checkpoint.lastLogId,
      lastHash: checkpoint.lastHash,
      logCount: checkpoint.logCount,
      verifiedAt: checkpoint.verifiedAt,
      verifiedBy: checkpoint.verifiedBy,
      status: checkpoint.status as VerificationStatus,
      createdAt: checkpoint.createdAt,
    };
  }
}

