import { vi } from 'vitest';
import { describe, it, expect, vi } from 'vitest';
import { InsightService } from '../../../src/services/insight.service.js'
import type { InsightRequest, IntentAnalysisResult } from '../../../src/types/ai-insights.types.js'

const tenantId = 'tenant-1'
const projectId = 'project-123'

const monitoring = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
}

const baseIntent: IntentAnalysisResult = {
  insightType: 'analysis',
  confidence: 0.92,
  entities: [],
  scope: { projectId },
  suggestedTemplateId: undefined,
  complexity: 'simple',
  estimatedTokens: 0,
}

const makeProjectShard = () => ({
  id: projectId,
  shardTypeId: 'c_project',
  name: 'Project Alpha',
  structuredData: { id: projectId },
  internal_relationships: [
    { shardId: 'doc-1', shardTypeId: 'c_document' },
    { shardId: 'note-1', shardTypeId: 'c_note' },
  ],
})

const makeShardRepository = () => ({
  findById: vi.fn(async (id: string) => {
    if (id === projectId) return makeProjectShard()
    if (id === 'doc-1') return { id, shardTypeId: 'c_document', name: 'Linked Doc', structuredData: { id } }
    if (id === 'note-1') return { id, shardTypeId: 'c_note', name: 'Linked Note', structuredData: { id } }
    return null
  }),
})

const makeShardTypeRepository = () => ({
  findById: vi.fn(async (id: string) => ({ id, displayName: id })),
})

const makeService = (deps: { vectorSearch: any }) => {
  return new InsightService(
    monitoring as any,
    deps.vectorSearch ? makeShardRepository() as any : makeShardRepository() as any,
    makeShardTypeRepository() as any,
    {} as any,
    {} as any,
    {} as any,
    { complete: vi.fn() } as any,
    undefined,
    deps.vectorSearch,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  )
}

describe('InsightService RAG integration', () => {
  it('filters project RAG results and keeps a single unlinked allowance', async () => {
    const vectorSearch = {
      search: vi.fn(async () => ({
        results: [
          { shardId: 'doc-1', shardTypeId: 'c_document', content: 'linked document content', score: 0.92 },
          { shardId: 'note-1', shardTypeId: 'c_note', content: 'linked note content', score: 0.88 },
          { shardId: 'unlinked-1', shardTypeId: 'c_document', content: 'unlinked high score', score: 0.9 },
          { shardId: 'unlinked-2', shardTypeId: 'c_document', content: 'unlinked medium score', score: 0.7 },
          { shardId: 'unlinked-3', shardTypeId: 'c_document', content: 'unlinked low score', score: 0.4 },
        ],
      })),
    }

    const service = makeService({ vectorSearch })

    const request: InsightRequest = {
      query: 'project risks',
      scopeMode: 'project',
      projectId,
      options: { maxTokens: 2000 },
    }

    const context = await (service as any).assembleContext(tenantId, baseIntent, request)

    expect(vectorSearch.search).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, query: request.query, topK: 10, minScore: 0.7 })
    )

    // RAG should keep linked shards and the top 20% unlinked (at least one), sorted by score
    expect(context.ragChunks.map((c: any) => c.shardId)).toEqual(['doc-1', 'unlinked-1', 'note-1'])

    // Project-linked shards should be prioritized in related context ordering
    expect(context.primary.shardId).toBe('doc-1')
    expect(context.related.map((c: any) => c.shardId)).toEqual(['note-1'])
  })

  it('applies token budget by trimming lowest-score RAG chunks before related context', async () => {
    const vectorSearch = {
      search: vi.fn(async () => ({
        results: [
          { shardId: 'doc-1', shardTypeId: 'c_document', content: 'rag-doc', score: 0.9 },
          { shardId: 'note-1', shardTypeId: 'c_note', content: 'rag-note', score: 0.8 },
          { shardId: 'unlinked-1', shardTypeId: 'c_document', content: 'rag-unlinked', score: 0.7 },
        ],
      })),
    }

    const service = makeService({ vectorSearch }) as any

    // Override token estimator for deterministic budget math
    service.estimateTokens = vi.fn((data: any) => {
      if (typeof data === 'string') {
        if (data.includes('rag-doc')) return 150
        if (data.includes('rag-note')) return 100
        if (data.includes('rag-unlinked')) return 90
      }
      if (data && data.id === 'doc-1') return 200
      if (data && data.id === 'note-1') return 120
      if (data && data.id === projectId) return 50
      return 10
    })

    const request: InsightRequest = {
      query: 'project risks',
      scopeMode: 'project',
      projectId,
      options: { maxTokens: 600 }, // → maxContextTokens = 500
    }

    const context = await service.assembleContext(tenantId, baseIntent, request)

    // Lowest-score RAG chunks should be dropped first to fit the budget (keep the highest-scoring linked chunk)
    expect(context.ragChunks.map((c: any) => c.shardId)).toEqual(['doc-1'])

    // Related project context remains after RAG trimming
    expect(context.related.map((c: any) => c.shardId)).toEqual(['note-1'])

    // Token estimator used for all pieces (primary, related, and RAG)
    expect(service.estimateTokens).toHaveBeenCalled()
  })
})
