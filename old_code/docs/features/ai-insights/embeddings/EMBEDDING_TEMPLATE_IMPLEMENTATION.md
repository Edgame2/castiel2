# Embedding Template System - Implementation Summary

**Date**: December 19, 2025  
**Status**: ✅ Core Implementation Complete

## What Was Implemented

### 1. **Embedding Template Types** (`embedding-template.types.ts`)
A comprehensive type system defining:
- **EmbeddingTemplate** - Main configuration interface
- **EmbeddingFieldConfig** - Field-level weighting and preprocessing
- **EmbeddingPreprocessingConfig** - Text preprocessing pipeline
- **EmbeddingNormalizationConfig** - Vector post-processing
- **EmbeddingModelConfig** - AI model selection strategy
- **EmbeddingResult** - Result structure after template application
- **DEFAULT_EMBEDDING_TEMPLATE** - System-wide fallback

**Key Features**:
- Field weighting (0.0-1.0) for priority-based inclusion
- Configurable chunking (character-based or sentence-aware)
- L2 normalization, min-max scaling, outlier removal
- Model strategy: 'default' | 'fast' | 'quality' | 'custom'
- Metadata tracking (version, creator, timestamps)

### 2. **EmbeddingTemplateService** (`embedding-template.service.ts`)
Core business logic implementing:

| Method | Purpose |
|---|---|
| `getTemplate()` | Retrieve template for shard type, fallback to default |
| `extractText()` | Extract relevant text from shard using field config |
| `preprocessText()` | Apply chunking and text normalization |
| `normalizeVector()` | L2 normalize embedding vectors |
| `normalizeEmbedding()` | Apply full normalization config |
| `createEmbeddingResult()` | Build result metadata |
| `validateTemplate()` | Verify template configuration |
| `getModelId()` | Determine effective model based on strategy |

**Text Extraction Flow**:
1. Iterate through template fields in priority order
2. Extract field values from shard.structuredData
3. Apply field-specific preprocessing (truncate, lowercase, strip formatting)
4. Combine fields with separator
5. Respect maximum text length

**Preprocessing Pipeline**:
1. Normalize whitespace
2. Optionally chunk text (sentence-aware or character-based)
3. Remove overlapping sections
4. Return both combined text and chunks

### 3. **ShardType Type Updates**
Enhanced ShardType interface with embedding support:

```typescript
interface ShardType {
  // ... existing fields ...
  
  // NEW: Embedding configuration for vector search
  embeddingTemplate?: EmbeddingTemplate;
}
```

Updated input types:
- `CreateShardTypeInput` - Include embeddingTemplate
- `UpdateShardTypeInput` - Include embeddingTemplate

### 4. **ShardType Repository Methods**
Added embedding template management:

| Method | Purpose |
|---|---|
| `updateEmbeddingTemplate()` | Update/set template for shard type |
| `getEmbeddingTemplate()` | Retrieve custom template (or null) |
| `listWithEmbeddingTemplates()` | Find all shard types with templates |

**Implementation Details**:
- Database operations use Cosmos DB item API
- Full monitoring/observability integration
- Exception handling with detailed logging
- Performance tracking

### 5. **Comprehensive Documentation**
Created detailed guide (`embeddings.md`) covering:
- System architecture and data flow
- Component overview with diagrams
- Field configuration and weighting strategies
- Preprocessing pipeline and techniques
- Normalization methods and recommendations
- Model selection strategies
- Default template specification
- Practical usage examples (Documents, Products)
- Code examples showing integration
- Storage format in Cosmos DB
- Best practices and recommendations
- Future enhancement roadmap

## Key Design Decisions

### 1. **Template Storage in ShardType**
- ✅ Embedded in ShardType document (not separate container)
- **Rationale**: Templates are type-specific, bundled storage is efficient
- **Benefit**: Single read gets both schema and embedding config

### 2. **Default Fallback System**
- ✅ Every shard type gets a template (system default if not custom)
- **Rationale**: Ensures consistent behavior for all types
- **Benefit**: No "undefined" templates, graceful degradation

### 3. **Field Weighting Approach**
- ✅ Numeric weights (0.0-1.0) indicating field priority
- **Rationale**: Simple, intuitive, language-agnostic
- **Benefit**: Can drive text ordering and selection logic

### 4. **Preprocessing Configuration**
- ✅ Flexible, composable preprocessing steps
- **Chunking Options**: Both sentence-based (semantic) and character-based
- **Overlap Support**: Configurable overlap between chunks
- **Rationale**: Different content types need different preprocessing

### 5. **Normalization Strategy**
- ✅ L2 normalization by default (cosine similarity)
- ✅ Optional outlier removal and min-max scaling
- **Rationale**: Standard for semantic search, improves quality

### 6. **Model Selection Strategy**
- ✅ Strategy-based selection ('default', 'fast', 'quality', 'custom')
- **Recommended**: 'default' (text-embedding-3-small) for cost-efficiency
- **Alternative**: 'quality' (text-embedding-3-large) for high-precision needs
- **Benefit**: Easy to change models without code changes

## Architecture Pattern

