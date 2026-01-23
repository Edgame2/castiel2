# VectorizationService Usage Audit

**Date**: Week 0 Verification  
**Purpose**: Audit all usages of VectorizationService to plan migration to EmbeddingTemplateService

---

## Executive Summary

**VectorizationService** is a legacy service that does NOT use the `EmbeddingTemplateService`. It needs to be migrated to use the template system for consistency.

**Status**: ⚠️ **Legacy Service - Needs Migration**

---

## Files Using VectorizationService

### 1. Service Definition
**File**: `apps/api/src/services/vectorization.service.ts` (625 lines)

**Purpose**: Main vectorization service with queue-based processing

**Key Methods**:
- `vectorizeShard(request: VectorizeShardRequest)` - Vectorize single shard
- `batchVectorize(request: BatchVectorizeRequest)` - Batch vectorization
- `getJobStatus(jobId: string)` - Get job status
- `processJob(jobId: string)` - Process vectorization job

**Current Implementation**:
- Uses `extractTextFromShard()`, `chunkText()`, `prepareTextForEmbedding()` utilities
- Does NOT use `EmbeddingTemplateService`
- Does NOT use field weighting
- Does NOT use shard-type-specific preprocessing
- Uses hardcoded chunking strategies

**Migration Impact**: **HIGH** - Core service, needs complete refactor

---

### 2. API Routes
**File**: `apps/api/src/routes/vectorization.routes.ts` (388 lines)

**Endpoints**:
- `POST /vectorization/shards/:id` - Vectorize single shard
- `GET /vectorization/jobs/:jobId` - Get job status
- `GET /vectorization/shards/:id/status` - Get shard status
- `POST /vectorization/batch` - Batch vectorization

**Registration Status**: ⚠️ **NOT REGISTERED** in main routes file

**Findings**:
- Routes file exists but may not be registered
- Need to verify if these endpoints are accessible
- If not registered, may be safe to migrate without breaking changes

**Migration Impact**: **MEDIUM** - Need to verify if routes are used

---

### 3. Type Definitions
**File**: `apps/api/src/types/vectorization.types.ts`

**Purpose**: Type definitions for vectorization

**Usage**: Used by VectorizationService and routes

**Migration Impact**: **LOW** - Types can be kept for backward compatibility

---

### 4. Text Processing Utilities
**File**: `apps/api/src/utils/text-processing.utils.ts`

**Functions Used by VectorizationService**:
- `extractTextFromShard(shard: Shard)` - Extract text from shard
- `chunkText(text: string, config: ChunkingConfig)` - Chunk text
- `combineChunks(chunks: string[])` - Combine chunks
- `prepareTextForEmbedding(text: string)` - Prepare text
- `calculateChunkingStats(chunks: string[])` - Calculate stats

**Migration Impact**: **MEDIUM** - These utilities may still be useful, but should use template preprocessing

---

### 5. Other References

**Files that reference VectorizationService**:
- `apps/api/src/services/azure-openai.service.ts` - May use for embeddings
- `apps/api/src/services/enrichment.service.ts` - May use for enrichment
- `apps/api/src/plugins/swagger.ts` - Swagger documentation

**Migration Impact**: **LOW** - Likely just type references

---

## Current Implementation Analysis

### What VectorizationService Does

1. **Text Extraction**: Uses `extractTextFromShard()` utility
   - Extracts text from `structuredData` fields
   - No field weighting
   - No shard-type-specific extraction

2. **Text Preprocessing**: Uses `prepareTextForEmbedding()`
   - Basic normalization
   - No template-based preprocessing

3. **Chunking**: Uses `chunkText()` with configurable strategy
   - Fixed chunk size
   - No template-based chunking rules

4. **Embedding Generation**: Uses `AzureOpenAIService`
   - Direct API calls
   - No template model selection

5. **Storage**: Stores vectors in shard document
   - Updates `shard.vectors` array
   - No template-based vector metadata

### What's Missing (Compared to ShardEmbeddingService)

1. ❌ **No Template System Integration**
   - Doesn't use `EmbeddingTemplateService`
   - Doesn't get templates from `ShardType.embeddingTemplate`

2. ❌ **No Field Weighting**
   - All fields treated equally
   - No importance-based weighting

3. ❌ **No Shard-Type-Specific Processing**
   - Generic processing for all shard types
   - No type-specific rules

4. ❌ **No Template-Based Model Selection**
   - Uses hardcoded model
   - Doesn't respect template model settings

5. ❌ **No Template-Based Normalization**
   - Basic normalization only
   - Doesn't use template normalization rules

---

## Migration Strategy

### Option 1: Direct Replacement (Recommended)

**Approach**: Replace VectorizationService with ShardEmbeddingService

**Steps**:
1. Update routes to use `ShardEmbeddingService` instead
2. Map VectorizationService API to ShardEmbeddingService methods
3. Keep routes for backward compatibility
4. Deprecate VectorizationService

**Pros**:
- Uses existing, tested service
- Consistent with new embedding system
- Leverages template system

**Cons**:
- May break existing API contracts
- Need to handle job queue migration

### Option 2: Refactor VectorizationService

