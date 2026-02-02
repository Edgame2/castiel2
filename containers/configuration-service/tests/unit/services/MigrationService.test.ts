/**
 * MigrationService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationService } from '../../../src/services/MigrationService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MigrationType, MigrationStatus } from '../../../src/types/migration.types';

describe('MigrationService', () => {
  let service: MigrationService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    userId: 'u1',
    name: 'Upgrade to v2',
    type: MigrationType.VERSION_UPGRADE,
    scope: { type: 'project' as const, paths: ['/src'] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    mockDelete = vi.fn().mockResolvedValue(undefined);
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: mockFetchNext })) },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new MigrationService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, name, type, or scope is missing', async () => {
      await expect(service.create({ ...baseCreateInput, tenantId: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, name: '' })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, type: undefined! })).rejects.toThrow(BadRequestError);
      await expect(service.create({ ...baseCreateInput, scope: undefined! })).rejects.toThrow(BadRequestError);
    });
    it('creates migration with DRAFT status', async () => {
      const created = {
        id: 'm1',
        tenantId: 't1',
        name: 'Upgrade to v2',
        type: MigrationType.VERSION_UPGRADE,
        status: MigrationStatus.DRAFT,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseCreateInput);
      expect(result.status).toBe(MigrationStatus.DRAFT);
      expect(result.steps).toEqual([]);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', name: 'Upgrade to v2', type: MigrationType.VERSION_UPGRADE }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when migrationId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('m1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns migration when found', async () => {
      const migration = { id: 'm1', tenantId: 't1', name: 'Upgrade', status: MigrationStatus.DRAFT };
      mockRead.mockResolvedValue({ resource: migration });
      const result = await service.getById('m1', 't1');
      expect(result.id).toBe('m1');
      expect(result.name).toBe('Upgrade');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('m1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns resource', async () => {
      const existing = { id: 'm1', tenantId: 't1', status: MigrationStatus.DRAFT, metadata: {}, updatedAt: new Date() };
      const updated = { ...existing, name: 'New name', updatedAt: new Date() };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('m1', 't1', { name: 'New name' });
      expect(result.name).toBe('New name');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throws BadRequestError when migration is RUNNING', async () => {
      mockRead.mockResolvedValue({ resource: { id: 'm1', tenantId: 't1', status: MigrationStatus.RUNNING } });
      await expect(service.delete('m1', 't1')).rejects.toThrow(/currently running/);
    });
    it('deletes when migration is not running', async () => {
      mockRead.mockResolvedValue({ resource: { id: 'm1', tenantId: 't1', status: MigrationStatus.DRAFT } });
      await expect(service.delete('m1', 't1')).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns items and continuationToken', async () => {
      const items = [{ id: 'm1', tenantId: 't1', name: 'Upgrade', status: MigrationStatus.DRAFT }];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'tok' });
      const result = await service.list('t1', { limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});
