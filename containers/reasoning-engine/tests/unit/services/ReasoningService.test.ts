/**
 * ReasoningService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReasoningService } from '../../../src/services/ReasoningService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ReasoningStatus, ReasoningType } from '../../../src/types/reasoning.types';

describe('ReasoningService', () => {
  let service: ReasoningService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseTask = {
    id: 'task1',
    tenantId: 'tenant1',
    type: ReasoningType.CHAIN_OF_THOUGHT,
    status: ReasoningStatus.PENDING,
    input: { query: 'What is 2+2?' },
    createdAt: new Date(),
    createdBy: 'u1',
  };

  const createInput = {
    tenantId: 'tenant1',
    userId: 'u1',
    type: ReasoningType.CHAIN_OF_THOUGHT,
    input: { query: 'What is 2+2?' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn();
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new ReasoningService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, type, or input.query is missing', async () => {
      await expect(
        service.create({ ...createInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...createInput, type: undefined as unknown as ReasoningType })
      ).rejects.toThrow(/tenantId, type, and input.query are required/);
      await expect(
        service.create({ ...createInput, input: undefined as unknown as typeof createInput.input })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...createInput, input: { query: '' } })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates task and returns resource', async () => {
      mockCreate.mockResolvedValue({ resource: baseTask });
      mockRead.mockResolvedValue({ resource: baseTask });
      mockReplace.mockResolvedValue({ resource: { ...baseTask, status: ReasoningStatus.COMPLETED } });
      const result = await service.create(createInput);
      expect(result.tenantId).toBe('tenant1');
      expect(result.type).toBe(ReasoningType.CHAIN_OF_THOUGHT);
      expect(result.status).toBe(ReasoningStatus.PENDING);
      expect(result.input.query).toBe('What is 2+2?');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant1',
          type: ReasoningType.CHAIN_OF_THOUGHT,
          status: ReasoningStatus.PENDING,
          input: { query: 'What is 2+2?' },
        }),
        { partitionKey: 'tenant1' }
      );
    });

    it('throws when create returns no resource', async () => {
      mockCreate.mockResolvedValue({ resource: null });
      await expect(service.create(createInput)).rejects.toThrow(
        /Failed to create reasoning task/
      );
    });

    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(createInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when taskId or tenantId is missing', async () => {
      await expect(service.getById('', 'tenant1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('task1', '')).rejects.toThrow(/taskId and tenantId are required/);
    });

    it('returns task when found', async () => {
      mockRead.mockResolvedValue({ resource: baseTask });
      const result = await service.getById('task1', 'tenant1');
      expect(result).toEqual(baseTask);
      expect(mockRead).toHaveBeenCalled();
    });

    it('throws NotFoundError when resource is null', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('task1', 'tenant1')).rejects.toThrow(NotFoundError);
      await expect(service.getById('task1', 'tenant1')).rejects.toThrow(/not found/);
    });

    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('task1', 'tenant1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns resource', async () => {
      const existing = { ...baseTask };
      const updated = { ...existing, status: ReasoningStatus.COMPLETED };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.updateStatus(
        'task1',
        'tenant1',
        ReasoningStatus.COMPLETED
      );
      expect(result.status).toBe(ReasoningStatus.COMPLETED);
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task1',
          tenantId: 'tenant1',
          status: ReasoningStatus.COMPLETED,
        })
      );
    });

    it('throws NotFoundError on 404 from replace', async () => {
      mockRead.mockResolvedValue({ resource: baseTask });
      mockReplace.mockRejectedValue({ code: 404 });
      await expect(
        service.updateStatus('task1', 'tenant1', ReasoningStatus.COMPLETED)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    it('calls updateStatus with CANCELLED', async () => {
      mockRead.mockResolvedValue({ resource: baseTask });
      mockReplace.mockResolvedValue({
        resource: { ...baseTask, status: ReasoningStatus.CANCELLED },
      });
      const result = await service.cancel('task1', 'tenant1');
      expect(result.status).toBe(ReasoningStatus.CANCELLED);
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReasoningStatus.CANCELLED })
      );
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [baseTask];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'token1' });
      const result = await service.list('tenant1');
      expect(result.items).toEqual(items);
      expect(result.continuationToken).toBe('token1');
    });

    it('applies limit from filters', async () => {
      mockFetchNext.mockResolvedValue({
        resources: Array(10).fill({ id: 'x', tenantId: 'tenant1' }),
        continuationToken: undefined,
      });
      const result = await service.list('tenant1', { limit: 5 });
      expect(result.items).toHaveLength(5);
    });

    it('throws on list failure', async () => {
      mockFetchNext.mockRejectedValue(new Error('db error'));
      await expect(service.list('tenant1')).rejects.toThrow(
        /Failed to list reasoning tasks/
      );
    });
  });
});
