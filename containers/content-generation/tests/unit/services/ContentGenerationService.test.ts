/**
 * Unit tests for ContentGenerationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContentGenerationService } from '../../../src/services/ContentGenerationService';
import { GenerationJobStatus } from '../../../src/types/content.types';

describe('ContentGenerationService', () => {
  const aiUrl = 'http://ai.test';
  const shardUrl = 'http://shard.test';
  let service: ContentGenerationService;

  beforeEach(() => {
    service = new ContentGenerationService(aiUrl, shardUrl);
  });

  describe('create', () => {
    it('creates a job with required fields', async () => {
      const input = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        prompt: 'Write a summary',
      };
      const created = {
        ...input,
        id: 'job-id',
        status: GenerationJobStatus.PENDING,
        retryCount: 0,
        maxRetries: 2,
        createdAt: new Date(),
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
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'job-id',
              tenantId: input.tenantId,
              prompt: input.prompt,
              status: GenerationJobStatus.PENDING,
              createdAt: new Date(),
              retryCount: 0,
              maxRetries: 2,
            },
          }),
          replace: vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc })),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.create(input);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: input.tenantId,
          prompt: input.prompt,
        }),
        { partitionKey: input.tenantId }
      );
      expect(result.tenantId).toBe(input.tenantId);
      expect(result.prompt).toBe(input.prompt);
    });

    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({
          tenantId: '',
          userId: 'u1',
          prompt: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when prompt is empty', async () => {
      await expect(
        service.create({
          tenantId: 't1',
          userId: 'u1',
          prompt: '   ',
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
          prompt: 'x',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when jobId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('j1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns job when found', async () => {
      const job = {
        id: 'j1',
        tenantId: 't1',
        userId: 'u1',
        prompt: 'x',
        status: GenerationJobStatus.PENDING,
        retryCount: 0,
        maxRetries: 2,
        createdAt: new Date(),
      };
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: job }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.getById('j1', 't1');

      expect(result).toEqual(job);
    });

    it('throws NotFoundError when job not found', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({ resource: null }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.getById('j1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    it('throws BadRequestError when job is already completed', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'j1',
              tenantId: 't1',
              status: GenerationJobStatus.COMPLETED,
              prompt: 'x',
              retryCount: 0,
              maxRetries: 2,
              createdAt: new Date(),
            },
          }),
          replace: vi.fn(),
          delete: vi.fn(),
        })),
      } as any);

      await expect(service.cancel('j1', 't1')).rejects.toThrow(BadRequestError);
    });

    it('updates status to CANCELLED when job is pending', async () => {
      const mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
      vi.mocked(getContainer).mockReturnValue({
        items: { create: vi.fn(), query: vi.fn(() => ({ fetchNext: vi.fn(), fetchAll: vi.fn() })) },
        item: vi.fn(() => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              resource: {
                id: 'j1',
                tenantId: 't1',
                status: GenerationJobStatus.PENDING,
                prompt: 'x',
                retryCount: 0,
                maxRetries: 2,
                createdAt: new Date(),
              },
            })
            .mockResolvedValueOnce({
              resource: {
                id: 'j1',
                tenantId: 't1',
                status: GenerationJobStatus.PENDING,
                prompt: 'x',
                retryCount: 0,
                maxRetries: 2,
                createdAt: new Date(),
              },
            }),
          replace: mockReplace,
          delete: vi.fn(),
        })),
      } as any);

      const result = await service.cancel('j1', 't1');

      expect(mockReplace).toHaveBeenCalled();
      expect(result.status).toBe(GenerationJobStatus.CANCELLED);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const jobs = [
        {
          id: 'j1',
          tenantId: 't1',
          userId: 'u1',
          prompt: 'x',
          status: GenerationJobStatus.PENDING,
          retryCount: 0,
          maxRetries: 2,
          createdAt: new Date(),
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn().mockResolvedValue({ resources: jobs, continuationToken: 'tok' }),
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
