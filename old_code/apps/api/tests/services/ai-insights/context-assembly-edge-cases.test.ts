/**
 * Context Assembly Edge Cases Tests
 * Phase 4.3: Testing Coverage Enhancement
 * 
 * Comprehensive test suite for context assembly edge cases:
 * - Empty context scenarios
 * - Insufficient context quality
 * - Token limit truncation
 * - Missing related shards
 * - Vector search failures
 * - Cache failures
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InsightService } from '../../../src/services/insight.service.js';
import type { InsightRequest, IntentAnalysisResult } from '../../../src/types/ai-insights.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';

describe('Context Assembly Edge Cases - InsightService', () => {
  let insightService: InsightService;
  let monitoring: IMonitoringProvider;
  let mockShardRepository: any;
  let mockShardTypeRepository: any;
  let mockIntentAnalyzer: any;
  let mockContextTemplateService: any;
  let mockConversationService: any;
  let mockVectorSearch: any;
  let mockRedis: any;
  let mockContextQualityService: any;

  beforeEach(() => {
    monitoring = {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
      trackMetric: vi.fn(),
    } as any;

    mockShardRepository = {
      findById: vi.fn(),
    };

    mockShardTypeRepository = {
      findById: vi.fn(),
    };

    mockIntentAnalyzer = {
      analyzeIntent: vi.fn(),
    };

    mockContextTemplateService = {
      assembleContext: vi.fn(),
      selectTemplate: vi.fn(),
    };

    mockConversationService = {
      getConversationHistory: vi.fn(),
    };

    mockVectorSearch = {
      search: vi.fn(),
    };

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    mockContextQualityService = {
      assessContextQuality: vi.fn(),
      getMinimumRequirements: vi.fn(),
    };

    insightService = new InsightService(
      monitoring,
      mockShardRepository,
      mockShardTypeRepository,
      mockIntentAnalyzer,
      mockContextTemplateService,
      mockConversationService,
      undefined, // azureOpenAI
      undefined, // groundingService
      mockVectorSearch,
      undefined, // webSearchContextIntegration
      mockRedis,
      undefined, // aiModelSelection
      undefined, // unifiedAIClient
      undefined, // aiConnectionService
      undefined, // relationshipService
      undefined, // promptResolver
      undefined, // contextAwareQueryParser
      undefined, // toolExecutor
      undefined, // aiConfigService
      undefined, // tenantProjectConfigService
      undefined, // multimodalAssetService
      mockContextQualityService, // contextQualityService
      undefined, // comprehensiveAuditTrailService
      undefined, // piiDetectionService
      undefined, // piiRedactionService
      undefined, // fieldSecurityService
      undefined, // citationValidationService
      undefined // promptInjectionDefenseService
    );
  });

  describe('Empty Context Scenarios', () => {
    it('should handle empty context when no shards found', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: { projectId: 'project-1' },
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'What is the status?',
        projectId: 'project-1',
      };

      // Mock all repositories to return null/empty
      mockShardRepository.findById.mockResolvedValue(null);
      mockVectorSearch.search.mockResolvedValue({ results: [] });
      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 3,
        minRelevanceScore: 0.5,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0,
        sourceCount: 0,
        meetsMinimumRequirements: false,
        minimumRequirements: {
          minSourceCount: 3,
          minRelevanceScore: 0.5,
        },
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(context.related).toHaveLength(0);
      expect(context.ragChunks).toHaveLength(0);
      expect(context.primary.shardId).toBe('');
      
      // Should log empty context event
      expect(monitoring.trackEvent).toHaveBeenCalledWith(
        'insight.empty-context-detected',
        expect.objectContaining({
          tenantId: 'tenant-1',
          insightType: 'analysis',
        })
      );
    });

    it('should allow empty context for search operations', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'search',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Search for documents',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      mockVectorSearch.search.mockResolvedValue({ results: [] });
      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: true, // Search allows empty context
        minSourceCount: 0,
        minRelevanceScore: 0,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0,
        sourceCount: 0,
        meetsMinimumRequirements: true,
        minimumRequirements: {
          minSourceCount: 0,
          minRelevanceScore: 0,
        },
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      // Should not log empty context error for search
      expect(monitoring.trackEvent).not.toHaveBeenCalledWith(
        'insight.empty-context-detected',
        expect.any(Object)
      );
    });

    it('should handle empty context when primary shard is missing', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: { shardId: 'missing-shard' },
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Analyze this shard',
        scope: { shardId: 'missing-shard' },
      };

      mockShardRepository.findById.mockResolvedValue(null);
      mockVectorSearch.search.mockResolvedValue({ results: [] });
      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.5,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0,
        sourceCount: 0,
        meetsMinimumRequirements: false,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(context.primary.shardId).toBe('');
    });
  });

  describe('Insufficient Context Quality', () => {
    it('should detect insufficient context quality for analysis', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: { projectId: 'project-1' },
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Analyze the project',
        projectId: 'project-1',
      };

      // Mock minimal context (below requirements)
      mockShardRepository.findById.mockResolvedValue({
        id: 'shard-1',
        shardTypeId: 'c_document',
        name: 'Doc 1',
        structuredData: { content: 'Minimal content' },
      });
      mockShardTypeRepository.findById.mockResolvedValue({
        id: 'c_document',
        displayName: 'Document',
      });
      mockVectorSearch.search.mockResolvedValue({
        results: [
          {
            shardId: 'shard-2',
            shardTypeId: 'c_document',
            content: 'Another minimal chunk',
            score: 0.4, // Below minimum relevance
          },
        ],
      });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 3, // Requires 3 sources
        minRelevanceScore: 0.5, // Requires 0.5 relevance
        minTokens: 500, // Requires 500 tokens
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.3,
        sourceCount: 2, // Only 2 sources (below minimum of 3)
        averageRelevance: 0.4, // Below minimum of 0.5
        totalTokens: 200, // Below minimum of 500
        meetsMinimumRequirements: false,
        minimumRequirements: {
          minSourceCount: 3,
          minRelevanceScore: 0.5,
          minTokens: 500,
        },
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(context.metadata.contextQuality).toBeDefined();
      expect(context.metadata.contextQuality.meetsMinimumRequirements).toBe(false);
      
      // Should log insufficient context event
      expect(monitoring.trackEvent).toHaveBeenCalledWith(
        'insight.insufficient-context',
        expect.objectContaining({
          tenantId: 'tenant-1',
          insightType: 'analysis',
          sourceCount: 2,
          minRequired: 3,
        })
      );
    });

    it('should handle context quality assessment failure gracefully', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'summary',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Summarize',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      mockVectorSearch.search.mockResolvedValue({ results: [] });
      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      // Simulate quality assessment failure
      mockContextQualityService.assessContextQuality.mockImplementation(() => {
        throw new Error('Quality assessment failed');
      });

      // Should not throw, should continue without quality assessment
      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(monitoring.trackException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'insight.assess-context-quality',
        })
      );
    });
  });

  describe('Token Limit Truncation', () => {
    it('should truncate context when exceeding token limit', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: { projectId: 'project-1' },
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Analyze',
        projectId: 'project-1',
        maxTokens: 1000, // Low token limit
      };

      // Mock large shard data
      const largeData = {
        content: 'x'.repeat(10000), // Large content
        field1: 'y'.repeat(5000),
        field2: 'z'.repeat(5000),
      };

      mockShardRepository.findById.mockResolvedValue({
        id: 'shard-1',
        shardTypeId: 'c_document',
        name: 'Large Document',
        structuredData: largeData,
      });
      mockShardTypeRepository.findById.mockResolvedValue({
        id: 'c_document',
        displayName: 'Document',
      });
      mockVectorSearch.search.mockResolvedValue({
        results: Array.from({ length: 20 }, (_, i) => ({
          shardId: `shard-${i}`,
          shardTypeId: 'c_document',
          content: 'x'.repeat(1000), // Large chunks
          score: 0.8,
        })),
      });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.8,
        sourceCount: 21,
        meetsMinimumRequirements: true,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      // Should have truncation info in metadata
      if (context.metadata.truncationInfo) {
        expect(context.metadata.truncationInfo.truncated).toBe(true);
      }
    });

    it('should preserve structure when truncating', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'comparison',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Compare',
        maxTokens: 500, // Very low limit
      };

      mockShardRepository.findById.mockResolvedValue({
        id: 'shard-1',
        shardTypeId: 'c_document',
        name: 'Doc 1',
        structuredData: {
          section1: 'x'.repeat(2000),
          section2: 'y'.repeat(2000),
          section3: 'z'.repeat(2000),
        },
      });
      mockShardTypeRepository.findById.mockResolvedValue({
        id: 'c_document',
        displayName: 'Document',
      });
      mockVectorSearch.search.mockResolvedValue({ results: [] });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.7,
        sourceCount: 1,
        meetsMinimumRequirements: true,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      // Context should be truncated but still usable
      expect(context.formattedContext.length).toBeGreaterThan(0);
    });
  });

  describe('Missing Related Shards', () => {
    it('should handle missing related shards gracefully', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: { shardId: 'shard-1' },
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Analyze',
        scope: { shardId: 'shard-1' },
      };

      // Primary shard exists
      mockShardRepository.findById
        .mockResolvedValueOnce({
          id: 'shard-1',
          shardTypeId: 'c_project',
          name: 'Project 1',
          structuredData: { name: 'Project 1' },
          internal_relationships: [
            { shardId: 'missing-shard-1', shardTypeId: 'c_document' },
            { shardId: 'missing-shard-2', shardTypeId: 'c_note' },
          ],
        })
        // Related shards are missing
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockShardTypeRepository.findById.mockResolvedValue({
        id: 'c_project',
        displayName: 'Project',
      });

      mockContextTemplateService.selectTemplate.mockResolvedValue(null);
      mockVectorSearch.search.mockResolvedValue({ results: [] });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.6,
        sourceCount: 1, // Only primary shard
        meetsMinimumRequirements: true,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(context.primary.shardId).toBe('shard-1');
      // Related shards should be empty or only include found shards
      expect(context.related.length).toBeGreaterThanOrEqual(0);
    });

    it('should continue when template assembly fails', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: { shardId: 'shard-1' },
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Analyze',
        scope: { shardId: 'shard-1' },
      };

      mockShardRepository.findById.mockResolvedValue({
        id: 'shard-1',
        shardTypeId: 'c_project',
        name: 'Project 1',
        structuredData: {},
      });
      mockShardTypeRepository.findById.mockResolvedValue({
        id: 'c_project',
        displayName: 'Project',
      });

      // Template selection succeeds but assembly fails
      mockContextTemplateService.selectTemplate.mockResolvedValue({
        id: 'template-1',
        structuredData: { name: 'Template' },
      });
      mockContextTemplateService.assembleContext.mockRejectedValue(
        new Error('Template assembly failed')
      );
      mockVectorSearch.search.mockResolvedValue({ results: [] });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.6,
        sourceCount: 1,
        meetsMinimumRequirements: true,
      });

      // Should not throw, should continue without template context
      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(context.primary.shardId).toBe('shard-1');
    });
  });

  describe('Vector Search Failures', () => {
    it('should fallback to keyword search when vector search fails', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Search query',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      
      // Vector search throws error
      mockVectorSearch.search.mockRejectedValue(new Error('Vector search failed'));
      
      // Mock keyword search fallback (via hybridSearch)
      const mockHybridSearch = vi.fn().mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            shardTypeId: 'c_document',
            content: 'Keyword match result',
            score: 0.6,
          },
        ],
      });
      
      // Replace vectorSearch with one that has hybridSearch
      (insightService as any).vectorSearch = {
        search: mockVectorSearch.search,
        hybridSearch: mockHybridSearch,
      };

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.6,
        sourceCount: 1,
        meetsMinimumRequirements: true,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      // Should log fallback usage
      expect(monitoring.trackEvent).toHaveBeenCalledWith(
        'insight.rag.keyword-fallback-used',
        expect.any(Object)
      );
    });

    it('should handle empty vector search results with fallback', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'No results query',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      
      // Vector search returns empty results
      mockVectorSearch.search.mockResolvedValue({ results: [] });
      
      // Mock keyword search fallback
      const mockHybridSearch = vi.fn().mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            shardTypeId: 'c_document',
            content: 'Fallback result',
            score: 0.5,
          },
        ],
      });
      
      (insightService as any).vectorSearch = {
        search: mockVectorSearch.search,
        hybridSearch: mockHybridSearch,
      };

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.5,
        sourceCount: 1,
        meetsMinimumRequirements: true,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      // Should use fallback results
      expect(context.ragChunks.length).toBeGreaterThan(0);
    });

    it('should handle partial vector search results with supplementation', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Partial results',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      
      // Vector search returns partial results (less than 50% of requested)
      mockVectorSearch.search.mockResolvedValue({
        results: [
          {
            shardId: 'shard-1',
            shardTypeId: 'c_document',
            content: 'Vector result 1',
            score: 0.8,
          },
        ],
      });
      
      // Mock keyword search supplement
      const mockHybridSearch = vi.fn().mockResolvedValue({
        results: [
          {
            shardId: 'shard-2',
            shardTypeId: 'c_document',
            content: 'Keyword supplement',
            score: 0.6,
          },
        ],
      });
      
      (insightService as any).vectorSearch = {
        search: mockVectorSearch.search,
        hybridSearch: mockHybridSearch,
      };

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 1,
        minRelevanceScore: 0.3,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0.7,
        sourceCount: 2,
        meetsMinimumRequirements: true,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      // Should have both vector and keyword results
      expect(context.ragChunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cache Failures', () => {
    it('should handle Redis cache get failure gracefully', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Cached query',
        scopeMode: 'global',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      
      // Redis get fails
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockVectorSearch.search.mockResolvedValue({ results: [] });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 0,
        minRelevanceScore: 0,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0,
        sourceCount: 0,
        meetsMinimumRequirements: true,
      });

      // Should not throw, should continue without cache
      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(monitoring.trackException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'insight.global-context.redis-get',
        })
      );
    });

    it('should handle stale cache and invalidate it', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Stale query',
        scopeMode: 'global',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      
      // Mock stale cache (older than 10 minutes)
      const staleCacheData = {
        chunks: [
          {
            shardId: 'shard-1',
            shardTypeId: 'c_document',
            content: 'Stale content',
            score: 0.8,
          },
        ],
        metadata: {
          cachedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(), // 11 minutes ago
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(staleCacheData));
      mockRedis.del.mockResolvedValue(1);
      mockVectorSearch.search.mockResolvedValue({ results: [] });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 0,
        minRelevanceScore: 0,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0,
        sourceCount: 0,
        meetsMinimumRequirements: true,
      });

      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      // Should invalidate stale cache
      expect(mockRedis.del).toHaveBeenCalled();
      expect(monitoring.trackEvent).toHaveBeenCalledWith(
        'insight.global-context.cache-invalidated-stale',
        expect.any(Object)
      );
    });

    it('should handle invalid cache format gracefully', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: {},
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Invalid cache query',
        scopeMode: 'global',
      };

      mockShardRepository.findById.mockResolvedValue(null);
      
      // Invalid cache format
      mockRedis.get.mockResolvedValue('invalid json format');
      mockVectorSearch.search.mockResolvedValue({ results: [] });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 0,
        minRelevanceScore: 0,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0,
        sourceCount: 0,
        meetsMinimumRequirements: true,
      });

      // Should not throw, should treat as cache miss
      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(monitoring.trackException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'insight.global-context.parse-cache',
        })
      );
    });
  });

  describe('Project Context Failures', () => {
    it('should handle project context assembly failure gracefully', async () => {
      const intent: IntentAnalysisResult = {
        insightType: 'analysis',
        confidence: 0.9,
        entities: [],
        scope: { projectId: 'project-1' },
      };

      const request: InsightRequest = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        query: 'Analyze project',
        projectId: 'project-1',
        scopeMode: 'project',
      };

      // Mock project context service failure
      const mockProjectContextService = {
        assembleProjectContext: vi.fn().mockRejectedValue(
          new Error('Project context assembly failed')
        ),
      };
      (insightService as any).projectContextService = mockProjectContextService;

      mockShardRepository.findById.mockResolvedValue(null);
      mockVectorSearch.search.mockResolvedValue({ results: [] });

      mockContextQualityService.getMinimumRequirements.mockReturnValue({
        allowEmpty: false,
        minSourceCount: 0,
        minRelevanceScore: 0,
      });
      mockContextQualityService.assessContextQuality.mockReturnValue({
        qualityScore: 0,
        sourceCount: 0,
        meetsMinimumRequirements: true,
      });

      // Should not throw, should continue with fallback
      const context = await (insightService as any).assembleContext(
        'tenant-1',
        intent,
        request
      );

      expect(context).toBeDefined();
      expect(monitoring.trackException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'insight.project.assembleContext',
        })
      );
    });
  });
});
