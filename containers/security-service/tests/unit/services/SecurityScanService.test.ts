/**
 * SecurityScanService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityScanService } from '../../../src/services/SecurityScanService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { SecurityScanStatus, SecurityScanType } from '../../../src/types/security.types';

describe('SecurityScanService', () => {
  let service: SecurityScanService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseScan = {
    id: 's1',
    tenantId: 't1',
    type: SecurityScanType.SECRET_SCAN,
    status: SecurityScanStatus.PENDING,
    target: { type: 'file' as const, path: '/app/src' },
    createdAt: new Date(),
    createdBy: 'u1',
  };

  const createInput = {
    tenantId: 't1',
    userId: 'u1',
    type: SecurityScanType.SECRET_SCAN,
    target: { type: 'file' as const, path: '/app/src' },
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
    service = new SecurityScanService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, type, or target is missing', async () => {
      await expect(
        service.create({ ...createInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.create({ ...createInput, type: undefined as unknown as SecurityScanType })
      ).rejects.toThrow(/tenantId, type, and target are required/);
      await expect(
        service.create({ ...createInput, target: undefined as unknown as typeof createInput.target })
      ).rejects.toThrow(BadRequestError);
    });

    it('creates scan and returns resource', async () => {
      mockCreate.mockResolvedValue({ resource: baseScan });
      const result = await service.create(createInput);
      expect(result.tenantId).toBe('t1');
      expect(result.type).toBe(SecurityScanType.SECRET_SCAN);
      expect(result.status).toBe(SecurityScanStatus.PENDING);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          type: SecurityScanType.SECRET_SCAN,
          status: SecurityScanStatus.PENDING,
          target: createInput.target,
        }),
        { partitionKey: 't1' }
      );
    });

    it('throws when create returns no resource', async () => {
      mockCreate.mockResolvedValue({ resource: null });
      await expect(service.create(createInput)).rejects.toThrow(
        /Failed to create security scan/
      );
    });

    it('throws BadRequestError on 409 conflict', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.create(createInput)).rejects.toThrow(/already exists/);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when scanId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('s1', '')).rejects.toThrow(/scanId and tenantId are required/);
    });

    it('returns scan when found', async () => {
      mockRead.mockResolvedValue({ resource: baseScan });
      const result = await service.getById('s1', 't1');
      expect(result).toEqual(baseScan);
      expect(mockRead).toHaveBeenCalled();
    });

    it('throws NotFoundError when resource is null', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('s1', 't1')).rejects.toThrow(NotFoundError);
      await expect(service.getById('s1', 't1')).rejects.toThrow(/not found/);
    });

    it('throws NotFoundError on 404', async () => {
      mockRead.mockRejectedValue({ code: 404 });
      await expect(service.getById('s1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates scan and returns resource', async () => {
      const existing = { ...baseScan };
      const updated = { ...existing, status: SecurityScanStatus.COMPLETED };
      mockRead.mockResolvedValue({ resource: existing });
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.update('s1', 't1', { status: SecurityScanStatus.COMPLETED });
      expect(result.status).toBe(SecurityScanStatus.COMPLETED);
      expect(mockReplace).toHaveBeenCalled();
    });

    it('throws NotFoundError on 404 from replace', async () => {
      mockRead.mockResolvedValue({ resource: baseScan });
      mockReplace.mockRejectedValue({ code: 404 });
      await expect(service.update('s1', 't1', { status: SecurityScanStatus.COMPLETED })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('delete', () => {
    it('deletes scan when status is not SCANNING', async () => {
      mockRead.mockResolvedValue({ resource: baseScan });
      await service.delete('s1', 't1');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('throws BadRequestError when scan status is SCANNING', async () => {
      mockRead.mockResolvedValue({
        resource: { ...baseScan, status: SecurityScanStatus.SCANNING },
      });
      await expect(service.delete('s1', 't1')).rejects.toThrow(/currently running/);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [baseScan];
      mockFetchNext.mockResolvedValue({ resources: items, continuationToken: 'token1' });
      const result = await service.list('t1');
      expect(result.items).toEqual(items);
      expect(result.continuationToken).toBe('token1');
    });

    it('throws on list failure', async () => {
      mockFetchNext.mockRejectedValue(new Error('db error'));
      await expect(service.list('t1')).rejects.toThrow(
        /Failed to list security scans/
      );
    });
  });
});
