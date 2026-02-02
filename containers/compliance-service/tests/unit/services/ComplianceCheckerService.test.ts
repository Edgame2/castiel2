/**
 * ComplianceCheckerService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceCheckerService } from '../../../src/services/ComplianceCheckerService';
import { ComplianceCheckService } from '../../../src/services/ComplianceCheckService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';
import { ComplianceCheckStatus, ComplianceStandard } from '../../../src/types/compliance.types';

describe('ComplianceCheckerService', () => {
  let checkerService: ComplianceCheckerService;
  let mockCheckService: {
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const baseCheck = {
    id: 'c1',
    tenantId: 't1',
    standard: ComplianceStandard.WCAG,
    status: ComplianceCheckStatus.PENDING,
    target: { type: 'project' as const, path: '/app' },
    createdAt: new Date(),
    createdBy: 'u1',
  };

  const runInput = {
    tenantId: 't1',
    userId: 'u1',
    checkId: 'c1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckService = {
      getById: vi.fn(),
      update: vi.fn(),
    };
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })),
      },
      item: vi.fn(() => ({
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn(),
      })),
    } as unknown as ReturnType<typeof getContainer>);
    const checkService = mockCheckService as unknown as ComplianceCheckService;
    checkerService = new ComplianceCheckerService(checkService);
  });

  describe('runCheck', () => {
    it('throws BadRequestError when tenantId or checkId is missing', async () => {
      await expect(
        checkerService.runCheck({ ...runInput, tenantId: '' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        checkerService.runCheck({ ...runInput, checkId: '' })
      ).rejects.toThrow(/tenantId and checkId are required/);
    });

    it('throws BadRequestError when check is already running', async () => {
      mockCheckService.getById.mockResolvedValue({
        ...baseCheck,
        status: ComplianceCheckStatus.CHECKING,
      });
      await expect(checkerService.runCheck(runInput)).rejects.toThrow(
        /Compliance check is already running/
      );
      expect(mockCheckService.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when check is already completed (COMPLIANT)', async () => {
      mockCheckService.getById.mockResolvedValue({
        ...baseCheck,
        status: ComplianceCheckStatus.COMPLIANT,
      });
      await expect(checkerService.runCheck(runInput)).rejects.toThrow(
        /Compliance check has already been completed/
      );
      expect(mockCheckService.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when check is already completed (NON_COMPLIANT)', async () => {
      mockCheckService.getById.mockResolvedValue({
        ...baseCheck,
        status: ComplianceCheckStatus.NON_COMPLIANT,
      });
      await expect(checkerService.runCheck(runInput)).rejects.toThrow(
        /Compliance check has already been completed/
      );
      expect(mockCheckService.update).not.toHaveBeenCalled();
    });

    it('updates check to CHECKING and returns updated check', async () => {
      mockCheckService.getById.mockResolvedValue(baseCheck);
      const updatedCheck = {
        ...baseCheck,
        status: ComplianceCheckStatus.CHECKING,
        startedAt: new Date(),
      };
      mockCheckService.update.mockResolvedValue(updatedCheck);
      const result = await checkerService.runCheck(runInput);
      expect(result.status).toBe(ComplianceCheckStatus.CHECKING);
      expect(result.startedAt).toBeDefined();
      expect(mockCheckService.getById).toHaveBeenCalledWith('c1', 't1');
      expect(mockCheckService.update).toHaveBeenCalledWith(
        'c1',
        't1',
        expect.objectContaining({
          status: ComplianceCheckStatus.CHECKING,
          startedAt: expect.any(Date),
        })
      );
    });

    it('propagates getById error', async () => {
      mockCheckService.getById.mockRejectedValue(new Error('not found'));
      await expect(checkerService.runCheck(runInput)).rejects.toThrow('not found');
    });

    it('propagates first update error', async () => {
      mockCheckService.getById.mockResolvedValue(baseCheck);
      mockCheckService.update.mockRejectedValue(new Error('update failed'));
      await expect(checkerService.runCheck(runInput)).rejects.toThrow('update failed');
    });
  });
});
