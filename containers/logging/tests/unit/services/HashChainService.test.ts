/**
 * HashChainService Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HashChainService, VerificationResult } from '../../../src/services/HashChainService';
import { IStorageProvider } from '../../../src/services/providers/storage/IStorageProvider';
import { AuditLog, LogCategory, LogSeverity } from '../../../src/types';
import { generateLogHash } from '../../../src/utils/hash';

// Helper to create valid log entries with correct hash chain
function createValidLogChain(orgId: string, count: number): AuditLog[] {
  const logs: AuditLog[] = [];
  let previousHash: string | null = null;
  
  for (let i = 0; i < count; i++) {
    const baseLog = {
      id: `log-${i + 1}`,
      tenantId: orgId,
      timestamp: new Date(`2025-01-0${i + 1}`),
      receivedAt: new Date(`2025-01-0${i + 1}`),
      action: 'user.login',
      category: LogCategory.SECURITY,
      severity: LogSeverity.INFO,
      message: `Log entry ${i + 1}`,
      userId: null,
      sessionId: null,
      ipAddress: null,
      userAgent: null,
      geolocation: null,
      resourceType: null,
      resourceId: null,
      metadata: {},
      previousHash,
      source: 'api',
      correlationId: null,
    };
    
    const hash = generateLogHash(baseLog as any, previousHash, 'sha256');
    
    logs.push({
      ...baseLog,
      hash,
      createdAt: new Date(`2025-01-0${i + 1}`),
    } as AuditLog);
    
    previousHash = hash;
  }
  
  return logs;
}

describe('HashChainService', () => {
  let hashChainService: HashChainService;
  let mockStorage: IStorageProvider;
  let mockCosmosCheckpoints: any;

  beforeEach(() => {
    mockStorage = {
      store: vi.fn(),
      storeBatch: vi.fn(),
      getById: vi.fn(),
      search: vi.fn(),
      getLastLog: vi.fn(),
      getLogsInRange: vi.fn(),
      healthCheck: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    } as any;

    mockCosmosCheckpoints = {
      create: vi.fn().mockResolvedValue({ id: 'checkpoint-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    };

    hashChainService = new HashChainService(mockStorage, mockCosmosCheckpoints);
  });

  describe('verifyChain', () => {
    it('should return verified with empty logs', async () => {
      vi.mocked(mockStorage.getLogsInRange).mockResolvedValue([]);

      const result = await hashChainService.verifyChain('org-1');

      expect(result.status).toBe('verified');
      expect(result.checkedLogs).toBe(0);
      expect(result.failedLogs).toHaveLength(0);
      expect(result.message).toBe('No logs to verify');
    });

    it('should verify a valid single log', async () => {
      const logs = createValidLogChain('org-1', 1);
      vi.mocked(mockStorage.getLogsInRange).mockResolvedValue(logs);

      const result = await hashChainService.verifyChain('org-1');

      expect(result.status).toBe('verified');
      expect(result.checkedLogs).toBe(1);
      expect(result.failedLogs).toHaveLength(0);
    });

    it('should verify a valid multi-log chain', async () => {
      const logs = createValidLogChain('org-1', 3);
      vi.mocked(mockStorage.getLogsInRange).mockResolvedValue(logs);

      const result = await hashChainService.verifyChain('org-1');

      expect(result.status).toBe('verified');
      expect(result.checkedLogs).toBe(3);
      expect(result.failedLogs).toHaveLength(0);
    });

    it('should detect tampered log (modified hash)', async () => {
      const logs = createValidLogChain('org-1', 2);
      // Tamper with the second log's hash
      logs[1].hash = 'invalid-hash';
      
      vi.mocked(mockStorage.getLogsInRange).mockResolvedValue(logs);

      const result = await hashChainService.verifyChain('org-1');

      expect(result.status).toBe('failed');
      expect(result.failedLogs).toContain('log-2');
    });

    it('should filter by tenant when specified', async () => {
      const org1Logs = createValidLogChain('org-1', 2);
      const org2Logs = createValidLogChain('org-2', 1);
      const allLogs = [...org1Logs, ...org2Logs];
      
      vi.mocked(mockStorage.getLogsInRange).mockResolvedValue(allLogs);

      const result = await hashChainService.verifyChain('org-1');

      // Should only verify org-1 logs
      expect(result.checkedLogs).toBe(2);
    });
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint with tenantId', async () => {
      const checkpointId = await hashChainService.createCheckpoint(
        'log-100',
        'abc123',
        BigInt(100),
        'user-1',
        'org-1'
      );

      expect(checkpointId).toBe('checkpoint-1');
      expect(mockCosmosCheckpoints.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLogId: 'log-100',
          lastHash: 'abc123',
          verifiedBy: 'user-1',
          tenantId: 'org-1',
        })
      );
    });
  });

  describe('getCheckpoints', () => {
    it('should return checkpoints for tenant', async () => {
      const mockCheckpoints = [
        { id: 'cp-1', tenantId: 'org-1', checkpointTimestamp: new Date(), lastLogId: 'log-1', lastHash: 'hash1', logCount: BigInt(10) },
      ];
      mockCosmosCheckpoints.findMany.mockResolvedValue(mockCheckpoints);

      const checkpoints = await hashChainService.getCheckpoints('org-1', 5);

      expect(checkpoints).toHaveLength(1);
      expect(mockCosmosCheckpoints.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'org-1' },
        orderBy: { checkpointTimestamp: 'desc' },
        take: 5,
      });
    });
  });

  describe('verifySinceCheckpoint', () => {
    it('should verify when checkpoint belongs to tenant', async () => {
      const mockCheckpoint = {
        id: 'cp-1',
        tenantId: 'org-1',
        checkpointTimestamp: new Date(Date.now() - 60000),
        lastLogId: 'log-1',
        lastHash: 'hash1',
        logCount: BigInt(10),
      };
      mockCosmosCheckpoints.findUnique.mockResolvedValue(mockCheckpoint);
      vi.mocked(mockStorage.getLogsInRange).mockResolvedValue([]);

      const result = await hashChainService.verifySinceCheckpoint('cp-1', 'org-1');

      expect(result.status).toBe('verified');
      expect(result.checkedLogs).toBe(0);
    });

    it('should throw when checkpoint belongs to another tenant', async () => {
      const mockCheckpoint = {
        id: 'cp-1',
        tenantId: 'other-org',
        checkpointTimestamp: new Date(),
        lastLogId: 'log-1',
        lastHash: 'hash1',
        logCount: BigInt(10),
      };
      mockCosmosCheckpoints.findUnique.mockResolvedValue(mockCheckpoint);

      await expect(hashChainService.verifySinceCheckpoint('cp-1', 'org-1')).rejects.toThrow(
        'Checkpoint not found'
      );
    });
  });
});
