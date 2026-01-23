/**
 * Context Assembly Service Tests
 * Tests for context assembly service including warnings, edge cases, and permission checks
 * 
 * Covers:
 * - Empty context warnings
 * - Truncation warnings
 * - Permission filtering warnings
 * - Low relevance warnings
 * - Permission checks for linked shards
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextAssemblyService } from '../../../src/services/ai-context-assembly.service.js';
import type { ContextAssemblyRequest } from '../../../src/types/ai-context.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosDBService } from '../../../src/services/cosmos-db.service.js';
import type { CacheService } from '../../../src/services/cache.service.js';
import type { VectorSearchService } from '../../../src/services/vector-search.service.js';
import type { ShardLinkingService } from '../../../src/services/shard-linking.service.js';
import type { ProjectActivityService } from '../../../src/services/project-activity.service.js';
import type { PerformanceMonitoringService } from '../../../src/services/performance-monitoring.service.js';
import type { ShardRepository } from '../../../src/repositories/shard.repository.js';
import { PermissionLevel } from '../../../src/types/shard.types.js';

// Mock dependencies
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockCosmosDB: CosmosDBService = {
  queryDocuments: vi.fn(),
  upsertDocument: vi.fn(),
  getDocument: vi.fn(),
  deleteDocument: vi.fn(),
} as any;

const mockCache: CacheService = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
} as any;

const mockVectorSearch: VectorSearchService = {
  search: vi.fn(),
} as any;

const mockShardLinking: ShardLinkingService = {
  getShardWithLinks: vi.fn(),
} as any;

const mockActivityService: ProjectActivityService = {
  getRecentActivities: vi.fn(),
} as any;

const mockPerformanceMonitoring: PerformanceMonitoringService = {
  recordMetric: vi.fn(),
} as any;

const mockShardRepository: ShardRepository = {
  findById: vi.fn(),
} as any;

const mockACLService = {
  checkPermission: vi.fn(),
} as any;

describe('ContextAssemblyService', () => {
  let service: ContextAssemblyService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ContextAssemblyService(
      mockCosmosDB,
      mockCache,
      mockVectorSearch,
      mockShardLinking,
      mockActivityService,
      mockPerformanceMonitoring,
      mockMonitoring
    );

    service.setShardRepository(mockShardRepository);
    service.setACLService(mockACLService);

    // Default mocks
    (mockCache.get as any).mockResolvedValue(null); // No cache hit
    (mockVectorSearch.search as any).mockResolvedValue({ results: [] });
    (mockShardLinking.getShardWithLinks as any).mockResolvedValue({
      shard: { id: 'shard-1', name: 'Test Shard' },
      incomingLinks: [],
      outgoingLinks: [],
    });
    (mockActivityService.getRecentActivities as any).mockResolvedValue([]);
    (mockCosmosDB.queryDocuments as any).mockResolvedValue([]);
    (mockCosmosDB.upsertDocument as any).mockResolvedValue(undefined);
  });

  describe('Empty Context Warnings', () => {
    it('should return warning when no context is found', async () => {
      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      const result = await service.assembleContext('tenant-1', request);

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      const emptyContextWarning = result.warnings?.find(w => w.type === 'empty_context');
      expect(emptyContextWarning).toBeDefined();
      expect(emptyContextWarning?.severity).toBe('warning');
      expect(emptyContextWarning?.message).toContain('No relevant context found');
      expect(emptyContextWarning?.details).toBeDefined();
      expect(emptyContextWarning?.suggestion).toBeDefined();

      // Should track event
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'context-assembly.empty-context',
        expect.objectContaining({
          tenantId: 'tenant-1',
          projectId: 'project-1',
        })
      );
    });

    it('should include diagnostics in empty context warning', async () => {
      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      const result = await service.assembleContext('tenant-1', request);

      const warning = result.warnings?.find(w => w.type === 'empty_context');
      expect(warning?.details).toBeDefined();
      expect(warning?.details).toHaveProperty('vectorSearchAvailable');
      expect(warning?.details).toHaveProperty('shardRepositoryAvailable');
      expect(warning?.details).toHaveProperty('projectId');
      expect(warning?.details).toHaveProperty('queryLength');
    });
  });

  describe('Permission Filtering Warnings', () => {
    it('should include warning when shards are filtered by permissions', async () => {
      // Mock vector search to return shards
      (mockVectorSearch.search as any).mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            score: 0.9,
            content: 'Test content 1',
            shard: { id: 'shard-1', name: 'Shard 1' },
          },
          {
            shardId: 'shard-2',
            score: 0.8,
            content: 'Test content 2',
            shard: { id: 'shard-2', name: 'Shard 2' },
          },
        ],
      });

      // Mock ACL service to deny access to one shard
      (mockACLService.checkPermission as any)
        .mockResolvedValueOnce({ hasAccess: true }) // shard-1 allowed
        .mockResolvedValueOnce({ hasAccess: false }); // shard-2 denied

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      const result = await service.assembleContext('tenant-1', request);

      // Should have permission filtering warning
      const warning = result.warnings?.find(w => w.type === 'permission_filtered');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('info');
      expect(warning?.message).toContain('excluded due to access permissions');
      expect(warning?.details).toHaveProperty('originalShardCount');
      expect(warning?.details).toHaveProperty('filteredOut');
      expect((warning?.details as any)?.filteredOut).toBe(1);

      // Should track event
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'context-assembly.acl-filtered',
        expect.objectContaining({
          originalCount: 2,
          filteredCount: 1,
          filteredOut: 1,
        })
      );
    });

    it('should check permissions for linked shards', async () => {
      // Mock vector search to return a shard
      (mockVectorSearch.search as any).mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            score: 0.9,
            content: 'Test content',
            shard: { id: 'shard-1', name: 'Shard 1' },
          },
        ],
      });

      // Mock ACL to allow the main shard
      (mockACLService.checkPermission as any).mockResolvedValue({ hasAccess: true });

      // Mock linked shards
      (mockShardLinking.getShardWithLinks as any).mockResolvedValue({
        shard: { id: 'shard-1', name: 'Shard 1' },
        incomingLinks: [
          {
            sourceShard: { id: 'linked-1', name: 'Linked Shard 1' },
            link: { id: 'link-1', description: 'Link description' },
          },
        ],
        outgoingLinks: [],
      });

      // Mock ACL to deny linked shard
      (mockACLService.checkPermission as any)
        .mockResolvedValueOnce({ hasAccess: true }) // Main shard
        .mockResolvedValueOnce({ hasAccess: false }); // Linked shard denied

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      const result = await service.assembleContext('tenant-1', request);

      // Should have checked permission for linked shard
      expect(mockACLService.checkPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          shardId: 'linked-1',
          tenantId: 'tenant-1',
          requiredPermission: PermissionLevel.READ,
        })
      );

      // Should track event for denied linked shard
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'context-assembly.linked-shard-acl-denied',
        expect.objectContaining({
          tenantId: 'tenant-1',
          shardId: 'linked-1',
        })
      );
    });
  });

  describe('Truncation Warnings', () => {
    it('should include warning when context is truncated due to token limits', async () => {
      // Mock many sources that exceed token limit
      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        shardId: `shard-${i}`,
        score: 0.9 - i * 0.01,
        content: 'A'.repeat(1000), // Large content to exceed token limit
        shard: { id: `shard-${i}`, name: `Shard ${i}` },
      }));

      (mockVectorSearch.search as any).mockResolvedValue({
        results: manyResults,
      });

      // Mock ACL to allow all
      (mockACLService.checkPermission as any).mockResolvedValue({ hasAccess: true });

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
        maxTokens: 1000, // Low token limit to force truncation
      };

      const result = await service.assembleContext('tenant-1', request);

      // Should have truncation warning
      const warning = result.warnings?.find(w => w.type === 'truncation');
      expect(warning).toBeDefined();
      expect(warning?.details).toHaveProperty('totalSources');
      expect(warning?.details).toHaveProperty('excludedSources');
      expect(warning?.details).toHaveProperty('excludedTokens');

      // Should track event
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'context-assembly.truncated',
        expect.objectContaining({
          totalSources: expect.any(Number),
          excludedSources: expect.any(Number),
        })
      );
    });

    it('should use warning severity for significant truncation (>50%)', async () => {
      // Mock many sources
      const manyResults = Array.from({ length: 10 }, (_, i) => ({
        shardId: `shard-${i}`,
        score: 0.9 - i * 0.01,
        content: 'A'.repeat(1000),
        shard: { id: `shard-${i}`, name: `Shard ${i}` },
      }));

      (mockVectorSearch.search as any).mockResolvedValue({
        results: manyResults,
      });

      (mockACLService.checkPermission as any).mockResolvedValue({ hasAccess: true });

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
        maxTokens: 500, // Very low limit to force >50% truncation
      };

      const result = await service.assembleContext('tenant-1', request);

      const warning = result.warnings?.find(w => w.type === 'truncation');
      if (warning && (warning.details as any)?.truncationPercentage > 50) {
        expect(warning.severity).toBe('warning');
      }
    });
  });

  describe('Low Relevance Warnings', () => {
    it('should include warning when context relevance is low', async () => {
      // Mock low relevance results
      (mockVectorSearch.search as any).mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            score: 0.2, // Low relevance
            content: 'Test content',
            shard: { id: 'shard-1', name: 'Shard 1' },
          },
        ],
      });

      (mockACLService.checkPermission as any).mockResolvedValue({ hasAccess: true });

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      const result = await service.assembleContext('tenant-1', request);

      // Should have low relevance warning if relevance score < 0.3
      const warning = result.warnings?.find(w => w.type === 'low_relevance');
      if (result.context.relevanceScore < 0.3) {
        expect(warning).toBeDefined();
        expect(warning?.severity).toBe('warning');
        expect(warning?.message).toContain('Context relevance is low');
        expect(warning?.details).toHaveProperty('relevanceScore');
      }
    });
  });

  describe('Permission Checks', () => {
    it('should check permissions before including shards in context', async () => {
      (mockVectorSearch.search as any).mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            score: 0.9,
            content: 'Test content',
            shard: { id: 'shard-1', name: 'Shard 1' },
          },
        ],
      });

      (mockACLService.checkPermission as any).mockResolvedValue({ hasAccess: true });

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      await service.assembleContext('tenant-1', request);

      // Should check permission
      expect(mockACLService.checkPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          shardId: 'shard-1',
          tenantId: 'tenant-1',
          requiredPermission: PermissionLevel.READ,
          checkInheritance: true,
        })
      );
    });

    it('should exclude shards without permission from context', async () => {
      (mockVectorSearch.search as any).mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            score: 0.9,
            content: 'Test content',
            shard: { id: 'shard-1', name: 'Shard 1' },
          },
        ],
      });

      // Deny access
      (mockACLService.checkPermission as any).mockResolvedValue({ hasAccess: false });

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      const result = await service.assembleContext('tenant-1', request);

      // Shard should not be in context sources
      const shardInContext = result.context.sources.find(s => s.sourceId === 'shard-1');
      expect(shardInContext).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle vector search failures gracefully', async () => {
      (mockVectorSearch.search as any).mockRejectedValue(new Error('Vector search failed'));

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      await expect(service.assembleContext('tenant-1', request)).rejects.toThrow();

      // Should track exception
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle ACL service failures gracefully', async () => {
      (mockVectorSearch.search as any).mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            score: 0.9,
            content: 'Test content',
            shard: { id: 'shard-1', name: 'Shard 1' },
          },
        ],
      });

      // ACL service throws error
      (mockACLService.checkPermission as any).mockRejectedValue(new Error('ACL service error'));

      const request: ContextAssemblyRequest = {
        projectId: 'project-1',
        userId: 'user-1',
        query: 'test query',
      };

      // Should still work (graceful degradation)
      const result = await service.assembleContext('tenant-1', request);

      // Should track exception
      expect(mockMonitoring.trackException).toHaveBeenCalled();

      // Should still return context (may include shard without permission check)
      expect(result.context).toBeDefined();
    });
  });
});
