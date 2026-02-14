/**
 * ExportService Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from '../../../src/services/ExportService';
import { IStorageProvider } from '../../../src/services/providers/storage/IStorageProvider';
import { LogCategory, LogSeverity } from '../../../src/types';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ExportService', () => {
  let exportService: ExportService;
  let mockCosmosExports: any;
  let mockStorage: IStorageProvider;

  beforeEach(() => {
    mockCosmosExports = {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    };

    mockStorage = {
      store: vi.fn(),
      storeBatch: vi.fn(),
      getById: vi.fn(),
      search: vi.fn(),
      getLastLog: vi.fn(),
      healthCheck: vi.fn(),
      getLogsInRange: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      getByIds: vi.fn(),
      deleteOlderThan: vi.fn(),
    } as any;

    exportService = new ExportService(mockStorage, mockCosmosExports);
  });

  describe('createExport', () => {
    it('should create an export job', async () => {
      const input = {
        format: 'CSV' as const,
        filters: {
          startDate: new Date('2025-01-01').toISOString(),
          endDate: new Date('2025-01-31').toISOString(),
        },
      };

      const mockExport = {
        id: 'export-1',
        tenantId: 'org-1',
        format: 'CSV',
        filters: input.filters,
        status: 'PENDING',
        progress: 0,
        requestedBy: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(mockCosmosExports.create).mockResolvedValue(mockExport);

      const result = await exportService.createExport('org-1', input, 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('export-1');
      expect(result.status).toBe('PENDING');
    });

    it('should create JSON export', async () => {
      const input = {
        format: 'JSON' as const,
      };

      const mockExport = {
        id: 'export-2',
        tenantId: 'org-1',
        format: 'JSON',
        filters: {},
        status: 'PENDING',
        progress: 0,
        requestedBy: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(mockCosmosExports.create).mockResolvedValue(mockExport);

      const result = await exportService.createExport('org-1', input, 'user-1');

      expect(result.format).toBe('JSON');
    });
  });

  describe('getExport', () => {
    it('should retrieve export by ID', async () => {
      const mockExport = {
        id: 'export-1',
        tenantId: 'org-1',
        format: 'CSV',
        filters: {},
        status: 'COMPLETED',
        progress: 100,
        fileUrl: '/exports/export-1.csv',
        requestedBy: 'user-1',
        createdAt: new Date(),
        completedAt: new Date(),
      };

      vi.mocked(mockCosmosExports.findUnique).mockResolvedValue(mockExport);

      const result = await exportService.getExport('export-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('export-1');
    });

    it('should return null if export not found', async () => {
      vi.mocked(mockCosmosExports.findUnique).mockResolvedValue(null);

      const result = await exportService.getExport('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listExports', () => {
    it('should list exports for tenant', async () => {
      const mockExports = [
        {
          id: 'export-1',
          tenantId: 'org-1',
          format: 'CSV',
          filters: {},
          status: 'COMPLETED',
          progress: 100,
          requestedBy: 'user-1',
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockCosmosExports.findMany).mockResolvedValue(mockExports);

      const result = await exportService.listExports('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('export-1');
    });
  });
});
