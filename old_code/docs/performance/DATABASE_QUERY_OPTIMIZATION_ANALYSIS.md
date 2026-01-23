# Database Query Optimization Analysis

**Date:** 2025-01-XX  
**Status:** Analysis Complete - Ready for Implementation

---

## Executive Summary

This document analyzes database query patterns in the Castiel platform to identify optimization opportunities, including N+1 query issues, missing indexes, slow queries, and caching opportunities.

---

## 1. N+1 Query Pattern Analysis

### 1.1 Identified N+1 Patterns

#### ✅ **Already Optimized (Using Promise.all)**

1. **ComputedFieldService.computeRelatedField** (lines 228-232)
   - **Pattern:** Fetches multiple shards in parallel
   - **Status:** ✅ Optimized with `Promise.all`
   - **Location:** `apps/api/src/services/computed-field.service.ts`

2. **ConversationService.list** (lines 942-952)
   - **Pattern:** Fetches linked shard counts in parallel
   - **Status:** ✅ Optimized with `Promise.all`
   - **Location:** `apps/api/src/services/conversation.service.ts`

#### ⚠️ **Potential N+1 Issues**

1. **ComputedFieldService.computeRelatedField** (lines 199-232)
   - **Issue:** Queries edges first, then fetches shards individually
   - **Current:** Uses `Promise.all` but could batch better
   - **Impact:** Medium - fetches up to 100 shards individually
   - **Recommendation:** Use batch read API if available
   - **Location:** `apps/api/src/services/computed-field.service.ts:199-232`

2. **ContextTemplateService.traverseRelationship** (lines 730-795)
   - **Issue:** Gets related shards, then processes in loop
   - **Status:** Uses `getRelatedShards` which may batch internally
   - **Impact:** Low - depends on relationship service implementation
   - **Location:** `apps/api/src/services/context-template.service.ts:730-795`

### 1.2 Recommendations

1. **Implement Batch Read Operations**
   - Add `findByIds` method to `ShardRepository` for batch fetching
   - Use Cosmos DB batch API where possible
   - Reduce individual `findById` calls

2. **Add DataLoader Pattern**
   - Implement DataLoader for shard fetching
   - Batch and deduplicate requests within a single request cycle
   - Particularly useful for GraphQL queries

---

## 2. Missing Index Analysis

### 2.1 Common Query Patterns

Based on codebase analysis, the following query patterns are frequently used:

1. **Shard Queries:**
   - `tenantId` (partition key) ✅
   - `shardTypeId` (filter)
   - `status` (filter)
   - `createdAt` / `updatedAt` (ordering)
   - `structuredData.*` (filtering)
   - `metadata.category` (filtering)
   - `metadata.tags` (array contains)

2. **Shard Edge Queries:**
   - `tenantId` (partition key) ✅
   - `sourceShardId` (filter)
   - `targetShardId` (filter)
   - `relationshipType` (filter)

3. **Vector Search:**
   - `tenantId` (partition key) ✅
   - `status = 'active'` (filter)
   - `IS_DEFINED(vectors)` (filter)
   - `VectorDistance` (ordering)

### 2.2 Recommended Composite Indexes

#### Shard Container

```json
{
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/shardTypeId", "order": "ascending" },
      { "path": "/status", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/status", "order": "ascending" },
      { "path": "/updatedAt", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/metadata/category", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ]
  ]
}
```

#### Shard Edge Container

```json
{
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/sourceShardId", "order": "ascending" },
      { "path": "/relationshipType", "order": "ascending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/targetShardId", "order": "ascending" },
      { "path": "/relationshipType", "order": "ascending" }
    ]
  ]
}
```

### 2.3 Indexing Policy Configuration

**Current Status:** Need to verify Cosmos DB indexing policies in Terraform

**Action Items:**
1. Review `infrastructure/terraform/cosmos-db.tf` for indexing policies
2. Add composite indexes for common query patterns
3. Ensure range indexes on frequently filtered/ordered fields

---

## 3. Slow Query Analysis

### 3.1 Identified Slow Query Patterns

1. **ShardRepository.list** (lines 863-1107)
   - **Complexity:** High - dynamic query building with multiple filters
   - **Potential Issues:**
     - Complex `structuredData.*` filtering
     - Multiple OR conditions
     - Large result sets without proper pagination
   - **Optimization Opportunities:**
     - Add composite indexes
     - Optimize filter order (most selective first)
     - Add query result caching for common filters

2. **VectorSearchService.performCosmosVectorSearch** (lines 752-878)
   - **Complexity:** High - vector similarity search
   - **Potential Issues:**
     - Vector distance calculation is expensive
     - Multiple filters applied after vector search
   - **Optimization Opportunities:**
     - Filter by partition key first (already done ✅)
     - Use vector index if available
     - Cache results (already implemented ✅)

