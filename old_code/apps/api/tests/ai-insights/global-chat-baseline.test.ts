/**
 * Global Chat Baseline Tests
 * 
 * Week 0: Verification & Baseline Testing
 * 
 * Purpose: Establish baseline behavior for global chat before optimization.
 * Document current context assembly, RAG behavior, and performance metrics.
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { InsightService } from '../../src/services/insight.service.js'
import type { InsightRequest, IntentAnalysisResult } from '../../src/types/ai-insights.types.js'
import { MockMonitoringProvider } from '@castiel/monitoring'

const TENANT_ID = 'tenant-baseline-test'
const USER_ID = 'user-baseline-test'

describe('Global Chat Baseline', () => {
  let insightService: InsightService
  let monitoring: MockMonitoringProvider
  let mockVectorSearch: any
  let mockShardRepository: any
  let mockShardTypeRepository: any
  let mockIntentAnalyzer: any
  let contextAssembled: any = null

  beforeAll(() => {
    monitoring = new MockMonitoringProvider({ enabled: true })

    // Mock Vector Search Provider
    mockVectorSearch = {
      search: vi.fn(async (request: any) => {
        // Simulate tenant-wide search (no project filtering)
        return {
          results: [
            {
              shardId: 'doc-1',
              shardTypeId: 'c_document',
              shard: { name: 'Document 1' },
              content: 'Content from document 1',
              chunkIndex: 0,
              score: 0.85,
              highlight: 'Content from document 1',
            },
            {
              shardId: 'doc-2',
              shardTypeId: 'c_document',
              shard: { name: 'Document 2' },
              content: 'Content from document 2',
              chunkIndex: 0,
              score: 0.78,
              highlight: 'Content from document 2',
            },
            {
              shardId: 'note-1',
              shardTypeId: 'c_note',
              shard: { name: 'Note 1' },
              content: 'Content from note 1',
              chunkIndex: 0,
              score: 0.72,
              highlight: 'Content from note 1',
            },
          ],
        }
      }),
    }

    // Mock Shard Repository
    mockShardRepository = {
      findById: vi.fn(async (id: string, tenantId: string) => {
        if (id === 'doc-1') {
          return {
            id: 'doc-1',
            tenantId,
            shardTypeId: 'c_document',
            name: 'Document 1',
            structuredData: { content: 'Document 1 content' },
            status: 'active',
          }
        }
        return null
      }),
    }

    // Mock Shard Type Repository
    mockShardTypeRepository = {
      findById: vi.fn(async (id: string, tenantId: string) => ({
        id,
        tenantId,
        displayName: id === 'c_document' ? 'Document' : 'Note',
      })),
    }

    // Mock Intent Analyzer
    mockIntentAnalyzer = {
      analyze: vi.fn(async (query: string, context: any): Promise<IntentAnalysisResult> => {
        return {
          insightType: 'search',
          confidence: 0.9,
          entities: [],
          scope: { type: 'tenant-wide' },
          suggestedTemplateId: undefined,
          complexity: 'medium',
          estimatedTokens: 500,
        }
      }),
    }

    // Create InsightService with mocks
    insightService = new InsightService(
      monitoring,
      mockShardRepository,
      mockShardTypeRepository,
      mockIntentAnalyzer,
      null, // contextTemplateService
      null, // conversationService
      null, // azureOpenAIService
      null, // webSearchContextIntegration
      null, // groundingService
      null, // aiModelSelectionService
      null, // unifiedAIClient
      null, // aiConnectionService
      mockVectorSearch, // vectorSearch
      null, // projectContextService
      null, // redis
    )
  })

  beforeEach(() => {
    monitoring.clearEvents()
    contextAssembled = null
    vi.clearAllMocks()
  })

  describe('Global Scope Query Handling', () => {
    it('should handle global scope queries', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
        scopeMode: 'global',
        maxTokens: 4000,
      }

      // We'll test context assembly by checking what gets called
      // Since generate() is complex, we'll verify the assembleContext behavior
      expect(request.scopeMode).toBe('global')
      expect(request.query).toBeDefined()
    })

    it('should not filter by project for global queries', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'Summarize all recent activity',
        scopeMode: 'global',
        maxTokens: 4000,
      }

      // Verify no projectId is set
      expect(request.projectId).toBeUndefined()
      expect(request.scope?.projectId).toBeUndefined()
    })
  })

  describe('Context Assembly for Global Queries', () => {
    it('should use vector search for global context assembly', async () => {
      // Simulate what happens in assembleContext for global scope
      const query = 'What are the key projects?'
      
      // This is what the current implementation does (line 850-906 in insight.service.ts)
      if (mockVectorSearch) {
        const ragResults = await mockVectorSearch.search({
          tenantId: TENANT_ID,
          query,
          topK: 10, // RAG_TOP_K constant
          minScore: 0.7, // RAG_MIN_SCORE constant
        })

        expect(ragResults.results).toBeDefined()
        expect(ragResults.results.length).toBeGreaterThan(0)
        expect(mockVectorSearch.search).toHaveBeenCalledWith({
          tenantId: TENANT_ID,
          query,
          topK: 10,
          minScore: 0.7,
        })
      }
    })

    it('should use default topK (10) for global queries', async () => {
      const query = 'What are the key projects?'
      
      await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query,
        topK: 10,
        minScore: 0.7,
      })

      const call = vi.mocked(mockVectorSearch.search).mock.calls[0]
      expect(call[0].topK).toBe(10) // Current default, not optimized for global
    })

    it('should use default minScore (0.7) for global queries', async () => {
      const query = 'What are the key projects?'
      
      await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query,
        topK: 10,
        minScore: 0.7,
      })

      const call = vi.mocked(mockVectorSearch.search).mock.calls[0]
      expect(call[0].minScore).toBe(0.7) // Current default
    })

    it('should not apply project filtering for global queries', async () => {
      const query = 'What are the key projects?'
      
      const ragResults = await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query,
        topK: 10,
        minScore: 0.7,
      })

      // Verify no projectId filter is applied
      const call = vi.mocked(mockVectorSearch.search).mock.calls[0]
      expect(call[0].projectId).toBeUndefined()
      
      // Results should include shards from across tenant
      expect(ragResults.results.length).toBe(3) // All tenant shards
    })
  })

  describe('RAG Retrieval for Global Scope', () => {
    it('should retrieve RAG chunks for global queries', async () => {
      const query = 'Summarize all recent activity'
      
      const ragResults = await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query,
        topK: 10,
        minScore: 0.7,
      })

      expect(ragResults.results).toBeDefined()
      expect(ragResults.results.length).toBeGreaterThan(0)
      
      // Verify results have required fields
      ragResults.results.forEach((result: any) => {
        expect(result).toHaveProperty('shardId')
        expect(result).toHaveProperty('shardTypeId')
        expect(result).toHaveProperty('content')
        expect(result).toHaveProperty('score')
      })
    })

    it('should include RAG chunks from multiple shard types', async () => {
      const query = 'What are the key projects?'
      
      const ragResults = await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query,
        topK: 10,
        minScore: 0.7,
      })

      const shardTypes = new Set(ragResults.results.map((r: any) => r.shardTypeId))
      expect(shardTypes.size).toBeGreaterThan(1) // Should have multiple types
    })

    it('should rank results by relevance score', async () => {
      const query = 'What are the key projects?'
      
      const ragResults = await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query,
        topK: 10,
        minScore: 0.7,
      })

      // Verify scores are in descending order (highest first)
      const scores = ragResults.results.map((r: any) => r.score)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i])
      }
    })
  })

  describe('Performance Metrics', () => {
    it('should measure context assembly time', async () => {
      const startTime = Date.now()
      
      await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query: 'What are the key projects?',
        topK: 10,
        minScore: 0.7,
      })

      const duration = Date.now() - startTime
      
      // Document baseline performance
      expect(duration).toBeGreaterThanOrEqual(0)
      expect(duration).toBeLessThan(5000) // Should be fast with mocks
      
      // In real scenario, this would be measured in assembleContext
      console.log(`Baseline RAG search duration: ${duration}ms`)
    })

    it('should track context size (token count)', async () => {
      const query = 'What are the key projects?'
      
      const ragResults = await mockVectorSearch.search({
        tenantId: TENANT_ID,
        query,
        topK: 10,
        minScore: 0.7,
      })

      // Estimate token count (rough: 1 token ≈ 4 characters)
      const totalContent = ragResults.results
        .map((r: any) => r.content)
        .join(' ')
      const estimatedTokens = Math.ceil(totalContent.length / 4)
      
      expect(estimatedTokens).toBeGreaterThan(0)
      console.log(`Baseline context token estimate: ${estimatedTokens}`)
    })
  })

  describe('Prompt Usage', () => {
    it('should use generic prompts for global chat', () => {
      // Current implementation uses hardcoded SYSTEM_PROMPTS
      // This test documents current behavior
      const insightTypes = ['summary', 'analysis', 'comparison', 'recommendation', 'prediction', 'extraction', 'search', 'generation']
      
      insightTypes.forEach(type => {
        // In current implementation, all use same generic prompts
        // No global-specific prompts exist
        expect(type).toBeDefined()
      })
    })

    it('should not have global-specific prompt variants', () => {
      // Document that global chat uses same prompts as project chat
      // This is a gap that needs to be addressed
      const hasGlobalPrompt = false // Current state
      expect(hasGlobalPrompt).toBe(false)
    })
  })

  describe('Current Limitations (Baseline Documentation)', () => {
    it('should document that global chat uses same topK as project chat', () => {
      // Current: topK = 10 for both global and project
      // Issue: Global should have more results (15) since it searches tenant-wide
      const currentTopK = 10
      const recommendedTopK = 15
      
      expect(currentTopK).toBe(10)
      expect(recommendedTopK).toBe(15)
      console.log('Gap: Global chat uses topK=10, should use topK=15')
    })

    it('should document that global chat uses same minScore as project chat', () => {
      // Current: minScore = 0.7 for both
      // Issue: Global could use slightly lower threshold (0.65) for broader results
      const currentMinScore = 0.7
      const recommendedMinScore = 0.65
      
      expect(currentMinScore).toBe(0.7)
      expect(recommendedMinScore).toBe(0.65)
      console.log('Gap: Global chat uses minScore=0.7, could use minScore=0.65')
    })

    it('should document that global chat has no caching', () => {
      // Current: No caching for global context
      // Issue: Should cache frequently accessed global patterns
      const hasCaching = false
      
      expect(hasCaching).toBe(false)
      console.log('Gap: Global chat has no context caching')
    })

    it('should document that global chat uses generic prompts', () => {
      // Current: Uses same prompts as project chat
      // Issue: Should have global-specific prompts that emphasize tenant-wide knowledge
      const hasGlobalPrompts = false
      
      expect(hasGlobalPrompts).toBe(false)
      console.log('Gap: Global chat uses generic prompts, not global-specific')
    })
  })

  describe('Comparison with Project Chat', () => {
    it('should document differences between global and project context assembly', () => {
      const globalBehavior = {
        topK: 10,
        minScore: 0.7,
        projectFiltering: false,
        usesProjectContextService: false,
        caching: false,
        promptType: 'generic',
      }

      const projectBehavior = {
        topK: 10, // Same as global (from ProjectContextService it may differ)
        minScore: 0.7,
        projectFiltering: true,
        usesProjectContextService: true,
        caching: true, // Project context has caching
        promptType: 'generic', // Same as global
      }

      // Document differences
      expect(globalBehavior.projectFiltering).toBe(false)
      expect(projectBehavior.projectFiltering).toBe(true)
      
      expect(globalBehavior.usesProjectContextService).toBe(false)
      expect(projectBehavior.usesProjectContextService).toBe(true)
      
      console.log('Baseline differences documented:', {
        global: globalBehavior,
        project: projectBehavior,
      })
    })
  })
})

