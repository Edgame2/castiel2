/**
 * MultiModalService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiModalService } from '../../../src/services/MultiModalService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ModalType, ProcessingStatus } from '../../../src/types/multimodal.types';

describe('MultiModalService', () => {
  let service: MultiModalService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseJob = {
    id: 'job1',
    tenantId: 'tenant1',
    type: ModalType.IMAGE,
    status: ProcessingStatus.PENDING,
    input: { url: 'https://example.com/img.png' },
    createdAt: new Date(),
    createdBy: 'u1',
  };

  const createInput = {
    tenantId: 'tenant1',
    userId: 'u1',
    type: ModalType.IMAGE,
    input: { url: 'https://example.com/img.png' },
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
    service = new MultiModalService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, type, or input is missing', async () => {
      await expect(
        service.create({ ...createInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...createInput, type: undefined as unknown as ModalType })
      ).rejects.toThrow(/tenantId, type, and input are required/);
      await expect(
        service.create({ ...createInput, input: undefined as unknown as typeof createInput.input })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when neither url nor data provided', async () => {
      await expect(
        service.create({ ...createInput, input: {} })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...createInput, input: {} })
      ).rejects.toThrow(/Either url or data must be provided/);
    });

    it('accepts input with data instead of url', async () => {
      mockCreate.mockResolvedValue({ resource: baseJob });
      mockRead.mockResolvedValue({ resource: baseJob });
      mockReplace.mockResolvedValue({ resource: { ...baseJob, status: ProcessingStatus.COMPLETED } });
      const result = await service.create({
        ...createInput,
        input: { data: 'base64data' },
      });
      expect(result.tenantId).toBe('tenant1');
      expect(result.type).toBe(ModalType.IMAGE);
      expect(result.status).toBe(ProcessingStatus.PENDING);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('creates job and returns resource', async () => {
      mockCreate.mockResolvedValue({ resource: baseJob });
      mockRead.mockResolvedValue({ resource: baseJob });
      mockReplace.mockResolvedValue({ resource: { ...baseJob, status: ProcessingStatus.COMPLETED } });
      const result = await service.create(createInput);
      expect(result.tenantId).toBe('tenant1');
      expect(result.type).toBe(ModalType.IMAGE);
      expect(result.status).toBe(ProcessingStatus.PENDING);
      expect(result.input.url).toBe('https://example.com/img.png');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant1',
          type: ModalType.IMAGE,
          status: ProcessingStatus.PENDING,
          input: { url: 'https://example.com/img.png' },
        }),
        expect.any(Object)
      );
    });

    it('throws when create returns no resource', async () => {
      mockCreate.mockResolvedValue({ resource: null });
      await expect(service.create(createInput)).rejects.toThrow(
        /Failed to create multi-modal job/
      );
    });

    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(createInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when jobId or tenantId is missing', async () => {
      await expect(service.getById('', 'tenant1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('job1', '')).rejects.toThrow(/jobId and tenantId are required/);
    });

    it('returns job when found', async () => {
      mockRead.mockResolvedValue({ resource: baseJob });
      const result = await service.getById('job1', 'tenant1');
      expect(result).toEqual(baseJob);
      expect(mockRead).toHaveBeenCalled();
    });

    it('throws NotFoundError when resource is null', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('job1', 'tenant1')).rejects.toThrow(NotFoundError);
      await expect(service.getById('job1', 'tenant1')).rejects.toThrow(/Multi-modal job/);
    });

    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('job1', 'tenant1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns resource', async () => {
      const existing = { ...baseJob };
      const updated = { ...existing, status: ProcessingStatus.COMPLETED };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.updateStatus(
        'job1',
        'tenant1',
        ProcessingStatus.COMPLETED
      );
      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job1',
          tenantId: 'tenant1',
          status: ProcessingStatus.COMPLETED,
        })
      );
    });

    it('throws NotFoundError on 404 from replace', async () => {
      mockRead.mockResolvedValue({ resource: baseJob });
      mockReplace.mockRejectedValue({ code: 404 });
      await expect(
        service.updateStatus('job1', 'tenant1', ProcessingStatus.COMPLETED)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    it('calls updateStatus with CANCELLED', async () => {
      mockRead.mockResolvedValue({ resource: baseJob });
      mockReplace.mockResolvedValue({
        resource: { ...baseJob, status: ProcessingStatus.CANCELLED },
      });
      const result = await service.cancel('job1', 'tenant1');
      expect(result.status).toBe(ProcessingStatus.CANCELLED);
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProcessingStatus.CANCELLED })
      );
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [baseJob];
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
        /Failed to list multi-modal jobs/
      );
    });
  });
});
