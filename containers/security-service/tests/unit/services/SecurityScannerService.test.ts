/**
 * SecurityScannerService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityScannerService } from '../../../src/services/SecurityScannerService';
import { SecurityScanService } from '../../../src/services/SecurityScanService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';
import { SecurityScanStatus, SecurityScanType } from '../../../src/types/security.types';

describe('SecurityScannerService', () => {
  let scannerService: SecurityScannerService;
  let mockScanService: {
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const baseScan = {
    id: 's1',
    tenantId: 't1',
    type: SecurityScanType.SECRET_SCAN,
    status: SecurityScanStatus.PENDING,
    target: { type: 'file' as const, path: '/app/src' },
    createdAt: new Date(),
    createdBy: 'u1',
  };

  const runInput = {
    tenantId: 't1',
    userId: 'u1',
    scanId: 's1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockScanService = {
      getById: vi.fn(),
      update: vi.fn(),
    };
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })),
      },
      item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    const scanService = mockScanService as unknown as SecurityScanService;
    scannerService = new SecurityScannerService(scanService);
  });

  describe('runScan', () => {
    it('throws BadRequestError when tenantId or scanId is missing', async () => {
      await expect(
        scannerService.runScan({ ...runInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        scannerService.runScan({ ...runInput, scanId: '' })
      ).rejects.toThrow(/tenantId and scanId are required/);
    });

    it('throws BadRequestError when scan is already running', async () => {
      mockScanService.getById.mockResolvedValue({
        ...baseScan,
        status: SecurityScanStatus.SCANNING,
      });
      await expect(scannerService.runScan(runInput)).rejects.toThrow(
        /Scan is already running/
      );
      expect(mockScanService.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when scan is already completed', async () => {
      mockScanService.getById.mockResolvedValue({
        ...baseScan,
        status: SecurityScanStatus.COMPLETED,
      });
      await expect(scannerService.runScan(runInput)).rejects.toThrow(
        /Scan has already been completed/
      );
      expect(mockScanService.update).not.toHaveBeenCalled();
    });

    it('updates scan to SCANNING and returns updated scan', async () => {
      mockScanService.getById.mockResolvedValue(baseScan);
      const updatedScan = {
        ...baseScan,
        status: SecurityScanStatus.SCANNING,
        startedAt: new Date(),
      };
      mockScanService.update.mockResolvedValue(updatedScan);
      const result = await scannerService.runScan(runInput);
      expect(result.status).toBe(SecurityScanStatus.SCANNING);
      expect(result.startedAt).toBeDefined();
      expect(mockScanService.getById).toHaveBeenCalledWith('s1', 't1');
      expect(mockScanService.update).toHaveBeenCalledWith(
        's1',
        't1',
        expect.objectContaining({
          status: SecurityScanStatus.SCANNING,
          startedAt: expect.any(Date),
        })
      );
    });

    it('propagates getById error', async () => {
      mockScanService.getById.mockRejectedValue(new Error('not found'));
      await expect(scannerService.runScan(runInput)).rejects.toThrow('not found');
    });

    it('propagates first update error', async () => {
      mockScanService.getById.mockResolvedValue(baseScan);
      mockScanService.update.mockRejectedValue(new Error('update failed'));
      await expect(scannerService.runScan(runInput)).rejects.toThrow('update failed');
    });
  });
});
