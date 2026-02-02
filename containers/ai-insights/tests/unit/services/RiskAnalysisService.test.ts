/**
 * RiskAnalysisService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskAnalysisService } from '../../../src/services/RiskAnalysisService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { RiskLevel } from '../../../src/types/insight.types';

describe('RiskAnalysisService', () => {
  let service: RiskAnalysisService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseCreateInput = {
    tenantId: 't1',
    userId: 'u1',
    shardId: 'sh1',
    shardName: 'Opp 1',
    shardTypeId: 'opportunity',
    riskFactors: [
      { factor: 'F1', severity: RiskLevel.MEDIUM, description: 'Desc 1' },
      { factor: 'F2', severity: RiskLevel.HIGH, description: 'Desc 2' },
    ],
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
    service = new RiskAnalysisService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when shardId is missing', async () => {
      await expect(
        service.create({ ...baseCreateInput, shardId: '' })
      ).rejects.toThrow(BadRequestError);
    });
    it('throws BadRequestError when riskFactors is empty', async () => {
      await expect(
        service.create({ ...baseCreateInput, riskFactors: [] })
      ).rejects.toThrow(BadRequestError);
    });
    it('creates risk analysis with computed score and level', async () => {
      const created = {
        id: 'ra-1',
        tenantId: 't1',
        shardId: 'sh1',
        riskLevel: RiskLevel.HIGH,
        riskScore: 50,
        riskFactors: baseCreateInput.riskFactors,
        probability: 50,
        impact: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'u1',
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseCreateInput);
      expect(result.tenantId).toBe('t1');
      expect(result.shardId).toBe('sh1');
      expect(result.riskFactors).toHaveLength(2);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          shardId: 'sh1',
          riskFactors: baseCreateInput.riskFactors,
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
    it('throws BadRequestError when analysisId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('ra1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns risk analysis when found', async () => {
      const analysis = {
        id: 'ra1',
        tenantId: 't1',
        shardId: 'sh1',
        riskLevel: RiskLevel.MEDIUM,
        riskScore: 30,
      };
      mockRead.mockResolvedValue({ resource: analysis });
      const result = await service.getById('ra1', 't1');
      expect(result.id).toBe('ra1');
      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('ra1', 't1')).rejects.toThrow(NotFoundError);
    });
    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('ra1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('recomputes score/level and returns resource', async () => {
      const existing = {
        id: 'ra1',
        tenantId: 't1',
        riskFactors: baseCreateInput.riskFactors,
        riskScore: 50,
        riskLevel: RiskLevel.HIGH,
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        riskFactors: [
          { factor: 'F1', severity: RiskLevel.CRITICAL, description: 'D' },
        ],
        riskScore: 100,
        riskLevel: RiskLevel.CRITICAL,
        updatedAt: new Date(),
      };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('ra1', 't1', {
        riskFactors: [{ factor: 'F1', severity: RiskLevel.CRITICAL, description: 'D' }],
      });
      expect(result.riskFactors).toHaveLength(1);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes when analysis exists', async () => {
      mockRead.mockResolvedValue({ resource: { id: 'ra1', tenantId: 't1' } });
      mockDelete.mockResolvedValue(undefined);
      await expect(service.delete('ra1', 't1')).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns items', async () => {
      const items = [
        { id: 'ra1', tenantId: 't1', shardId: 'sh1', riskLevel: RiskLevel.HIGH },
      ];
      mockFetchNext.mockResolvedValue({ resources: items });
      const result = await service.list('t1', { limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ra1');
    });
  });
});
