# Embedding Template System - README

## 🎯 What Is This?

The **Embedding Template System** is a sophisticated framework for generating high-quality semantic embeddings (vector representations) for your data in Castiel.

**In Plain English**: Define templates in your ShardType that tell the system how to convert your data into numbers that machines can compare for similarity. Use those numbers for intelligent search, recommendations, and insights.

## 📦 What You Get

### Core Implementation (Ready to Use)
- ✅ **EmbeddingTemplate Type** - Complete configuration interface
- ✅ **EmbeddingTemplateService** - All business logic
- ✅ **ShardType Integration** - Added `embeddingTemplate` field
- ✅ **Repository Methods** - Database operations
- ✅ **Default Template** - Automatic fallback

### Documentation (4 Guides)
1. **embeddings.md** - Complete architectural reference
2. **QUICK_REFERENCE.md** - Quick lookup cheat sheet
3. **INTEGRATION_GUIDE.md** - How to integrate into your services
4. **VISUAL_QUICK_START.md** - Visual diagrams and quick start
5. **COMPLETION_SUMMARY.md** - What was built and why
6. **EMBEDDING_TEMPLATE_IMPLEMENTATION.md** - Implementation details

## 🚀 Quick Start (2 Minutes)

### 1. Create a Template

```typescript
import { EmbeddingTemplate } from '@types/embedding-template.types';

const documentTemplate: EmbeddingTemplate = {
  id: uuidv4(),
  version: 1,
  name: 'Document Embedding Template',
  isDefault: false,
  
  // Which fields to include and how important they are
  fields: [
    { name: 'title', weight: 1.0 },      // Most important
    { name: 'content', weight: 0.8 },    // Also important
    { name: 'tags', weight: 0.5 }        // Less important
  ],
  
  // How to prepare text before embedding
  preprocessing: {
    combineFields: true,
    chunking: {
      chunkSize: 512,          // 512 characters per chunk
      overlap: 50,             // 50 character overlap
      splitBySentence: true    // Split at sentence boundaries
    }
  },
  
  // How to process vectors after generation
  normalization: {
    l2Normalize: true  // Prepare for cosine similarity
  },
  
  // Which AI model to use
  modelConfig: {
    strategy: 'default'  // text-embedding-3-small
  },
  
  storeInShard: true,
  enableVectorSearch: true,
  createdAt: new Date(),
  createdBy: 'admin'
};
```

### 2. Apply to ShardType

```typescript
// Option A: When creating ShardType
await shardTypeRepository.create({
  name: 'document',
  displayName: 'Document',
  // ... other fields ...
  embeddingTemplate: documentTemplate
});

// Option B: Update existing ShardType
await shardTypeRepository.updateEmbeddingTemplate(
  shardTypeId,
  tenantId,
  documentTemplate
);
```

### 3. Use in Your Service

```typescript
const service = new EmbeddingTemplateService(monitoring);

// Get template (custom or default)
const template = service.getTemplate(shardType);

// Extract text from shard respecting field weights
const text = service.extractText(shard, template);

// Preprocess text (chunk, clean)
const { text: processed, chunks } = 
  service.preprocessText(text, template.preprocessing);

// Generate embedding using template's model
const embedding = await openaiService.generateEmbedding({
  text: processed,
  model: service.getModelId(template)
});

// Normalize vector
const normalized = service.normalizeEmbedding(
  embedding,
  template.normalization
);

// Store in shard
shard.vectors = shard.vectors || [];
shard.vectors.push({
  id: uuidv4(),
  field: 'combined',
  model: service.getModelId(template),
  dimensions: embedding.length,
  embedding: normalized,
  createdAt: new Date()
});
```

## 📋 Key Concepts

### Field Weighting
Fields are assigned weights (0.0 to 1.0) indicating their importance:
- **1.0** = Primary field (title, name, main content)
- **0.8** = Important content (description, body)
- **0.5** = Metadata (tags, category)
- **0.3** = Secondary info (author, date)

### Preprocessing
Text is prepared before embedding:
1. **Combine Fields** - Merge selected fields
2. **Chunk** - Split into manageable pieces (optional)
3. **Clean** - Normalize whitespace, remove artifacts

### Normalization
Vectors are post-processed for optimal search:
- **L2 Normalize** - For cosine similarity (standard)
- **Min-Max Scale** - For hybrid search
- **Outlier Removal** - For stability

