/**
 * ComplianceCheckService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceCheckService } from '../../../src/services/ComplianceCheckService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ComplianceCheckStatus, ComplianceStandard } from '../../../src/types/compliance.types';

describe('ComplianceCheckService', () => {
  let service: ComplianceCheckService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseInput = {
    tenantId: 't1',
    userId: 'u1',
    standard: ComplianceStandard.WCAG,
    target: { type: 'project' as const, path: '/app' },
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
    service = new ComplianceCheckService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, standard, or target is missing', async () => {
      await expect(
        service.create({ ...baseInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...baseInput, standard: undefined as unknown as ComplianceStandard })
      ).rejects.toThrow(/tenantId, standard, and target are required/);
      await expect(
        service.create({ ...baseInput, target: undefined as unknown as typeof baseInput.target })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates check and returns resource', async () => {
      const created = {
        id: 'c1',
        tenantId: 't1',
        standard: ComplianceStandard.WCAG,
        status: ComplianceCheckStatus.PENDING,
        target: baseInput.target,
        createdAt: new Date(),
        createdBy: 'u1',
      };
      mockCreate.mockResolvedValue({ resource: created });
      const result = await service.create(baseInput);
      expect(result.tenantId).toBe('t1');
      expect(result.standard).toBe(ComplianceStandard.WCAG);
      expect(result.status).toBe(ComplianceCheckStatus.PENDING);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          standard: ComplianceStandard.WCAG,
          target: baseInput.target,
        }),
        { partitionKey: 't1' }
      );
    });

    it('throws when create returns no resource', async () => {
      mockCreate.mockResolvedValue({ resource: null });
      await expect(service.create(baseInput)).rejects.toThrow(/Failed to create compliance check/);
    });

    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(baseInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when checkId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('c1', '')).rejects.toThrow(BadRequestError);
    });

    it('returns check when found', async () => {
      const check = {
        id: 'c1',
        tenantId: 't1',
        standard: ComplianceStandard.WCAG,
        status: ComplianceCheckStatus.PENDING,
        target: baseInput.target,
        createdAt: new Date(),
        createdBy: 'u1',
      };
      mockRead.mockResolvedValue({ resource: check });
      const result = await service.getById('c1', 't1');
      expect(result).toEqual(check);
      expect(mockRead).toHaveBeenCalled();
    });

    it('throws NotFoundError when resource is null', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('c1', 't1')).rejects.toThrow(NotFoundError);
      await expect(service.getById('c1', 't1')).rejects.toThrow(/not found/);
    });

    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('c1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates check and returns resource', async () => {
      const existing = {
        id: 'c1',
        tenantId: 't1',
        standard: ComplianceStandard.WCAG,
        status: ComplianceCheckStatus.PENDING,
        target: baseInput.target,
        requirements: [],
        violations: [],
        summary: undefined,
        createdAt: new Date(),
        createdBy: 'u1',
      };
      const updated = { ...existing, status: ComplianceCheckStatus.COMPLIANT };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('c1', 't1', { status: ComplianceCheckStatus.COMPLIANT });
      expect(result.status).toBe(ComplianceCheckStatus.COMPLIANT);
      expect(mockReplace).toHaveBeenCalled();
    });

    it('throws NotFoundError on 404 from replace', async () => {
      mockRead.mockResolvedValue({
        resource: {
          id: 'c1',
          tenantId: 't1',
          standard: ComplianceStandard.WCAG,
          status: ComplianceCheckStatus.PENDING,
          target: baseInput.target,
          createdAt: new Date(),
          createdBy: 'u1',
        },
      });
      mockReplace.mockRejectedValue({ code: 404 });
      await expect(service.update('c1', 't1', { status: ComplianceCheckStatus.COMPLIANT })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('delete', () => {
    it('deletes check when status is not CHECKING', async () => {
      mockRead.mockResolvedValue({
        resource: {
          id: 'c1',
          tenantId: 't1',
          status: ComplianceCheckStatus.PENDING,
          target: baseInput.target,
          createdAt: new Date(),
          createdBy: 'u1',
        },
      });
      await service.delete('c1', 't1');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('throws BadRequestError when check status is CHECKING', async () => {
      mockRead.mockResolvedValue({
        resource: {
          id: 'c1',
          tenantId: 't1',
          status: ComplianceCheckStatus.CHECKING,
          target: baseInput.target,
          createdAt: new Date(),
          createdBy: 'u1',
        },
      });
      await expect(service.delete('c1', 't1')).rejects.toThrow(/currently running/);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [
        {
          id: 'c1',
          tenantId: 't1',
          standard: ComplianceStandard.WCAG,
          status: ComplianceCheckStatus.PENDING,
          target: baseInput.target,
          createdAt: new Date(),
          createdBy: 'u1',
        },
      ];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'token1' });
      const result = await service.list('t1');
      expect(result.items).toEqual(items);
      expect(result.continuationToken).toBe('token1');
    });

    it('applies limit from filters', async () => {
      mockFetchNext.mockResolvedValue({
        resources: Array(10).fill({ id: 'x', tenantId: 't1' }),
        continuationToken: undefined,
      });
      const result = await service.list('t1', { limit: 5 });
      expect(result.items).toHaveLength(5);
    });

    it('throws on list failure', async () => {
      mockFetchNext.mockRejectedValue(new Error('db error'));
      await expect(service.list('t1')).rejects.toThrow(/Failed to list compliance checks/);
    });
  });
});
