/**
 * ReportService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../../../src/services/ReportService';
import { AnalyticsService } from '../../../src/services/AnalyticsService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';

describe('ReportService', () => {
  let service: ReportService;
  let mockGetDashboardMetrics: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  const baseGenerateInput = {
    tenantId: 't1',
    userId: 'u1',
    reportName: 'Weekly Report',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-07'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboardMetrics = vi.fn().mockResolvedValue([]);
    mockCreate = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: { ...doc, id: doc?.id || 'r1' } }));
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    mockDelete = vi.fn().mockResolvedValue(undefined);
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: mockFetchNext })) },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: mockDelete })),
    } as unknown as ReturnType<typeof getContainer>);
    const analyticsService = { getDashboardMetrics: mockGetDashboardMetrics } as unknown as AnalyticsService;
    service = new ReportService(analyticsService);
  });

  describe('generateReport', () => {
    it('throws BadRequestError when tenantId or reportName is missing', async () => {
      await expect(service.generateReport({ ...baseGenerateInput, tenantId: '' } as any)).rejects.toThrow(BadRequestError);
      await expect(service.generateReport({ ...baseGenerateInput, reportName: '' } as any)).rejects.toThrow(BadRequestError);
    });
    it('calls getDashboardMetrics and creates report', async () => {
      const result = await service.generateReport(baseGenerateInput as any);
      expect(result.tenantId).toBe('t1');
      expect(result.reportName).toBe('Weekly Report');
      expect(mockGetDashboardMetrics).toHaveBeenCalledWith('t1', [], expect.objectContaining({
        startDate: baseGenerateInput.startDate,
        endDate: baseGenerateInput.endDate,
      }));
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', reportName: 'Weekly Report' }),
        { partitionKey: 't1' }
      );
    });
    it('throws BadRequestError on 409', async () => {
      mockCreate.mockRejectedValue({ code: 409 });
      await expect(service.generateReport(baseGenerateInput as any)).rejects.toThrow(BadRequestError);
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when reportId or tenantId is missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('r1', '')).rejects.toThrow(BadRequestError);
    });
    it('returns report when found', async () => {
      const report = { id: 'r1', tenantId: 't1', reportName: 'Report' };
      mockRead.mockResolvedValue({ resource: report });
      const result = await service.getById('r1', 't1');
      expect(result.id).toBe('r1');
      expect(result.reportName).toBe('Report');
    });
    it('throws NotFoundError when not found', async () => {
      mockRead.mockResolvedValue({ resource: null });
      await expect(service.getById('r1', 't1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });
    it('returns reports from fetchNext', async () => {
      const reports = [{ id: 'r1', tenantId: 't1', reportName: 'R1' }];
      mockFetchNext.mockResolvedValue({ resources: reports });
      const result = await service.list('t1', { limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].reportName).toBe('R1');
    });
  });
});
