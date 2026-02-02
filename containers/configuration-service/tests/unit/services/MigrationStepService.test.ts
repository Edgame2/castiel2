/**
 * MigrationStepService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationStepService } from '../../../src/services/MigrationStepService';
import { MigrationService } from '../../../src/services/MigrationService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MigrationStepStatus } from '../../../src/types/migration.types';

describe('MigrationStepService', () => {
  let service: MigrationStepService;
  let mockMigrationGetById: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchAll: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    migrationId: 'm1',
    name: 'Step 1',
    transformation: { pattern: 'x', replacement: 'y' },
  };

  const migrationWithSteps = {
    id: 'm1',
    tenantId: 't1',
    steps: [] as string[],
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMigrationGetById = vi.fn().mockResolvedValue({ ...migrationWithSteps });
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    mockDelete = vi.fn().mockResolvedValue(undefined);
    mockFetchAll = vi.fn().mockResolvedValue({ resources: [] });
    vi.mocked(getContainer).mockImplementation((name: string) => {
      if (name === 'migration_migrations') {
        return {
          items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
          item: vi.fn(() => ({ read: vi.fn(), replace: mockReplace, delete: vi.fn() })),
        } as unknown as ReturnType<typeof getContainer>;
      }
      return {
        items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: mockFetchAll })) },
        item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
      } as unknown as ReturnType<typeof getContainer>;
    });
    const migrationService = { getById: mockMigrationGetById } as unknown as MigrationService;
    service = new MigrationStepService(migrationService);
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, migrationId, name, or transformation is missing', async () => {
      await expect(service.create({ ...baseCreateInput, tenantId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, migrationId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, name: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, transformation: undefined! })).rejects.toThrow(BadRequestError);
    });
    it('creates step and appends to migration', async () => {
      const created = {
        id: 'st1',
        tenantId: 't1',
        migrationId: 'm1',
        order: 0,
        name: 'Step 1',
        status: MigrationStepStatus.PENDING,
        transformation: baseCreateInput.transformation,
        createdAt: new Date(),
      };
      mockCreate.mockResolvedValue({ resource: created });
      mockMigrationGetById
        .mockResolvedValueOnce({ ...migrationWithSteps })
        .mockResolvedValueOnce({ ...migrationWithSteps, steps: ['st1'] });
      const result = await service.create(baseCreateInput);
      expect(result.id).toBe('st1');
      expect(result.status).toBe(MigrationStepStatus.PENDING);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', migrationId: 'm1', name: 'Step 1' }),
        { partitionKey: 't1' }
      );
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when stepId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('st1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns step when found', async () => {
      const step = { id: 'st1', tenantId: 't1', migrationId: 'm1', name: 'Step 1', status: MigrationStepStatus.PENDING };
      mockRead.mockResolvedValue({ resource: step });
      const result = await service.getById('st1', 't1');
      expect(result.id).toBe('st1');
      expect(result.name).toBe('Step 1');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('st1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByMigrationId', () => {
    it('throws BadRequestError when migrationId or tenantId is missing', async () => {
      await expect(service.getByMigrationId('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getByMigrationId('m1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns steps from fetchAll', async () => {
      const steps = [{ id: 'st1', tenantId: 't1', migrationId: 'm1', order: 0, name: 'Step 1' }];
      mockFetchAll.mockResolvedValue({ resources: steps });
      const result = await service.getByMigrationId('m1', 't1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('st1');
    });
  });

  describe('updateStatus', () => {
    it('updates step status and returns resource', async () => {
      const existing = {
        id: 'st1',
        tenantId: 't1',
        migrationId: 'm1',
        status: MigrationStepStatus.PENDING,
        results: undefined,
      };
      const updated = { ...existing, status: MigrationStepStatus.COMPLETED, results: { filesChanged: 1 } };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.updateStatus('st1', 't1', MigrationStepStatus.COMPLETED, {
        results: { filesChanged: 1 },
        completedAt: new Date(),
      });
      expect(result.status).toBe(MigrationStepStatus.COMPLETED);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when step is RUNNING', async () => {
      mockRead.mockResolvedValue({
        resource: { id: 'st1', tenantId: 't1', migrationId: 'm1', status: MigrationStepStatus.RUNNING },
      });
      await expect(service.delete('st1', 't1')).rejects.toThrow(/currently running/);
    });
    it('removes step from migration and deletes step', async () => {
      mockRead.mockResolvedValue({
        resource: { id: 'st1', tenantId: 't1', migrationId: 'm1', status: MigrationStepStatus.PENDING },
      });
      mockMigrationGetById.mockResolvedValue({ id: 'm1', tenantId: 't1', steps: ['st1'], updatedAt: new Date() });
      await expect(service.delete('st1', 't1')).resolves.toBeUndefined();
      expect(mockReplace).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