3. **AdvancedSearchService.search** (lines 60-137)
   - **Complexity:** Medium - complex query building
   - **Potential Issues:**
     - Facet calculation requires additional queries
     - Total count requires separate query
   - **Optimization Opportunities:**
     - Cache facet results
     - Use approximate count for large datasets
     - Batch facet queries

### 3.2 Query Optimization Recommendations

1. **Filter Order Optimization**
   - Apply most selective filters first
   - Use partition key (tenantId) first (already done ✅)
   - Then apply indexed fields (shardTypeId, status)
   - Finally apply unindexed filters (structuredData.*)

2. **Pagination Optimization**
   - Always use `TOP` or `LIMIT` in queries
   - Use continuation tokens for large result sets
   - Avoid `COUNT` queries when not needed

3. **Query Result Caching**
   - Cache list query results with short TTL (1-5 minutes)
   - Invalidate on shard updates
   - Use tenant-scoped cache keys

---

## 4. Caching Opportunities

### 4.1 Current Caching Status

✅ **Already Cached:**
- Shard structured data (15-30 min TTL)
- Vector search results (30 min TTL)
- ACL permissions (10 min TTL)
- User profiles (1 hour TTL)
- JWT validation (5 min TTL)

❌ **Not Cached (Opportunities):**
- Shard list query results
- Shard type definitions
- Shard edge queries
- Dashboard widget data (partially cached)
- Relationship queries

### 4.2 Recommended Caching Additions

1. **Shard List Query Results**
   - **TTL:** 1-5 minutes
   - **Key Pattern:** `tenant:{tenantId}:shard:list:{queryHash}`
   - **Invalidation:** On shard create/update/delete
   - **Impact:** High - frequently accessed, expensive queries

2. **Shard Type Definitions**
   - **TTL:** 1 hour (rarely changes)
   - **Key Pattern:** `tenant:{tenantId}:shard-type:{id}`
   - **Invalidation:** On shard type update
   - **Impact:** Medium - reduces DB queries

3. **Shard Edge Queries**
   - **TTL:** 5-10 minutes
   - **Key Pattern:** `tenant:{tenantId}:edge:{sourceId}:{relationshipType}`
   - **Invalidation:** On edge create/delete
   - **Impact:** Medium - reduces relationship queries

4. **Relationship Queries**
   - **TTL:** 5 minutes
   - **Key Pattern:** `tenant:{tenantId}:relationship:{shardId}:{direction}`
   - **Invalidation:** On edge changes
   - **Impact:** Medium - reduces N+1 queries

---

## 5. Implementation Plan

### Phase 1: Index Optimization (High Priority)
1. Review and update Cosmos DB indexing policies
2. Add composite indexes for common query patterns
3. Verify index usage in query plans

### Phase 2: N+1 Query Fixes (High Priority)
1. Implement `findByIds` batch method in `ShardRepository`
2. Update `ComputedFieldService` to use batch fetching
3. Add DataLoader pattern for GraphQL queries

### Phase 3: Query Result Caching (Medium Priority)
1. Add caching to `ShardRepository.list`
2. Add caching to shard type queries
3. Add caching to shard edge queries
4. Implement cache invalidation strategies

### Phase 4: Query Optimization (Medium Priority)
1. Optimize filter order in queries
2. Add query result size limits
3. Optimize facet calculations
4. Add query performance monitoring

---

## 6. Performance Metrics

### Target Improvements

- **Query Response Time:** Reduce p95 by 30-50%
- **Database RU Consumption:** Reduce by 20-40%
- **Cache Hit Rate:** Achieve >70% for cached queries
- **N+1 Query Incidents:** Eliminate all identified patterns

### Monitoring

- Track query execution times
- Monitor cache hit rates
- Track database RU consumption
- Alert on slow queries (>200ms p95)

---

## 7. Risk Assessment

### Low Risk
- Adding composite indexes (may increase write RU slightly)
- Adding query result caching (cache invalidation complexity)

### Medium Risk
- Batch read operations (need to handle partial failures)
- DataLoader implementation (complexity)

### Mitigation
- Test index changes in staging
- Monitor RU consumption after index changes
- Implement gradual rollout for caching
- Add comprehensive error handling for batch operations

---

## Next Steps

1. ✅ Complete analysis (this document)
2. ⏳ Review Cosmos DB indexing policies
3. ⏳ Implement batch read operations
4. ⏳ Add query result caching
5. ⏳ Optimize query patterns
6. ⏳ Monitor and validate improvements
