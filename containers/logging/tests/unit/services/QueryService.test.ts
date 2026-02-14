/**
 * QueryService Unit Tests
 * Per ModuleImplementationGuide Section 12: Testing Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryService, QueryContext } from '../../../src/services/QueryService';
import { IStorageProvider } from '../../../src/services/providers/storage/IStorageProvider';
import { LogSearchParams, LogCategory, LogSeverity } from '../../../src/types';

describe('QueryService', () => {
  let queryService: QueryService;
  let mockStorage: IStorageProvider;
  
  const defaultContext: QueryContext = {
    userId: 'user-1',
    tenantId: 'org-1',
    canAccessCrossTenant: false,
    ownActivityOnly: false,
  };
  
  const superAdminContext: QueryContext = {
    userId: 'admin-1',
    tenantId: 'org-1',
    canAccessCrossTenant: true,
    ownActivityOnly: false,
  };

  beforeEach(() => {
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

    queryService = new QueryService(mockStorage);
  });

  describe('search', () => {
    it('should perform a search query with tenant isolation', async () => {
      const params: LogSearchParams = {
        query: 'login',
        limit: 50,
        offset: 0,
      };

      const mockResults = {
        items: [],
        total: 0,
        hasMore: false,
      };

      vi.mocked(mockStorage.search).mockResolvedValue(mockResults);

      const result = await queryService.search(params, defaultContext);

      expect(result).toBeDefined();
      expect(mockStorage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'org-1',
        })
      );
    });

    it('should apply filters correctly', async () => {
      const params: LogSearchParams = {
        category: LogCategory.SECURITY,
        severity: LogSeverity.WARN,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const mockResults = {
        items: [],
        total: 0,
        hasMore: false,
      };

      vi.mocked(mockStorage.search).mockResolvedValue(mockResults);

      await queryService.search(params, defaultContext);

      expect(mockStorage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'org-1',
          category: LogCategory.SECURITY,
          severity: LogSeverity.WARN,
        })
      );
    });
    
    it('should allow cross-tenant access for super admin', async () => {
      const params: LogSearchParams = {
        query: 'login',
        tenantId: 'other-org',
      };

      const mockResults = {
        items: [],
        total: 0,
        hasMore: false,
      };

      vi.mocked(mockStorage.search).mockResolvedValue(mockResults);

      await queryService.search(params, superAdminContext);

      expect(mockStorage.search).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'other-org',
        })
      );
    });
  });

  describe('aggregate', () => {
    it('should aggregate logs by field with tenant isolation', async () => {
      const params = {
        field: 'category' as const,
      };

      const mockResults = {
        field: 'category',
        buckets: [
          { key: 'SECURITY', count: 10 },
          { key: 'ACTION', count: 5 },
        ],
      };

      vi.mocked(mockStorage.aggregate).mockResolvedValue(mockResults);

      const result = await queryService.aggregate(params, defaultContext);

      expect(result).toBeDefined();
      expect(result.buckets).toHaveLength(2);
      expect(mockStorage.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'org-1',
        })
      );
    });

    it('should limit aggregation results', async () => {
      const params = {
        field: 'severity' as const,
        limit: 5,
      };

      const mockResults = {
        field: 'severity',
        buckets: [],
      };

      vi.mocked(mockStorage.aggregate).mockResolvedValue(mockResults);

      await queryService.aggregate(params, defaultContext);

      expect(mockStorage.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('count', () => {
    it('should count logs with tenant isolation', async () => {
      vi.mocked(mockStorage.count).mockResolvedValue(100);

      const result = await queryService.count({}, defaultContext);

      expect(result).toBe(100);
      expect(mockStorage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'org-1',
        })
      );
    });
  });

  describe('getById', () => {
    it('should get a log by ID with access control', async () => {
      const mockLog = {
        id: 'log-1',
        tenantId: 'org-1',
        action: 'user.login',
      };

      vi.mocked(mockStorage.getById).mockResolvedValue(mockLog as any);

      const result = await queryService.getById('log-1', defaultContext);

      expect(result).toBeDefined();
      expect(result?.id).toBe('log-1');
    });

    it('should return null for log from different tenant', async () => {
      const mockLog = {
        id: 'log-1',
        tenantId: 'other-org',
        action: 'user.login',
      };

      vi.mocked(mockStorage.getById).mockResolvedValue(mockLog as any);

      const result = await queryService.getById('log-1', defaultContext);

      expect(result).toBeNull();
    });

    it('should allow super admin to access any log', async () => {
      const mockLog = {
        id: 'log-1',
        tenantId: 'other-org',
        action: 'user.login',
      };

      vi.mocked(mockStorage.getById).mockResolvedValue(mockLog as any);

      const result = await queryService.getById('log-1', superAdminContext);

      expect(result).toBeDefined();
      expect(result?.id).toBe('log-1');
    });
  });
});
