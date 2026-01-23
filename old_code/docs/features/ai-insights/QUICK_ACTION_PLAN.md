# AI Insights System - Quick Action Plan

**Date**: December 19, 2025  
**Priority**: 🔴 CRITICAL  
**Time to MVP**: 1-2 weeks  

---

## TL;DR - What's Wrong and How to Fix It

### 🔴 The Problem
You built an **excellent embedding template system** but it's not connected to anything. Shards aren't getting embeddings, so vector search returns no results, and insights miss important context.

### ✅ The Solution
Connect 3 services together in this order:

```
EmbeddingTemplateService → EmbeddingService → ShardRepository
         ↓
   Extract & Preprocess → Generate Vectors → Store in Shard
```

---

## Week 1: Connect the Embedding Pipeline

### Day 1-2: Create ShardEmbeddingService 

**File**: `/apps/api/src/services/shard-embedding.service.ts`

**What it does**:
1. Takes a Shard
2. Gets its ShardType's template
3. Extracts weighted text using `EmbeddingTemplateService.extractText()`
4. Preprocesses using `EmbeddingTemplateService.preprocessText()`
5. Generates embeddings using `EmbeddingService.embed()`
6. Normalizes using `EmbeddingTemplateService.normalizeEmbedding()`
7. Stores in `shard.vectors[]`

**Code skeleton** (see AI_INSIGHTS_SYSTEM_REVIEW.md, section 3.1)

**Test**:
```typescript
const shard = await shardRepository.create({ ... });
await shardEmbeddingService.generateEmbeddingsForShard(shard, tenantId);
const updated = await shardRepository.findById(shard.id);
expect(updated.vectors.length).toBeGreaterThan(0);
```

### Day 3-4: Add Change Feed Listener

**File**: `/apps/api/src/services/embedding-processor/change-feed.service.ts`

**What it does**:
- Listens to Cosmos DB change feed on shards container
- When shard created/updated → calls `ShardEmbeddingService.generateEmbeddingsForShard()`
- Skips if shard already has recent vectors

**Setup**:
```typescript
// In main app startup
const changeFeedService = new ShardEmbeddingChangeFeedService(
  shardsContainer,
  shardEmbeddingService,
  monitoring
);
await changeFeedService.start();
```

**Test**:
```typescript
// Create shard through API
const shard = await api.post('/api/v1/shards', { ... });

// Wait 2 seconds for change feed
await new Promise(r => setTimeout(r, 2000));

// Check it has vectors
const updated = await api.get(`/api/v1/shards/${shard.id}`);
expect(updated.vectors).toBeDefined();
```

### Day 5: Enhance Vector Search

**File**: `/apps/api/src/services/vector-search.service.ts`

**Modify**: `generateEmbedding()` method to use templates

**What it does**:
- When searching for specific shard type, use its template
- Preprocess query same way as shard text
- Results in aligned embeddings → better search results

**Test**:
```typescript
const results = await vectorSearchService.semanticSearch({
  query: 'risk analysis',
  filter: { shardTypeId: 'c_opportunity', tenantId }
}, userId);

expect(results.results.length).toBeGreaterThan(0);
expect(results.results[0].score).toBeGreaterThan(0.8);
```

---

## Week 2: Add RAG Retrieval

### Day 1-3: Implement RAG in Context Assembly

**File**: `/apps/api/src/services/ai/context-template.service.ts`

**Add method**:
```typescript
async performRAGRetrieval(
  query: string,
  intent: IntentAnalysisResult,
  tenantId: string
): Promise<RAGChunk[]>
```

**What it does**:
1. Uses `vectorSearchService.semanticSearch()` to find relevant chunks
2. Filters by entities from intent
3. Returns top 10 chunks with citations

**Modify**:
```typescript
async assembleContext(request, intent): Promise<AssembledContext> {
  // ... existing code ...
  
  // ADD THIS
  const ragChunks = await this.performRAGRetrieval(
    request.query,
    intent,
    request.tenantId
  );
  
  return {
    primaryShard,
    relatedShards,
    ragChunks, // NEW
    metadata: { ...existing, ragChunksIncluded: ragChunks.length }
  };
}
```

**Test**:
```typescript
// Create document with content
const doc = await shardRepository.create({
  shardTypeId: 'c_document',
  structuredData: {
    title: 'Risk Analysis Report',
    content: 'The project has significant budget risks...'
  }
});

// Wait for embedding
await wait(2000);

// Query for insights
const insight = await insightsService.generateInsight({
  query: 'What are the risks?',
  tenantId,
  scope: { type: 'tenant_wide' }
});

// Verify RAG chunks included
expect(insight.context.ragChunks).toBeDefined();
expect(insight.context.ragChunks.length).toBeGreaterThan(0);
expect(insight.response).toContain('budget risks');
```

