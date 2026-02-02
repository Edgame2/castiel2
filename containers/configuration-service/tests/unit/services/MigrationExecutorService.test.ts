/**
 * MigrationExecutorService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationExecutorService } from '../../../src/services/MigrationExecutorService';
import { MigrationService } from '../../../src/services/MigrationService';
import { MigrationStepService } from '../../../src/services/MigrationStepService';
import { BadRequestError } from '@coder/shared/utils/errors';
import { MigrationStatus } from '../../../src/types/migration.types';

describe('MigrationExecutorService', () => {
  let service: MigrationExecutorService;
  let mockMigrationGetById: ReturnType<typeof vi.fn>;
  let mockMigrationUpdate: ReturnType<typeof vi.fn>;
  let mockStepGetByMigrationId: ReturnType<typeof vi.fn>;
  let mockStepUpdateStatus: ReturnType<typeof vi.fn>;

  const migrationDraft = {
    id: 'm1',
    tenantId: 't1',
    name: 'Upgrade',
    status: MigrationStatus.DRAFT,
    steps: ['st1'],
    updatedAt: new Date(),
  };

  const migrationRunning = { ...migrationDraft, status: MigrationStatus.RUNNING };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMigrationGetById = vi.fn().mockResolvedValue({ ...migrationDraft });
    mockMigrationUpdate = vi.fn().mockResolvedValue({ ...migrationRunning });
    mockStepGetByMigrationId = vi.fn().mockResolvedValue([]);
    mockStepUpdateStatus = vi.fn().mockResolvedValue({});
    const migrationService = {
      getById: mockMigrationGetById,
      update: mockMigrationUpdate,
    } as unknown as MigrationService;
    const stepService = {
      getByMigrationId: mockStepGetByMigrationId,
      updateStatus: mockStepUpdateStatus,
    } as unknown as MigrationStepService;
    service = new MigrationExecutorService(migrationService, stepService);
  });

  describe('execute', () => {
    it('throws BadRequestError when tenantId or migrationId is missing', async () => {
      await expect(service.execute({ tenantId: '', migrationId: 'm1' })).rejects.toThrow(BadRequestError);
      await expect(service.execute({ tenantId: 't1', migrationId: '' })).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when migration is already RUNNING', async () => {
      mockMigrationGetById.mockResolvedValue({ ...migrationDraft, status: MigrationStatus.RUNNING });
      await expect(service.execute({ tenantId: 't1', migrationId: 'm1' })).rejects.toThrow(/already running/);
    });
    it('throws BadRequestError when migration is COMPLETED', async () => {
      mockMigrationGetById.mockResolvedValue({ ...migrationDraft, status: MigrationStatus.COMPLETED });
      await expect(service.execute({ tenantId: 't1', migrationId: 'm1' })).rejects.toThrow(/already been completed/);
    });
    it('throws BadRequestError when migration has no steps', async () => {
      mockMigrationGetById.mockResolvedValue({ ...migrationDraft, steps: [] });
      await expect(service.execute({ tenantId: 't1', migrationId: 'm1' })).rejects.toThrow(/no steps/);
    });
    it('updates status to RUNNING and returns migration', async () => {
      const result = await service.execute({ tenantId: 't1', migrationId: 'm1' });
      expect(result.status).toBe(MigrationStatus.RUNNING);
      expect(mockMigrationGetById).toHaveBeenCalledWith('m1', 't1');
      expect(mockMigrationUpdate).toHaveBeenCalledWith('m1', 't1', { status: MigrationStatus.RUNNING });
    });
  });

  describe('rollback', () => {
    it('throws BadRequestError when migration is not COMPLETED or FAILED', async () => {
      mockMigrationGetById.mockResolvedValue({ ...migrationDraft, status: MigrationStatus.DRAFT });
      await expect(service.rollback('m1', 't1')).rejects.toThrow(/only rollback completed or failed/);
    });
    it('throws BadRequestError when migration has no rollback steps', async () => {
      mockMigrationGetById.mockResolvedValue({
        ...migrationDraft,
        status: MigrationStatus.COMPLETED,
        rollbackSteps: undefined,
      });
      await expect(service.rollback('m1', 't1')).rejects.toThrow(/no rollback steps/);
    });
    it('throws BadRequestError when rollbackSteps is empty', async () => {
      mockMigrationGetById.mockResolvedValue({
        ...migrationDraft,
        status: MigrationStatus.COMPLETED,
        rollbackSteps: [],
      });
      await expect(service.rollback('m1', 't1')).rejects.toThrow(/no rollback steps/);
    });
    it('calls migration update and returns when rollbackSteps present', async () => {
      mockMigrationGetById
        .mockResolvedValueOnce({
          ...migrationDraft,
          status: MigrationStatus.COMPLETED,
          rollbackSteps: ['st1'],
        })
        .mockResolvedValueOnce({
          ...migrationDraft,
          status: MigrationStatus.ROLLED_BACK,
          rollbackSteps: ['st1'],
        });
      mockStepGetByMigrationId.mockResolvedValue([
        { id: 'st1', order: 0, rollback: { pattern: 'y', replacement: 'x' } },
      ]);
      mockMigrationUpdate.mockResolvedValue({
        ...migrationDraft,
        status: MigrationStatus.ROLLED_BACK,
        rollbackSteps: ['st1'],
      });
      const result = await service.rollback('m1', 't1');
      expect(result.status).toBe(MigrationStatus.ROLLED_BACK);
      expect(mockMigrationGetById).toHaveBeenCalledWith('m1', 't1');
      expect(mockStepGetByMigrationId).toHaveBeenCalledWith('m1', 't1');
    });
  });
});