```
┌─────────────────────────────────────┐
│ ShardType                           │
│ ├─ id, schema, ...                 │
│ └─ embeddingTemplate?              │  ◄─── NEW
│    ├─ fields[]                      │
│    ├─ preprocessing{}               │
│    ├─ normalization{}               │
│    └─ modelConfig{}                 │
└─────────────────────────────────────┘
          │
          │ Used by
          ▼
┌─────────────────────────────────────┐
│ EmbeddingTemplateService            │
│ ├─ getTemplate()                    │
│ ├─ extractText()                    │
│ ├─ preprocessText()                 │
│ ├─ normalizeEmbedding()             │
│ └─ ...                              │
└─────────────────────────────────────┘
          │
          │ Guides
          ▼
┌─────────────────────────────────────┐
│ Embedding Generation                │
│ (OpenAI / Azure / Other)            │
│                                     │
│ Input: Preprocessed text from       │
│        template.extractText()       │
│                                     │
│ Output: Embedding vector            │
└─────────────────────────────────────┘
          │
          │ Post-processed by
          ▼
┌─────────────────────────────────────┐
│ Vector Storage                      │
│ Shard.vectors[] (Cosmos DB)         │
│ {                                   │
│   id: UUID,                         │
│   field: "combined",                │
│   model: "text-embedding-3-small",  │
│   dimensions: 1536,                 │
│   embedding: [...],                 │
│   createdAt: timestamp              │
│ }                                   │
└─────────────────────────────────────┘
```

## Integration Points

### Ready to Integrate:
1. **Embedding Generation Services** (`apps/api/src/services/azure-openai.service.ts`, etc.)
   - Consume `EmbeddingTemplateService` 
   - Use template to guide text extraction and preprocessing
   - Apply normalization to generated embeddings

2. **Shard Repository** (`shard.repository.ts`)
   - Call embedding pipeline during shard creation/update
   - Store embeddings in `shard.vectors[]`

3. **Vector Search** (Cosmos DB or AI Search)
   - Use stored embeddings for similarity search
   - Filter by `enableVectorSearch` flag in template

### NOT YET INTEGRATED (For Next Phase):
- [ ] Update embedding generation to use templates
- [ ] Integrate template service into shard pipeline
- [ ] Add template validation in API endpoints
- [ ] Create seeding script for default templates

## File Locations

| File | Purpose |
|---|---|
| `apps/api/src/types/embedding-template.types.ts` | Type definitions |
| `apps/api/src/services/embedding-template.service.ts` | Business logic |
| `apps/api/src/repositories/shard-type.repository.ts` | Database operations (added methods) |
| `apps/api/src/types/shard-type.types.ts` | ShardType interface (added field) |
| `docs/features/ai-insights/embeddings/embeddings.md` | Documentation |

## Testing Recommendations

### Unit Tests
```typescript
describe('EmbeddingTemplateService', () => {
  it('should extract text using field config and weights');
  it('should preprocess text with chunking');
  it('should normalize embeddings (L2)');
  it('should handle missing custom templates with default');
  it('should validate template configuration');
  it('should determine model based on strategy');
});
```

### Integration Tests
```typescript
describe('Embedding Template Integration', () => {
  it('should create shard type with custom template');
  it('should retrieve template from shard type');
  it('should update template for shard type');
  it('should list shard types with templates');
  it('should apply template to shard data');
});
```

### E2E Tests
```typescript
describe('Embedding Pipeline', () => {
  it('should generate embeddings using template');
  it('should store embeddings in shard vectors');
  it('should use stored embeddings for vector search');
});
```

## Configuration Examples

### Document Shard Type
```typescript
{
  fields: [
    { name: 'title', weight: 1.0 },
    { name: 'content', weight: 0.8 },
    { name: 'tags', weight: 0.5 }
  ],
  preprocessing: {
    combineFields: true,
    chunking: { chunkSize: 512, splitBySentence: true }
  },
  modelConfig: { strategy: 'default' }
}
```

### Product Shard Type
```typescript
{
  fields: [
    { name: 'name', weight: 1.0 },
    { name: 'description', weight: 0.9 },
    { name: 'category', weight: 0.5 }
  ],
  preprocessing: {
    combineFields: true,
    chunking: { chunkSize: 256 }
  },
  modelConfig: { strategy: 'quality' }
}
```

## Metrics & Monitoring

Recommended metrics to track:
- Template hit rate (custom vs default)
- Embedding generation latency per template
- Vector search precision by template
- Model usage by strategy
- Chunk distribution statistics
- Normalization impact on similarity scores

## Known Limitations & Future Work

### Phase 2 (Recommended):
- [ ] Integration with actual embedding generation
- [ ] Template management API endpoints
- [ ] Seeding/migration of existing embeddings to use templates
- [ ] A/B testing framework for template optimization

### Phase 3 (Enhancement):
- [ ] Multi-model simultaneous embedding
- [ ] Dynamic weight adjustment based on query type
- [ ] Template versioning and rollback
- [ ] Auto-tuning based on search quality metrics
- [ ] Field-level embedding generation

## Validation Checklist

- ✅ Type definitions complete and exported
- ✅ Service implementation with all methods
- ✅ Repository methods for template management
- ✅ ShardType interface updated
- ✅ Default template specified
- ✅ Comprehensive documentation
- ✅ Architecture diagrams and examples
- ❌ Integration with embedding generation (next phase)
- ❌ Unit tests (next phase)
- ❌ API endpoints (next phase)

---

## Next Steps

1. **Integration Phase**: Connect EmbeddingTemplateService to embedding generation pipeline
2. **Testing**: Write comprehensive unit and integration tests
3. **API Endpoints**: Add endpoints for template CRUD operations
4. **Seeding**: Create migration script to apply templates to existing shard types
5. **Monitoring**: Implement metrics collection and dashboards
6. **Documentation**: Add API reference docs for template endpoints
