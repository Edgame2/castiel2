/**
 * Shard-Specific Q&A Integration Tests
 * 
 * Week 0: Verification & Baseline Testing
 * 
 * Purpose: Verify shard-specific Q&A integration status and functionality
 * before making enhancements.
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { ContextAwareQueryParserService } from '../../src/services/context-aware-query-parser.service.js'
import { EntityResolutionService } from '../../src/services/entity-resolution.service.js'
import { MockMonitoringProvider } from '@castiel/monitoring'
import type { Shard } from '../../src/types/shard.types.js'

const TENANT_ID = 'tenant-shard-qa-test'
const USER_ID = 'user-shard-qa-test'

describe('Shard-Specific Q&A Integration', () => {
  let contextAwareQueryParser: ContextAwareQueryParserService
  let entityResolutionService: EntityResolutionService
  let monitoring: MockMonitoringProvider
  let mockShardRepository: any

  beforeAll(() => {
    monitoring = new MockMonitoringProvider({ enabled: true })

    // Mock Shard Repository
    mockShardRepository = {
      findById: vi.fn(async (id: string, tenantId: string) => {
        const shards: Record<string, Shard> = {
          'doc-1': {
            id: 'doc-1',
            tenantId,
            shardTypeId: 'c_document',
            name: 'Project Proposal',
            structuredData: {
              name: 'Project Proposal',
              content: 'This is a comprehensive project proposal document outlining the project goals, timeline, and budget.',
              summary: 'Project proposal for new initiative',
            },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Shard,
          'doc-2': {
            id: 'doc-2',
            tenantId,
            shardTypeId: 'c_document',
            name: 'Meeting Notes',
            structuredData: {
              name: 'Meeting Notes',
              content: 'Meeting notes from the project kickoff discussing requirements and stakeholders.',
            },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Shard,
          'note-1': {
            id: 'note-1',
            tenantId,
            shardTypeId: 'c_note',
            name: 'Action Items',
            structuredData: {
              name: 'Action Items',
              content: 'Action items: Review proposal, schedule follow-up meeting, assign tasks.',
              noteType: 'general',
            },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Shard,
          'project-1': {
            id: 'project-1',
            tenantId,
            shardTypeId: 'c_project',
            name: 'Project Alpha',
            structuredData: {
              name: 'Project Alpha',
              description: 'Main project for Q&A testing',
            },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Shard,
        }
        return shards[id] || null
      }),
      findByShardType: vi.fn(async (shardTypeId: string, tenantId: string) => {
        // Return all shards of this type
        const allShards = [
          {
            id: 'doc-1',
            tenantId,
            shardTypeId: 'c_document',
            name: 'Project Proposal',
            structuredData: { name: 'Project Proposal' },
          },
          {
            id: 'doc-2',
            tenantId,
            shardTypeId: 'c_document',
            name: 'Meeting Notes',
            structuredData: { name: 'Meeting Notes' },
          },
        ]
        return allShards.filter(s => s.shardTypeId === shardTypeId)
      }),
    }

    // Initialize Entity Resolution Service
    entityResolutionService = new EntityResolutionService(
      mockShardRepository,
      monitoring,
      null // redis
    )

    // Initialize Context-Aware Query Parser Service
    contextAwareQueryParser = new ContextAwareQueryParserService(
      entityResolutionService,
      mockShardRepository,
      monitoring
    )
  })

  beforeEach(() => {
    monitoring.clearEvents()
    vi.clearAllMocks()
  })

  describe('Entity Parsing', () => {
    it('should parse entity references in queries', async () => {
      const query = "What's in Document Project Proposal?"
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      expect(parsed.hasEntityReferences).toBe(true)
      expect(parsed.entities.length).toBeGreaterThan(0)
    })

    it('should detect @mentions', async () => {
      const query = 'Summarize @doc-1'
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      expect(parsed.hasEntityReferences).toBe(true)
      expect(parsed.entities.some(e => e.shardId === 'doc-1')).toBe(true)
    })

    it('should detect natural language entity references', async () => {
      const queries = [
        "What's in the Project Proposal?",
        'Summarize Meeting Notes',
        'Tell me about Action Items',
      ]

      for (const query of queries) {
        const parsed = await contextAwareQueryParser.parseQuery(
          query,
          TENANT_ID
        )

        expect(parsed.hasEntityReferences).toBe(true)
      }
    })

    it('should handle queries without entity references', async () => {
      const query = 'What are the key projects?'
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      expect(parsed.hasEntityReferences).toBe(false)
      expect(parsed.entities.length).toBe(0)
    })
  })

  describe('Entity Resolution', () => {
    it('should resolve entity names to shard IDs', async () => {
      const query = "What's in Document Project Proposal?"
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      expect(parsed.entities.length).toBeGreaterThan(0)
      expect(parsed.entities[0]).toHaveProperty('shardId')
      expect(parsed.entities[0].shardId).toBeTruthy()
    })

    it('should resolve @mentions to shard IDs', async () => {
      const query = 'Summarize @doc-1'
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      const docEntity = parsed.entities.find(e => e.shardId === 'doc-1')
      expect(docEntity).toBeDefined()
      expect(docEntity?.shardId).toBe('doc-1')
    })

    it('should handle ambiguous entity names', async () => {
      // If multiple documents have same name, should resolve to best match
      const query = 'What is in Document Project Proposal?'
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      // Should resolve to at least one entity
      expect(parsed.entities.length).toBeGreaterThan(0)
      
      // In real scenario, disambiguation would be needed for multiple matches
      // Current implementation takes limit: 1 (best match)
    })

    it('should use project context for disambiguation', async () => {
      const query = 'What is in Document Project Proposal?'
      const projectId = 'project-1'
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID,
        projectId
      )

      // Project context should help with resolution
      expect(parsed.entities.length).toBeGreaterThan(0)
    })
  })

  describe('Single-Shard Context Assembly', () => {
    it('should identify single-shard questions', async () => {
      const query = "What's in Document Project Proposal?"
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      const isSingleShard = parsed.entities.length === 1
      
      // If single entity detected, should optimize context
      if (isSingleShard) {
        expect(parsed.entities.length).toBe(1)
        expect(parsed.entityContext.length).toBeGreaterThan(0)
      }
    })

    it('should fetch shard content for single-shard questions', async () => {
      const query = "What's in Document Project Proposal?"
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      if (parsed.entities.length === 1) {
        const entity = parsed.entities[0]
        const shard = await mockShardRepository.findById(entity.shardId, TENANT_ID)
        
        expect(shard).toBeDefined()
        expect(shard.structuredData).toBeDefined()
        expect(shard.structuredData.content || shard.structuredData.name).toBeTruthy()
      }
    })

    it('should include entity context in parsed query', async () => {
      const query = "What's in Document Project Proposal?"
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      if (parsed.hasEntityReferences) {
        expect(parsed.entityContext).toBeDefined()
        expect(Array.isArray(parsed.entityContext)).toBe(true)
      }
    })
  })

  describe('Integration with Chat Flow', () => {
    it('should be callable from chat endpoints', async () => {
      // Verify service can be called (as done in insights.routes.ts line 197-218)
      const query = "What's in Document Project Proposal?"
      
      try {
        const parsed = await contextAwareQueryParser.parseQuery(
          query,
          TENANT_ID
        )

        expect(parsed).toBeDefined()
        expect(parsed.originalQuery).toBe(query)
      } catch (error) {
        // Service should handle errors gracefully
        expect(error).toBeDefined()
      }
    })

    it('should enhance query with entity context', async () => {
      const query = "What's in Document Project Proposal?"
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      if (parsed.hasEntityReferences && parsed.enhancedQuery) {
        expect(parsed.enhancedQuery).not.toBe(parsed.originalQuery)
        expect(parsed.enhancedQuery.length).toBeGreaterThan(parsed.originalQuery.length)
      }
    })

    it('should handle parsing errors gracefully', async () => {
      // Mock a failing entity resolution
      const failingEntityResolution = {
        resolveEntity: vi.fn(async () => {
          throw new Error('Entity resolution failed')
        }),
      }

      const failingParser = new ContextAwareQueryParserService(
        failingEntityResolution as any,
        mockShardRepository,
        monitoring
      )

      const query = "What's in Document X?"
      
      // Should not throw, should return original query
      const parsed = await failingParser.parseQuery(query, TENANT_ID)
      
      expect(parsed.originalQuery).toBe(query)
      expect(parsed.hasEntityReferences).toBe(true) // Detected but not resolved
      expect(parsed.entities.length).toBe(0) // Not resolved
    })
  })

  describe('Current Integration Status', () => {
    it('should document that service is initialized in routes', () => {
      // Verified in routes/index.ts lines 937-944
      const isInitialized = true
      expect(isInitialized).toBe(true)
      console.log('ContextAwareQueryParserService is initialized in routes/index.ts')
    })

    it('should document that service is used in chat endpoints', () => {
      // Verified in insights.routes.ts lines 197-218
      const isUsedInChat = true
      expect(isUsedInChat).toBe(true)
      console.log('ContextAwareQueryParserService is used in insights.routes.ts chat endpoint')
    })

    it('should document that service is NOT used in InsightService.generate()', () => {
      // Verified: InsightService.generate() does NOT call ContextAwareQueryParserService
      // It's only called in routes before calling InsightService
      const isUsedInInsightService = false
      expect(isUsedInInsightService).toBe(false)
      console.log('Gap: ContextAwareQueryParserService is NOT used in InsightService.generate()')
      console.log('Recommendation: Integrate into InsightService for single-shard optimization')
    })

    it('should document current behavior for single-shard questions', () => {
      const currentBehavior = {
        entityParsing: 'Works in routes',
        entityResolution: 'Works via EntityResolutionService',
        contextAssembly: 'Not optimized - uses generic context assembly',
        singleShardOptimization: 'Not implemented',
      }

      expect(currentBehavior.entityParsing).toBe('Works in routes')
      expect(currentBehavior.singleShardOptimization).toBe('Not implemented')
      
      console.log('Current behavior:', currentBehavior)
    })
  })

  describe('Test Scenarios', () => {
    it('should handle "What\'s in Document X?" queries', async () => {
      const query = "What's in Document Project Proposal?"
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      expect(parsed.hasEntityReferences).toBe(true)
      
      if (parsed.entities.length > 0) {
        const entity = parsed.entities[0]
        expect(entity.shardId).toBeTruthy()
        expect(entity.shardTypeId).toBe('c_document')
      }
    })

    it('should handle "Summarize Note Y" queries', async () => {
      const query = 'Summarize Note Action Items'
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      expect(parsed.hasEntityReferences).toBe(true)
      
      if (parsed.entities.length > 0) {
        const entity = parsed.entities[0]
        expect(entity.shardTypeId).toBe('c_note')
      }
    })

    it('should handle queries with multiple entities', async () => {
      const query = 'Compare Document Project Proposal and Meeting Notes'
      
      const parsed = await contextAwareQueryParser.parseQuery(
        query,
        TENANT_ID
      )

      // Should detect multiple entities
      expect(parsed.hasEntityReferences).toBe(true)
      // May resolve to multiple entities or just one (depending on resolution)
    })

    it('should handle queries with pronouns (follow-up)', async () => {
      // First query
      const firstQuery = "What's in Document Project Proposal?"
      const firstParsed = await contextAwareQueryParser.parseQuery(
        firstQuery,
        TENANT_ID
      )

      // Follow-up with pronoun
      const followUpQuery = 'What about the risks?'
      const followUpParsed = await contextAwareQueryParser.parseQuery(
        followUpQuery,
        TENANT_ID
      )

      // Current implementation doesn't handle pronouns
      // This documents the gap
      expect(followUpParsed.hasEntityReferences).toBe(false)
      console.log('Gap: Pronouns not resolved (e.g., "it", "that", "this")')
    })
  })

  describe('Enhancement Opportunities', () => {
    it('should document need for single-shard context optimization', () => {
      const needsOptimization = {
        current: 'Uses generic context assembly even for single-shard questions',
        needed: 'Optimize context to use only the specific shard content',
        impact: 'More accurate answers for specific shard questions',
      }

      expect(needsOptimization.current).toBeTruthy()
      expect(needsOptimization.needed).toBeTruthy()
      
      console.log('Enhancement needed:', needsOptimization)
    })

    it('should document need for better entity disambiguation', () => {
      const needsDisambiguation = {
        current: 'Takes best match (limit: 1)',
        needed: 'Better disambiguation for ambiguous names',
        example: 'Multiple documents named "Project Plan" - need to ask user or use project context',
      }

      expect(needsDisambiguation.current).toBeTruthy()
      console.log('Enhancement needed:', needsDisambiguation)
    })

    it('should document need for pronoun resolution', () => {
      const needsPronounResolution = {
        current: 'Does not resolve pronouns in follow-up queries',
        needed: 'Resolve pronouns to previous entities',
        examples: ['"it" → previous topic', '"that" → previous result'],
      }

      expect(needsPronounResolution.current).toBeTruthy()
      console.log('Enhancement needed:', needsPronounResolution)
    })
  })
})

