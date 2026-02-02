/**
 * InsightService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightService } from '../../../src/services/InsightService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { InsightType, InsightStatus, InsightPriority } from '../../../src/types/insight.types';

describe('InsightService', () => {
  let service: InsightService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;
  const baseCreateInput = {
    tenantId: 't1',
    userId: 'u1',
    type: InsightType.RECOMMENDATION,
    priority: InsightPriority.MEDIUM,
    title: 'Test insight',
    summary: 'Summary',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn();
    mockDelete = vi.fn();
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new InsightService('http://ai', 'http://shard', 'http://embeddings');
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when title is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, title: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when summary is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, summary: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('creates insight and returns resource', async () => {
      const created = {
        id: 'ins-1',
        tenantId: 't1',
        type: InsightType.RECOMMENDATION,
        priority: InsightPriority.MEDIUM,
        status: InsightStatus.NEW,
        title: 'Test insight',
        summary: 'Summary',
        confidence: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseCreateInput);
      expect(result.tenantId).toBe('t1');
      expect(result.title).toBe('Test insight');
      expect(result.status).toBe(InsightStatus.NEW);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          title: 'Test insight',
          summary: 'Summary',
        }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('generate', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.generate({ tenantId: '', userId: 'u1' })
      ).rejects.toThrow(BadRequestError);
    });
    it('creates placeholder insight via create', async () => {
      const created = {
        id: 'gen-1',
        tenantId: 't1',
        title: 'AI Generated Insight',
        summary: 'context',
        status: InsightStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.generate({
        tenantId: 't1',
        userId: 'u1',
        context: 'context',
      });
      expect(result.title).toBe('AI Generated Insight');
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when insightId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('i1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns insight when found', async () => {
      const insight = {
        id: 'i1',
        tenantId: 't1',
        title: 'Insight',
        summary: 'Summary',
        status: InsightStatus.NEW,
      };
      mockRead.mockResolvedValue({ resource: insight });
      const result = await service.getById('i1', 't1');
      expect(result.id).toBe('i1');
      expect(result.title).toBe('Insight');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('i1', 't1')).rejects.toThrow(NotFoundError);
    });
    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('i1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns resource', async () => {
      const existing = {
        id: 'i1',
        tenantId: 't1',
        title: 'Old',
        summary: 'Summary',
        status: InsightStatus.NEW,
        updatedAt: new Date(),
      };
      const updated = { ...existing, title: 'New', status: InsightStatus.ACKNOWLEDGED, updatedAt: new Date() };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('i1', 't1', { status: InsightStatus.ACKNOWLEDGED, acknowledgedBy: 'u1' });
      expect(result.status).toBe(InsightStatus.ACKNOWLEDGED);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes when insight exists', async () => {
      mockRead.mockResolvedValue({ resource: { id: 'i1', tenantId: 't1' } });
      mockDelete.mockResolvedValue(undefined);
      await expect(service.delete('i1', 't1')).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns items and continuationToken', async () => {
      const items = [
        { id: 'i1', tenantId: 't1', title: 'A', status: InsightStatus.NEW },
      ];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'token' });
      const result = await service.list('t1', { limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.continuationToken).toBe('token');
    });
  });
});