### Day 4-5: Testing & Validation

**Integration tests**:
- Shard creation → embedding generation
- Query → RAG retrieval → relevant chunks
- Template update → re-embedding

**Performance tests**:
- 100 shards → all get embedded
- Search latency < 200ms
- Embedding generation < 5s per shard

---

## Week 3: UX Improvements

### ML Intent Classification
**File**: `/apps/api/src/services/ai/ml-intent-classifier.service.ts`  
**Effort**: 2 days  
**Impact**: More accurate intent detection

### Conversation Context
**File**: `/apps/api/src/services/intent-analyzer.service.ts`  
**Effort**: 1 day  
**Impact**: Better follow-up queries

### Source Freshness
**File**: Grounding service  
**Effort**: 1 day  
**Impact**: User trust

---

## Quick Validation Checklist

After Week 1:
- [ ] Create shard → has vectors within 5 seconds
- [ ] Vector search returns results
- [ ] Query embeddings use templates

After Week 2:
- [ ] Create document with content → searchable
- [ ] Insight query includes RAG chunks
- [ ] Citations reference document chunks

After Week 3:
- [ ] "What about risks?" follows up previous query
- [ ] Intent classification more accurate
- [ ] Citations show freshness indicators

---

## Files to Create (Total: 3)

1. `/apps/api/src/services/shard-embedding.service.ts` (~200 lines)
2. `/apps/api/src/services/embedding-processor/change-feed.service.ts` (~150 lines)
3. `/apps/api/src/services/ai/ml-intent-classifier.service.ts` (~100 lines) [optional]

## Files to Modify (Total: 2)

1. `/apps/api/src/services/vector-search.service.ts` (+50 lines)
2. `/apps/api/src/services/ai/context-template.service.ts` (+100 lines)

---

## Metrics to Track

**Embedding Coverage**:
```sql
SELECT 
  shardTypeId,
  COUNT(*) as total,
  COUNT(vectors) as with_vectors,
  (COUNT(vectors) * 100.0 / COUNT(*)) as coverage_pct
FROM shards
GROUP BY shardTypeId
```

**Search Quality**:
- Average search results returned
- Average relevance score
- Searches with 0 results (should be low)

**RAG Usage**:
- Insights with RAG chunks included
- Average RAG chunks per insight
- User feedback on relevance

---

## Common Issues & Solutions

### Issue: Embeddings not generating
**Check**:
- Change feed processor running?
- Azure OpenAI keys configured?
- Shard has text content?

**Debug**:
```bash
# Check change feed logs
docker logs api | grep "change-feed"

# Manually trigger
curl -X POST /api/v1/shards/{id}/generate-embedding
```

### Issue: Vector search returns nothing
**Check**:
- Shards have vectors? `shard.vectors.length > 0`
- Query embedding generated?
- Similarity threshold too high?

**Debug**:
```typescript
// Check vector count
const count = await container.items.query(
  'SELECT COUNT(1) FROM c WHERE c.tenantId = @tenantId AND ARRAY_LENGTH(c.vectors) > 0'
).fetchAll();
```

### Issue: RAG chunks not relevant
**Check**:
- Embeddings using same template?
- Preprocessing aligned?
- Similarity threshold too high?

**Debug**:
```typescript
// Check similarity scores
const results = await vectorSearch({ query, topK: 20 });
console.log(results.map(r => ({ id: r.shardId, score: r.score })));
```

---

## Success Criteria

**Minimum Viable** (End of Week 1):
- ✅ Shards automatically get embeddings
- ✅ Vector search returns results
- ✅ Template-based preprocessing works

**Feature Complete** (End of Week 2):
- ✅ RAG retrieval works
- ✅ Insights include document chunks
- ✅ Citations reference sources

**Production Ready** (End of Week 3):
- ✅ Intent classification accurate
- ✅ Follow-up queries work
- ✅ Performance optimized
- ✅ Monitoring dashboards
- ✅ Documentation updated

---

## Next Steps (Right Now)

1. **Read** the detailed review: `AI_INSIGHTS_SYSTEM_REVIEW.md`
2. **Create** ShardEmbeddingService (Day 1-2)
3. **Test** with a single shard manually
4. **Add** change feed listener (Day 3-4)
5. **Validate** automatic embedding works
6. **Move to** Week 2 (RAG implementation)

---

**Bottom Line**: You have all the pieces, they're just not connected. Follow this plan and you'll have a production-ready AI insights system in 2-3 weeks.

**Questions?** See the detailed review for code examples, architecture diagrams, and troubleshooting guides.
