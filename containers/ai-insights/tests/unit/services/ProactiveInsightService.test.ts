/**
 * ProactiveInsightService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProactiveInsightService } from '../../../src/services/ProactiveInsightService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ProactiveInsightStatus } from '../../../src/types/insight.types';

describe('ProactiveInsightService', () => {
  let service: ProactiveInsightService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    triggerId: 'tr1',
    triggerName: 'Stale opportunity',
    type: 'stale_opportunity',
    priority: 'medium',
    shardId: 'sh1',
    shardName: 'Opp 1',
    shardTypeId: 'opportunity',
    title: 'Proactive insight',
    summary: 'Summary',
    matchedConditions: [],
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
    service = new ProactiveInsightService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when triggerId is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, triggerId: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when shardId is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, shardId: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('creates proactive insight and returns resource', async () => {
      const created = {
        id: 'pi-1',
        tenantId: 't1',
        triggerId: 'tr1',
        status: ProactiveInsightStatus.NEW,
        title: 'Proactive insight',
        summary: 'Summary',
        deliveries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseCreateInput);
      expect(result.tenantId).toBe('t1');
      expect(result.triggerId).toBe('tr1');
      expect(result.title).toBe('Proactive insight');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          triggerId: 'tr1',
          shardId: 'sh1',
        }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseCreateInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when insightId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('pi1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns proactive insight when found', async () => {
      const insight = {
        id: 'pi1',
        tenantId: 't1',
        triggerId: 'tr1',
        title: 'Insight',
        summary: 'Summary',
        status: ProactiveInsightStatus.NEW,
      };
      mockRead.mockResolvedValue({ resource: insight });
      const result = await service.getById('pi1', 't1');
      expect(result.id).toBe('pi1');
      expect(result.title).toBe('Insight');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('pi1', 't1')).rejects.toThrow(NotFoundError);
    });
    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('pi1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates and returns resource', async () => {
      const existing = {
        id: 'pi1',
        tenantId: 't1',
        status: ProactiveInsightStatus.NEW,
        deliveries: [],
        updatedAt: new Date(),
      };
      const updated = { ...existing, status: ProactiveInsightStatus.ACKNOWLEDGED, updatedAt: new Date() };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('pi1', 't1', {
        status: ProactiveInsightStatus.ACKNOWLEDGED,
        acknowledgedBy: 'u1',
      });
      expect(result.status).toBe(ProactiveInsightStatus.ACKNOWLEDGED);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('recordDelivery', () => {
    it('appends delivery and returns resource', async () => {
      const existing = {
        id: 'pi1',
        tenantId: 't1',
        deliveries: [],
        updatedAt: new Date(),
      };
      const delivery = { id: 'd1', channel: 'in_app', status: 'delivered' as const };
      const updated = {
        ...existing,
        deliveries: [delivery],
        updatedAt: new Date(),
      };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.recordDelivery('pi1', 't1', delivery as any);
      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries![0].id).toBe('d1');
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns items', async () => {
      const items = [
        { id: 'pi1', tenantId: 't1', title: 'A', status: ProactiveInsightStatus.NEW },
      ];
      mockFetchNext.mockResolvedValue({ resources: items });
      const result = await service.list('t1', { limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pi1');
    });
  });
});