### Model Strategy
Choose how to select the AI model:
- **'default'** - text-embedding-3-small ($0.02/1M tokens) ✅ Recommended
- **'fast'** - Same as default, optimized for volume
- **'quality'** - text-embedding-3-large ($0.13/1M tokens) - 6.5x cost, better quality
- **'custom'** - Your specified modelId

## 📁 File Structure

```
apps/api/src/
├── types/
│   ├── embedding-template.types.ts    ← NEW: All type definitions
│   └── shard-type.types.ts            ← MODIFIED: Added embeddingTemplate
├── services/
│   └── embedding-template.service.ts  ← NEW: Business logic
└── repositories/
    └── shard-type.repository.ts       ← MODIFIED: Added 3 methods

docs/features/ai-insights/embeddings/
├── embeddings.md                      ← Complete reference guide
├── QUICK_REFERENCE.md                 ← Quick lookup
├── INTEGRATION_GUIDE.md                ← How to integrate
├── VISUAL_QUICK_START.md              ← Diagrams & examples
├── COMPLETION_SUMMARY.md               ← What was built
├── EMBEDDING_TEMPLATE_IMPLEMENTATION.md ← Implementation details
└── README.md                          ← This file
```

## 🔧 Integration Checklist

For each service that generates embeddings:

- [ ] Import EmbeddingTemplateService
- [ ] Inject into constructor
- [ ] Call `getTemplate()` to get shard type's template
- [ ] Use `extractText()` instead of manual text selection
- [ ] Use `preprocessText()` for text preparation
- [ ] Use `getModelId()` to select model
- [ ] Call embedding API with processed text
- [ ] Use `normalizeEmbedding()` post-generation
- [ ] Store in `shard.vectors[]`

See `INTEGRATION_GUIDE.md` for detailed integration steps.

## 💡 Common Patterns

### Pattern 1: Simple Document
```typescript
{
  fields: [{name: 'all', weight: 1.0}],
  preprocessing: {combineFields: true},
  modelConfig: {strategy: 'default'}
}
```

### Pattern 2: Structured with Weights
```typescript
{
  fields: [
    {name: 'title', weight: 1.0},
    {name: 'description', weight: 0.8},
    {name: 'category', weight: 0.5}
  ],
  preprocessing: {
    combineFields: true,
    chunking: {chunkSize: 512, splitBySentence: true}
  },
  modelConfig: {strategy: 'default'}
}
```

### Pattern 3: High-Quality Search
```typescript
{
  fields: [ /* ... */ ],
  preprocessing: { /* ... */ },
  normalization: {
    l2Normalize: true,
    removeOutliers: true
  },
  modelConfig: {strategy: 'quality'}  // Better model
}
```

## 📚 Documentation Guide

| Document | Best For |
|----------|----------|
| **This README** | Getting oriented |
| **VISUAL_QUICK_START.md** | Diagrams and visual reference |
| **QUICK_REFERENCE.md** | Quick lookup when coding |
| **embeddings.md** | Deep understanding and reference |
| **INTEGRATION_GUIDE.md** | Integrating into your services |
| **COMPLETION_SUMMARY.md** | Understanding what was built |

## 🎓 Learning Path

1. **Start** → Read this README
2. **Visualize** → VISUAL_QUICK_START.md
3. **Deep Dive** → embeddings.md
4. **Code** → QUICK_REFERENCE.md while implementing
5. **Integrate** → INTEGRATION_GUIDE.md for your services

## ✨ Key Features

✅ **Every ShardType Gets a Template** - Custom or automatic default  
✅ **Field-Level Control** - Weight fields by importance  
✅ **Flexible Preprocessing** - Chunking, cleaning, combining  
✅ **Vector Optimization** - L2 norm, outlier removal, more  
✅ **Model Selection** - 4 strategies including custom models  
✅ **Automatic Fallback** - System default if no custom template  
✅ **Fully Type-Safe** - TypeScript types throughout  
✅ **Well Documented** - 6 comprehensive guides  
✅ **Service-Ready** - Complete business logic implemented  
✅ **Database-Ready** - Repository methods included  

## 🔄 Data Flow

