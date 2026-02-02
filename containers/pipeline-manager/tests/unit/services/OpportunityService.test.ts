/**
 * Unit tests for OpportunityService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { OpportunityService } from '../../../src/services/OpportunityService';
import { SalesStage, OpportunityStatus } from '../../../src/types/pipeline.types';

describe('OpportunityService', () => {
  let service: OpportunityService;

  beforeEach(() => {
    service = new OpportunityService('http://shard-manager');
  });

  describe('create', () => {
    it('creates opportunity with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        name: 'Deal A',
        stage: SalesStage.QUALIFICATION,
        ownerId: 'owner-1',
      };
      const mockCreate = vi.fn().mockImplementation((doc: unknown) =>
        Promise.resolve({ resource: { ...(doc as object), id: (doc as { id?: string }).id || 'opp-id' } })
      );
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
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          structuredData: expect.objectContaining({
            name: input.name,
            stage: input.stage,
            ownerId: input.ownerId,
          }),
        }),
        { partitionKey: input.tenantId }
      );
      expect(result.tenantId).toBe(input.tenantId);
      expect(result.structuredData.name).toBe(input.name);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          name: 'Deal',
          stage: SalesStage.QUALIFICATION,
          ownerId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when name is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          name: '',
          stage: SalesStage.QUALIFICATION,
          ownerId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when stage is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          name: 'Deal',
          stage: undefined as unknown as SalesStage,
          ownerId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when ownerId is missing', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          name: 'Deal',
          stage: SalesStage.QUALIFICATION,
          ownerId: '',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn().mockRejectedValue({ code: 409 }),
          query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as unknown as ReturnType<typeof getContainer>);

      await expect(
        service.create({
          tenantId: 't1',
          name: 'Deal',
          stage: SalesStage.QUALIFICATION,
          ownerId: 'o1',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when opportunityId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('o1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns opportunity when found', async () => {
      const opportunity = {
        id: 'o1',
        tenantId: 't1',
        shardId: 'shard-1',
        structuredData: {
          name: 'Deal',
          stage: SalesStage.QUALIFICATION,
          ownerId: 'owner-1',
          expectedRevenue: 100,
          probability: 25,
          amount: 400,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: opportunity }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.getById('o1', 't1');
      expect(result).toEqual(opportunity);
    });

    it('throws NotFoundError when opportunity not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      await expect(service.getById('o1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates opportunity and returns updated resource', async () => {
      const existing = {
        id: 'o1',
        tenantId: 't1',
        shardId: 'shard-1',
        structuredData: {
          name: 'Deal',
          stage: SalesStage.QUALIFICATION,
          status: OpportunityStatus.OPEN,
          ownerId: 'owner-1',
          expectedRevenue: 100,
          probability: 25,
          amount: 400,
          isWon: false,
          isClosed: false,
          lastModifiedDate: new Date(),
          lastActivityDate: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockReplace = vi.fn().mockImplementation((doc: unknown) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.update('o1', 't1', { name: 'Deal Updated' });

      expect(mockReplace).toHaveBeenCalled();
      expect(result.structuredData.name).toBe('Deal Updated');
    });
  });

  describe('delete', () => {
    it('deletes opportunity and shard', async () => {
      const existing = {
        id: 'o1',
        tenantId: 't1',
        shardId: 'shard-1',
        structuredData: { name: 'Deal', stage: SalesStage.CLOSED_LOST, ownerId: 'o1' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: existing }),
          replace: vi.fn(),
          delete: mockDelete,
        })),
      } as unknown as ReturnType<typeof getContainer>);

      await service.delete('o1', 't1');
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
          id: 'o1',
          tenantId: 't1',
          shardId: 's1',
          structuredData: {
            name: 'Deal',
            stage: SalesStage.QUALIFICATION,
            ownerId: 'o1',
            expectedRevenue: 100,
            probability: 25,
            amount: 400,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
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
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.list('t1');
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('tok');
    });
  });
});
