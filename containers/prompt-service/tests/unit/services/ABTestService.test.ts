/**
 * Unit tests for ABTestService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ABTestService } from '../../../src/services/ABTestService';
import { PromptABTestStatus } from '../../../src/types/prompt.types';

describe('ABTestService', () => {
  let service: ABTestService;

  beforeEach(() => {
    service = new ABTestService();
  });

  const twoVariants = [
    { variantId: 'control', promptId: 'p1', promptSlug: 'slug', name: 'Control', trafficPercentage: 50 },
    { variantId: 'treatment', promptId: 'p2', promptSlug: 'slug', name: 'Treatment', trafficPercentage: 50 },
  ];

  describe('create', () => {
    it('creates an A/B test with valid variants and traffic sum 100', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'Test 1',
        variants: twoVariants,
      };
      const created = { ...input, id: 'test-id', status: PromptABTestStatus.DRAFT, createdAt: new Date(), updatedAt: new Date() };
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
          variants: input.variants,
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
          name: 'T',
          variants: twoVariants,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when variants length < 2', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'T',
          variants: [{ variantId: 'a', promptId: 'p1', promptSlug: 's', name: 'A', trafficPercentage: 100 }],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when traffic percentages do not sum to 100', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          name: 'T',
          variants: [
            { variantId: 'a', promptId: 'p1', promptSlug: 's', name: 'A', trafficPercentage: 50 },
            { variantId: 'b', promptId: 'p2', promptSlug: 's', name: 'B', trafficPercentage: 40 },
          ],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      const mockCreate = vi.fn().mockRejectedValue({ code: 409 });
      vi.mocked(getContainer).mockReturnValue({
        items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as any);

      await expect(service.create({ tenantId: 't1', userId: 'u1', name: 'T', variants: twoVariants })).rejects.toThrow(
        BadRequestError
      );
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when testId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('x', '')).rejects.toThrow(BadRequestError);
    });

    it('returns test when found', async () => {
      const test = {
        id: 't1',
        tenantId: 't1',
        name: 'T1',
        variants: twoVariants,
        status: PromptABTestStatus.DRAFT,
        metrics: { control: { impressions: 0 }, treatment: { impressions: 0 } },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: test }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('t1', 't1');
      expect(result).toEqual(test);
    });

    it('throws NotFoundError when test not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('t1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates test and returns updated resource', async () => {
      const existing = {
        id: 't1',
        tenantId: 't1',
        name: 'Old',
        variants: twoVariants,
        status: PromptABTestStatus.DRAFT,
        metrics: {},
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

      const result = await service.update('t1', 't1', { status: PromptABTestStatus.ACTIVE });
      expect(mockReplace).toHaveBeenCalled();
      expect(result.status).toBe(PromptABTestStatus.ACTIVE);
    });
  });

  describe('selectVariant', () => {
    it('throws BadRequestError when test is not ACTIVE', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 't1',
              tenantId: 't1',
              status: PromptABTestStatus.DRAFT,
              variants: twoVariants,
              metrics: {},
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.selectVariant('t1', 't1', 'user1')).rejects.toThrow(BadRequestError);
    });

    it('returns variantId when test is ACTIVE', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 't1',
              tenantId: 't1',
              status: PromptABTestStatus.ACTIVE,
              variants: twoVariants,
              metrics: {},
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const variantId = await service.selectVariant('t1', 't1', 'user1');
      expect(['control', 'treatment']).toContain(variantId);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [
        {
          id: 't1',
          tenantId: 't1',
          name: 'T1',
          variants: twoVariants,
          status: PromptABTestStatus.DRAFT,
          metrics: {},
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