```
Shard + ShardType
    ↓
EmbeddingTemplateService.getTemplate()
    ↓ (get custom or default)
    ↓
EmbeddingTemplateService.extractText()
    ↓ (select fields by weight)
    ↓
EmbeddingTemplateService.preprocessText()
    ↓ (combine, chunk, clean)
    ↓
OpenAI/Azure API
    ↓ (generate vectors)
    ↓
EmbeddingTemplateService.normalizeEmbedding()
    ↓ (L2 normalize, etc)
    ↓
Shard.vectors[] (Cosmos DB)
    ↓
Vector Search Ready! ✓
```

## 🚀 Next Steps

### Immediate (This Sprint)
1. Review documentation
2. Understand the template concepts
3. Plan integration into your embedding services

### Short Term (Next Sprint)
1. Integrate with embedding generation services
2. Add API endpoints for template management
3. Create seeding script for default templates

### Medium Term (Following Sprint)
1. Write unit tests
2. Write integration tests
3. Add monitoring and metrics

### Long Term
1. Auto-tuning based on search metrics
2. Multi-model embedding support
3. Field-level embeddings
4. Advanced template features

## 🤔 FAQ

**Q: Do I need to create custom templates?**  
A: No. Every shard type gets a system default automatically. Only create custom templates if you need special handling.

**Q: Which model should I use?**  
A: Start with 'default' (text-embedding-3-small). Only upgrade to 'quality' if semantic precision is critical.

**Q: Will this work with my existing embeddings?**  
A: Templates apply to new embeddings. Existing ones are unaffected. Use a migration job to reprocess if needed.

**Q: How much will this cost?**  
A: text-embedding-3-small costs $0.02 per 1M tokens. text-embedding-3-large costs $0.13 (6.5x more). Most users should use the cheaper model.

**Q: Can I use custom models?**  
A: Yes. Set `strategy: 'custom'` and provide `modelId`.

**Q: How do weights actually affect the embedding?**  
A: Currently they indicate field priority (fields are selected in weight order). Future versions can use them for importance weighting.

## 📞 Support

See the documentation files for detailed information on any topic:
- **Architecture** → embeddings.md
- **Quick Lookup** → QUICK_REFERENCE.md
- **Integration** → INTEGRATION_GUIDE.md
- **Visual Guide** → VISUAL_QUICK_START.md

## ✅ Checklist for Completion

- ✅ Type system fully defined
- ✅ Service logic implemented
- ✅ Repository methods added
- ✅ ShardType model updated
- ✅ Default template provided
- ✅ Comprehensive documentation
- ✅ Integration guide created
- ✅ Examples provided
- ⏳ Integration with embedding services (next phase)
- ⏳ Unit tests (next phase)
- ⏳ API endpoints (next phase)

## 📊 Impact

This system enables:
- **Better Search** - Semantic vector search across all data
- **Smarter Recommendations** - Similarity-based suggestions
- **Flexible Configuration** - Per-shard-type customization
- **Cost Control** - Choice of model efficiency vs quality
- **Consistent Behavior** - Default fallback for all types
- **Type Safety** - Full TypeScript support

## 🎯 Success Metrics

Once integrated, track:
- Vector search precision/recall
- Embedding generation latency
- Model usage distribution
- Cost per 1M embeddings
- Field importance (which weights work best)

---

**Status**: ✅ Core system complete and documented  
**Last Updated**: January 2025  
**Next Phase**: Integration with embedding services  

**Start Here**: Read `VISUAL_QUICK_START.md` for diagrams or `QUICK_REFERENCE.md` for quick lookup.

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Embedding template system fully documented

#### Implemented Features (✅)

- ✅ EmbeddingTemplate type defined
- ✅ EmbeddingTemplateService implemented
- ✅ ShardType integration
- ✅ Repository methods
- ✅ Default template support

#### Known Limitations

- ⚠️ **Integration Status** - Integration with embedding services may be incomplete
  - **Code Reference:**
    - Embedding service integration may need verification
  - **Recommendation:**
    1. Verify embedding service integration
    2. Test embedding generation
    3. Document integration status

- ⚠️ **Template Usage** - Template usage may not be widespread
  - **Recommendation:**
    1. Verify template usage across ShardTypes
    2. Document template best practices
    3. Add template examples

### Code References

- **Backend Services:**
  - `apps/api/src/services/embedding-template.service.ts` - Embedding template service
  - `apps/api/src/services/vectorization.service.ts` - Vectorization service

### Related Documentation

- [Gap Analysis](../../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [AI Insights Feature](../README.md) - AI Insights documentation
- [Backend Documentation](../../../backend/README.md) - Backend implementation
