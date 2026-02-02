/**
 * Sync Task Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { SyncTaskService } from '../../../src/services/SyncTaskService';

describe('SyncTaskService', () => {
  let service: SyncTaskService;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({ resource: { id: 'task-1', tenantId: 't1', status: 'running' } });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
      item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }) })),
    } as any);
    service = new SyncTaskService();
  });

  describe('create', () => {
    it('should throw when tenantId missing', async () => {
      await expect(
        service.create({
          integrationId: 'i1',
          jobType: 'full',
          trigger: 'manual',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/tenantId is required/);
    });

    it('should throw when integrationId, jobType, or trigger missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          jobType: 'full',
          trigger: 'manual',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/integrationId is required/);
      await expect(
        service.create({
          tenantId: 't1',
          integrationId: 'i1',
          trigger: 'manual',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/jobType is required/);
      await expect(
        service.create({
          tenantId: 't1',
          integrationId: 'i1',
          jobType: 'full',
          userId: 'u1',
        } as any)
      ).rejects.toThrow(/trigger is required/);
    });

    it('should create and return task', async () => {
      const input = {
        tenantId: 't1',
        integrationId: 'i1',
        jobType: 'full',
        trigger: 'manual',
        userId: 'u1',
      };
      const result = await service.create(input);
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('task-1');
    });
  });
});
