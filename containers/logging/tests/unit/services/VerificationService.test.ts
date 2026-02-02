/**
 * Unit tests for VerificationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerificationService } from '../../../src/services/VerificationService';
import { IStorageProvider } from '../../../src/services/providers/storage/IStorageProvider';
import { getConfig } from '../../../src/config';

vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(() => ({
    defaults: {
      hash_chain: { algorithm: 'sha256' },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../src/utils/hash', () => ({
  verifyLogHash: vi.fn(() => true),
  verifyHashChain: vi.fn(() => ({ valid: true, invalidLogIds: [] })),
}));

const mockStorage: IStorageProvider = {
  getById: vi.fn(),
  getLogsInRange: vi.fn(),
  getLastLog: vi.fn(),
  count: vi.fn(),
} as any;

const mockPrisma = {
  audit_hash_checkpoints: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
};

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getById.mockResolvedValue(null);
    mockStorage.getLogsInRange.mockResolvedValue([]);
    mockStorage.getLastLog.mockResolvedValue(null);
    mockStorage.count.mockResolvedValue(0);
    mockPrisma.audit_hash_checkpoints.create.mockImplementation((args: any) =>
      Promise.resolve({
        id: 'cp-1',
        checkpointTimestamp: args.data?.checkpointTimestamp ?? new Date(),
        lastLogId: args.data?.lastLogId ?? '',
        lastHash: args.data?.lastHash ?? '',
        logCount: args.data?.logCount ?? BigInt(0),
        status: args.data?.status ?? 'PENDING',
        verifiedAt: args.data?.verifiedAt ?? null,
        verifiedBy: args.data?.verifiedBy ?? null,
        createdAt: new Date(),
      })
    );
    mockPrisma.audit_hash_checkpoints.findFirst.mockResolvedValue(null);
    mockPrisma.audit_hash_checkpoints.findMany.mockResolvedValue([]);
    service = new VerificationService({
      storageProvider: mockStorage,
      prisma: mockPrisma as any,
    });
  });

  describe('verifySingleLog', () => {
    it('returns valid false and log null when log not found', async () => {
      const result = await service.verifySingleLog('log-1');
      expect(result.valid).toBe(false);
      expect(result.log).toBeNull();
    });

    it('returns valid and log when log found and hash valid', async () => {
      const auditLog = { id: 'log-1', hash: 'h1', tenantId: 't1' };
      mockStorage.getById.mockResolvedValue(auditLog);
      const result = await service.verifySingleLog('log-1');
      expect(result.valid).toBe(true);
      expect(result.log).toEqual(auditLog);
    });
  });

  describe('verifyRange', () => {
    it('returns VERIFIED with zero checkedLogs when no logs in range', async () => {
      const result = await service.verifyRange(new Date(), new Date());
      expect(result.status).toBe('VERIFIED');
      expect(result.checkedLogs).toBe(0);
      expect(result.invalidLogs).toEqual([]);
    });
  });

  describe('createCheckpoint', () => {
    it('throws when no logs exist', async () => {
      await expect(service.createCheckpoint()).rejects.toThrow(/no logs found/i);
    });

    it('creates checkpoint when last log exists', async () => {
      const lastLog = { id: 'log-1', hash: 'h1' };
      mockStorage.getLastLog.mockResolvedValue(lastLog);
      mockStorage.count.mockResolvedValue(10);
      const result = await service.createCheckpoint();
      expect(result).toBeDefined();
      expect(result.lastLogId).toBe(lastLog.id);
      expect(mockPrisma.audit_hash_checkpoints.create).toHaveBeenCalled();
    });
  });

  describe('getVerificationHistory', () => {
    it('returns mapped checkpoints', async () => {
      const rows = [
        {
          id: 'cp-1',
          checkpointTimestamp: new Date(),
          lastLogId: 'l1',
          lastHash: 'h1',
          logCount: BigInt(5),
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: null,
          createdAt: new Date(),
        },
      ];
      mockPrisma.audit_hash_checkpoints.findMany.mockResolvedValue(rows);
      const result = await service.getVerificationHistory(10);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cp-1');
    });
  });

  describe('getLastCheckpoint', () => {
    it('returns null when no checkpoint', async () => {
      const result = await service.getLastCheckpoint();
      expect(result).toBeNull();
    });
  });
});
