/**
 * Hash Chain Utilities
 * For tamper-evident logging
 */

import { createHash } from 'crypto';
import { AuditLog } from '../types';

/**
 * Generate a hash for an audit log entry
 */
export function generateLogHash(
  log: Omit<AuditLog, 'hash' | 'createdAt'>,
  previousHash: string | null,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  const hashInput = {
    previousHash,
    id: log.id,
    tenantId: log.tenantId,
    timestamp: log.timestamp.toISOString(),
    userId: log.userId,
    action: log.action,
    category: log.category,
    severity: log.severity,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    message: log.message,
    metadata: JSON.stringify(log.metadata || {}),
    source: log.source,
    correlationId: log.correlationId,
  };
  
  const content = JSON.stringify(hashInput, Object.keys(hashInput).sort());
  return createHash(algorithm).update(content).digest('hex');
}

/**
 * Verify the hash of a log entry
 */
export function verifyLogHash(
  log: AuditLog,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  const expectedHash = generateLogHash(
    {
      id: log.id,
      tenantId: log.tenantId,
      timestamp: log.timestamp,
      receivedAt: log.receivedAt,
      userId: log.userId,
      sessionId: log.sessionId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      geolocation: log.geolocation,
      action: log.action,
      category: log.category,
      severity: log.severity,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      message: log.message,
      metadata: log.metadata,
      previousHash: log.previousHash,
      source: log.source,
      correlationId: log.correlationId,
    },
    log.previousHash,
    algorithm
  );
  
  return log.hash === expectedHash;
}

/**
 * Verify a chain of logs
 */
export function verifyHashChain(
  logs: AuditLog[],
  algorithm: 'sha256' | 'sha512' = 'sha256'
): { valid: boolean; invalidLogIds: string[] } {
  const invalidLogIds: string[] = [];
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const expectedPreviousHash = i > 0 ? logs[i - 1].hash : null;
    
    // Check previous hash matches
    if (log.previousHash !== expectedPreviousHash) {
      invalidLogIds.push(log.id);
      continue;
    }
    
    // Verify log hash
    if (!verifyLogHash(log, algorithm)) {
      invalidLogIds.push(log.id);
    }
  }
  
  return {
    valid: invalidLogIds.length === 0,
    invalidLogIds,
  };
}



