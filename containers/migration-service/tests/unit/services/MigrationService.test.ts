/**
 * Unit tests for MigrationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MigrationService } from '../../../src/services/MigrationService';
import { MigrationType, MigrationStatus } from '../../../src/types/migration.types';

describe('MigrationService', () => {
  let service: MigrationService;

  beforeEach(() => {
    service = new MigrationService();
  });

  const scope = { type: 'file' as const, paths: ['/src'] };
  const source = {};
  const target = {};

  describe('create', () => {
    it('creates a migration with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'Migration 1',
        type: MigrationType.VERSION_UPGRADE,
        scope,
        source,
        target,
      };
      const created = {
        ...input,
        id: 'mig-id',
        status: MigrationStatus.DRAFT,
        steps: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockCreate = vi.fn().mockResolvedValue({ resource: created });
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: mockCreate,
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          name: input.name,
          type: input.type,
          scope: input.scope,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result.tenantId).toBe(input.tenantId);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'u1',
          name: 'M',
          type: MigrationType.VERSION_UPGRADE,
          scope,
          source,
          target,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: '',
          type: MigrationType.VERSION_UPGRADE,
          scope,
          source,
          target,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when scope is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'M',
          type: MigrationType.VERSION_UPGRADE,
          scope: undefined as any,
          source,
          target,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      const mockCreate = vi.fn().mockRejectedValue({ code: 409 });
      vi.mocked(getContainer).mockReturnValue({
        items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'M',
          type: MigrationType.VERSION_UPGRADE,
          scope,
          source,
          target,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when migrationId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('m1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns migration when found', async () => {
      const migration = {
        id: 'm1',
        tenantId: 't1',
        name: 'M1',
        type: MigrationType.VERSION_UPGRADE,
        status: MigrationStatus.DRAFT,
        scope,
        source,
        target,
        steps: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: migration }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('m1', 't1');
      expect(result).toEqual(migration);
    });

    it('throws NotFoundError when migration not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('m1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates migration and returns updated resource', async () => {
      const existing = {
        id: 'm1',
        tenantId: 't1',
        name: 'Old',
        type: MigrationType.VERSION_UPGRADE,
        status: MigrationStatus.DRAFT,
        scope,
        source,
        target,
        steps: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
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

      const result = await service.update('m1', 't1', { name: 'New' });
      expect(mockReplace).toHaveBeenCalled();
      expect(result.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when migration is RUNNING', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'm1',
              tenantId: 't1',
              status: MigrationStatus.RUNNING,
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.delete('m1', 't1')).rejects.toThrow(BadRequestError);
    });

    it('deletes migration when status allows', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'm1',
              tenantId: 't1',
              status: MigrationStatus.DRAFT,
            },
          }),
          replace: vi.fn(),
          delete: mockDelete,
        })),
      } as any);

      await service.delete('m1', 't1');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [
        {
          id: 'm1',
          tenantId: 't1',
          name: 'M1',
          type: MigrationType.VERSION_UPGRADE,
          status: MigrationStatus.DRAFT,
          scope,
          source,
          target,
          steps: [],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: items, continuationToken: 'tok' }),
            fetchAll: vi.fn(),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      const result = await service.list('t1');
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});