**Approach**: Update VectorizationService to use EmbeddingTemplateService internally

**Steps**:
1. Inject `EmbeddingTemplateService` into VectorizationService
2. Replace text extraction with template-based extraction
3. Replace preprocessing with template preprocessing
4. Use template model selection
5. Keep API contracts unchanged

**Pros**:
- Maintains backward compatibility
- No API changes needed

**Cons**:
- More work to refactor
- Maintains legacy service

### Option 3: Hybrid Approach (Recommended for Safety)

**Approach**: 
1. Keep VectorizationService for backward compatibility
2. Internally delegate to ShardEmbeddingService
3. Gradually migrate callers
4. Deprecate VectorizationService

**Steps**:
```typescript
// In VectorizationService.vectorizeShard()
async vectorizeShard(request: VectorizeShardRequest): Promise<VectorizationStatusResponse> {
  // Delegate to ShardEmbeddingService
  const shard = await this.getShard(request.shardId, request.tenantId);
  const result = await this.shardEmbeddingService.generateEmbeddingsForShard(
    shard,
    request.tenantId,
    { forceRegenerate: request.force }
  );
  
  // Map result to VectorizationStatusResponse format
  return this.mapToVectorizationResponse(result);
}
```

**Pros**:
- Backward compatible
- Uses new system internally
- Can migrate gradually

**Cons**:
- Temporary code duplication
- Need mapping layer

---

## Usage Analysis

### Direct Usage

1. **API Routes** (`vectorization.routes.ts`)
   - `POST /vectorization/shards/:id` - Single shard vectorization
   - `POST /vectorization/batch` - Batch vectorization
   - `GET /vectorization/jobs/:jobId` - Job status

### Indirect Usage

1. **Swagger Documentation** - Type references only
2. **AzureOpenAIService** - May use for embeddings (needs verification)
3. **EnrichmentService** - May use for enrichment (needs verification)

---

## Migration Plan

### Phase 1: Verification (Week 0)
- ✅ Audit all usages (this document)
- ⚠️ Verify if routes are registered and used
- ⚠️ Check if any external systems depend on VectorizationService API

### Phase 2: Preparation (Week 1)
- Create adapter/wrapper to map VectorizationService API to ShardEmbeddingService
- Add feature flag for gradual migration
- Write migration tests

### Phase 3: Migration (Week 1)
- Update VectorizationService to delegate to ShardEmbeddingService
- Keep API contracts unchanged
- Test backward compatibility

### Phase 4: Cleanup (Future)
- Deprecate VectorizationService
- Migrate all callers to ShardEmbeddingService
- Remove VectorizationService

---

## Risk Assessment

### High Risk
- **Breaking Changes**: If routes are actively used, migration could break integrations
- **Job Queue**: If jobs are in queue, need migration strategy

### Medium Risk
- **Performance**: New service may have different performance characteristics
- **Error Handling**: Different error formats

### Low Risk
- **Type References**: Easy to update
- **Documentation**: Easy to update

---

## Recommendations

1. **Verify Route Registration**: Check if `vectorizationRoutes` is registered in main routes
2. **Check Usage**: Search logs/monitoring for VectorizationService usage
3. **Use Hybrid Approach**: Delegate to ShardEmbeddingService for safety
4. **Add Feature Flag**: Allow gradual rollout
5. **Monitor**: Track usage during migration

---

## Files to Modify

### Critical
1. `apps/api/src/services/vectorization.service.ts` - Update to use templates
2. `apps/api/src/routes/vectorization.routes.ts` - Verify registration, update if needed

### Optional
3. `apps/api/src/types/vectorization.types.ts` - Keep for backward compatibility
4. `apps/api/src/utils/text-processing.utils.ts` - May need updates

---

## Success Criteria

- ✅ All vectorization uses template system
- ✅ Field weighting applied
- ✅ Shard-type-specific processing
- ✅ Backward compatibility maintained
- ✅ No breaking changes
- ✅ Performance maintained or improved

---

## Next Steps

1. Verify if vectorization routes are registered
2. Check monitoring/logs for VectorizationService usage
3. Decide on migration approach (recommend Hybrid)
4. Implement migration in Week 1

---## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Legacy** - VectorizationService is legacy and needs migration

#### Implemented Features (✅)

- ✅ VectorizationService exists
- ✅ Service functionality documented
- ✅ Migration plan documented

#### Known Limitations

- ⚠️ **Legacy Service** - VectorizationService does not use EmbeddingTemplateService
  - **Code Reference:**
    - `apps/api/src/services/vectorization.service.ts` - Legacy service
  - **Recommendation:**
    1. Migrate to EmbeddingTemplateService
    2. Use template system for consistency
    3. Remove legacy service after migration- ⚠️ **Route Registration** - Routes may not be registered
  - **Code Reference:**
    - `apps/api/src/routes/vectorization.routes.ts` - Routes may not be registered
  - **Recommendation:**
    1. Verify route registration
    2. Register routes if needed
    3. Document route status### Related Documentation- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Embedding Templates](../features/ai-insights/embeddings/README.md) - Embedding template system
- [Backend Documentation](../backend/README.md) - Backend implementation
