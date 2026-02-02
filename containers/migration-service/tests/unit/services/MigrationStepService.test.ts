/**
 * Unit tests for MigrationStepService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MigrationService } from '../../../src/services/MigrationService';
import { MigrationStepService } from '../../../src/services/MigrationStepService';
import { MigrationStepStatus } from '../../../src/types/migration.types';

describe('MigrationStepService', () => {
  let migrationService: MigrationService;
  let service: MigrationStepService;

  beforeEach(() => {
    migrationService = new MigrationService();
    service = new MigrationStepService(migrationService);
  });

  const migrationWithSteps = (steps: string[]) => ({
    id: 'm1',
    tenantId: 't1',
    name: 'M1',
    type: 'version_upgrade' as any,
    status: 'draft' as any,
    scope: { type: 'file' as const, paths: ['/src'] },
    source: {},
    target: {},
    steps,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'u1',
  });

  describe('create', () => {
    it('creates a step and appends to migration steps', async () => {
      const input = {
        tenantId: 't1',
        userId: 'u1',
        migrationId: 'm1',
        name: 'Step 1',
        transformation: { type: 'replace' as const, pattern: 'x', replacement: 'y' },
      };
      const migration = migrationWithSteps([]);
      const createdStep = {
        id: 's1',
        tenantId: 't1',
        migrationId: 'm1',
        order: 1,
        name: 'Step 1',
        status: MigrationStepStatus.PENDING,
        transformation: input.transformation,
        createdAt: new Date(),
      };
      const mockCreate = vi.fn().mockImplementation((doc: any) =>
        Promise.resolve({ resource: { ...doc, id: 's1' } })
      );
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          })),
        },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: migration }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ steps: ['s1'] })
      );
      expect(result.migrationId).toBe('m1');
    });

    it('throws BadRequestError when migrationId is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          migrationId: '',
          name: 'S',
          transformation: { type: 'replace', pattern: 'x', replacement: 'y' },
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          migrationId: 'm1',
          name: '',
          transformation: { type: 'replace', pattern: 'x', replacement: 'y' },
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when stepId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('s1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns step when found', async () => {
      const step = {
        id: 's1',
        tenantId: 't1',
        migrationId: 'm1',
        order: 1,
        name: 'S1',
        status: MigrationStepStatus.PENDING,
        transformation: {},
        createdAt: new Date(),
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: step }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('s1', 't1');
      expect(result).toEqual(step);
    });

    it('throws NotFoundError when step not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('s1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByMigrationId', () => {
    it('throws BadRequestError when migrationId or tenantId is missing', async () => {
      await expect(service.getByMigrationId('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getByMigrationId('m1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns steps from fetchAll', async () => {
      const steps = [
        {
          id: 's1',
          tenantId: 't1',
          migrationId: 'm1',
          order: 1,
          name: 'S1',
          status: MigrationStepStatus.PENDING,
          transformation: {},
          createdAt: new Date(),
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources: steps }),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.getByMigrationId('m1', 't1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('S1');
    });
  });

  describe('updateStatus', () => {
    it('updates step status and returns step', async () => {
      const existing = {
        id: 's1',
        tenantId: 't1',
        migrationId: 'm1',
        order: 1,
        name: 'S1',
        status: MigrationStepStatus.PENDING,
        transformation: {},
        createdAt: new Date(),
      };
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.updateStatus('s1', 't1', MigrationStepStatus.COMPLETED);
      expect(mockReplace).toHaveBeenCalled();
      expect(result.status).toBe(MigrationStepStatus.COMPLETED);
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when step is RUNNING', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 's1',
              tenantId: 't1',
              migrationId: 'm1',
              status: MigrationStepStatus.RUNNING,
              steps: ['s1'],
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.delete('s1', 't1')).rejects.toThrow(BadRequestError);
    });
  });
});
