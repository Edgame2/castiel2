/**
 * Utility Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UtilityService } from '../../../src/services/UtilityService';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    database: {
      containers: {
        utility_imports: 'utility_imports',
        utility_exports: 'utility_exports',
      },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('UtilityService', () => {
  let service: UtilityService;
  let mockImportContainer: any;
  let mockExportContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockImportContainer = {
      items: {
        create: vi.fn(),
        read: vi.fn(),
        replace: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
      },
      item: vi.fn().mockReturnValue({ read: vi.fn() }),
    };

    mockExportContainer = {
      items: {
        create: vi.fn(),
        read: vi.fn(),
        replace: vi.fn(),
      },
      item: vi.fn().mockReturnValue({ read: vi.fn() }),
    };

    (getContainer as any).mockImplementation((name: string) => {
      if (name === 'utility_imports') {
        return mockImportContainer;
      }
      if (name === 'utility_exports') {
        return mockExportContainer;
      }
      return mockImportContainer;
    });

    service = new UtilityService();
  });

  describe('createImportJob', () => {
    it('should create an import job successfully', async () => {
      const tenantId = 'tenant-123';
      const importType = 'csv';
      const data = { file: 'data.csv', records: [] };

      const mockJob = {
        id: 'job-123',
        tenantId,
        importType,
        status: 'pending',
        recordsProcessed: 0,
        recordsImported: 0,
        errors: [],
        createdAt: new Date(),
      };

      mockImportContainer.items.create.mockResolvedValue({
        resource: mockJob,
      });

      const result = await service.createImportJob(tenantId, importType, data);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending');
      expect(mockImportContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('createExportJob', () => {
    it('should create an export job successfully', async () => {
      const tenantId = 'tenant-123';
      const exportType = 'csv';
      const filters = { dateRange: '2024-01-01' };

      const mockJob = {
        id: 'job-123',
        tenantId,
        exportType,
        status: 'pending',
        createdAt: new Date(),
      };

      mockExportContainer.items.create.mockResolvedValue({
        resource: mockJob,
      });

      const result = await service.createExportJob(tenantId, exportType, filters);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending');
      expect(mockExportContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    it('should retrieve an import job successfully', async () => {
      const tenantId = 'tenant-123';
      const jobId = 'job-123';

      const mockJob = {
        id: jobId,
        tenantId,
        importType: 'csv',
        status: 'completed',
        recordsProcessed: 100,
        recordsImported: 95,
        errors: [],
      };

      mockImportContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: mockJob }),
      });

      const result = await service.getJobStatus(jobId, tenantId, 'import');

      expect(result).toEqual(mockJob);
      expect(mockImportContainer.item).toHaveBeenCalledWith(jobId, tenantId);
    });

    it('should retrieve an export job successfully', async () => {
      const tenantId = 'tenant-123';
      const jobId = 'job-123';

      const mockJob = {
        id: jobId,
        tenantId,
        exportType: 'csv',
        status: 'completed',
        fileUrl: 'https://example.com/export.csv',
      };

      mockExportContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: mockJob }),
      });

      const result = await service.getJobStatus(jobId, tenantId, 'export');

      expect(result).toEqual(mockJob);
      expect(mockExportContainer.item).toHaveBeenCalledWith(jobId, tenantId);
    });
  });
});
