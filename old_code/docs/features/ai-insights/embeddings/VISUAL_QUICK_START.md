# Embedding Template System - Visual Quick Start

## 🎯 System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                   EMBEDDING TEMPLATE SYSTEM                    │
│                                                                │
│  Every ShardType can have an EmbeddingTemplate that defines   │
│  how its data should be converted to semantic vectors          │
└────────────────────────────────────────────────────────────────┘
```

## 🔄 Basic Flow

```
Shard Data
    │
    ├─ title: "My Document"
    ├─ content: "Long text..."
    └─ tags: ["ML", "AI"]
    
         ↓
    
EmbeddingTemplate
    │
    ├─ fields: [
    │    {name: "title", weight: 1.0},
    │    {name: "content", weight: 0.8},
    │    {name: "tags", weight: 0.5}
    │  ]
    ├─ preprocessing: {chunking: {chunkSize: 512}}
    ├─ normalization: {l2Normalize: true}
    └─ modelConfig: {strategy: 'default'}
    
         ↓
    
EmbeddingTemplateService
    │
    ├─ extractText()        ➜ "My Document Long text... ML AI"
    ├─ preprocessText()     ➜ [chunk1, chunk2, ...]
    ├─ generateEmbedding()  ➜ [0.123, -0.456, 0.789, ...]
    └─ normalizeEmbedding() ➜ [0.080, -0.299, 0.515, ...]
    
         ↓
    
Storage (Cosmos DB)
    │
    └─ Shard.vectors[
        {
          id: "vec-123",
          field: "combined",
          model: "text-embedding-3-small",
          dimensions: 1536,
          embedding: [1536 floats],
          createdAt: timestamp
        }
      ]
    
         ↓
    
Vector Search Ready! ✓
```

## 📊 Component Map

```
├── Types Layer (embedding-template.types.ts)
│   ├── EmbeddingTemplate ..................... Main config interface
│   ├── EmbeddingFieldConfig .................. Field definition
│   ├── EmbeddingPreprocessingConfig ......... Preprocessing rules
│   ├── EmbeddingNormalizationConfig ......... Vector normalization
│   ├── EmbeddingModelConfig ................. AI model selection
│   ├── EmbeddingResult ....................... Result after application
│   └── DEFAULT_EMBEDDING_TEMPLATE ........... System default
│
├── Service Layer (embedding-template.service.ts)
│   ├── EmbeddingTemplateService
│   │   ├── getTemplate() .................... Get template (or default)
│   │   ├── extractText() .................... Extract shard text
│   │   ├── preprocessText() ................. Chunk and clean
│   │   ├── normalizeVector() ................ L2 normalize
│   │   ├── normalizeEmbedding() ............ Full normalization
│   │   ├── validateTemplate() ............... Check config
│   │   ├── getModelId() .................... Select model
│   │   └── createEmbeddingResult() .......... Build result
│
├── Data Layer (shard-type.repository.ts)
│   ├── ShardTypeRepository
│   │   ├── updateEmbeddingTemplate() ........ Set/update template
│   │   ├── getEmbeddingTemplate() ........... Retrieve template
│   │   └── listWithEmbeddingTemplates() ..... Find types with templates
│
├── Model Layer (shard-type.types.ts)
│   ├── ShardType
│   │   └── embeddingTemplate?: EmbeddingTemplate
│   ├── CreateShardTypeInput (includes embeddingTemplate)
│   └── UpdateShardTypeInput (includes embeddingTemplate)
│
└── Documentation Layer (embeddings/)
    ├── embeddings.md ......................... Complete guide
    ├── QUICK_REFERENCE.md ................... Quick lookup
    ├── INTEGRATION_GUIDE.md ................. How to integrate
    └── COMPLETION_SUMMARY.md ............... This summary
```

## 📋 Template Configuration Template

```typescript
{
  // Identity
  id: "tpl-unique-id",
  version: 1,
  name: "My Template Name",
  isDefault: false,
  
  // Field Selection & Weighting
  fields: [
    {
      name: "title",           // Field name
      weight: 1.0,            // Importance (0.0-1.0)
      include: true,          // Include or skip
      preprocess: {           // Optional field preprocessing
        maxLength: 500,
        lowercase: true,
        stripFormatting: true
      }
    },
    {
      name: "content",
      weight: 0.8,
      include: true
    },
    {
      name: "tags",
      weight: 0.5,
      include: true
    }
  ],
  
  // Text Preprocessing
  preprocessing: {
    combineFields: true,              // Merge all fields
    fieldSeparator: " ",              // Joiner
    chunking: {
      chunkSize: 512,                // Characters per chunk
      overlap: 50,                   // Overlap between chunks
      splitBySentence: true,         // Semantic boundaries
      minChunkSize: 100,             // Minimum chunk
      maxChunkSize: 1000            // Maximum chunk
    }
  },
  
  // Vector Normalization
  normalization: {
    l2Normalize: true,               // Cosine similarity prep
    minMaxScale: false,              // Optional scaling
    removeOutliers: false,           // Optional cleanup
    reduction: {
      enabled: false,                // Dimensionality reduction
      targetDimensions: 768         // Target if enabled
    }
  },
  
  // Model Selection
  modelConfig: {
    strategy: 'default',             // 'default'|'fast'|'quality'|'custom'
    modelId: 'text-embedding-3-small',  // Specific model
    fallbackModelId: 'text-embedding-ada-002'
  },
  
  // Storage & Search
  storeInShard: true,               // Save vectors in shard.vectors[]
  enableVectorSearch: true,         // Can be searched
  
  // Metadata
  createdAt: new Date(),
  createdBy: 'user-id'
}
```

## 🎛️ Weight Ranges Reference

```
1.0 ┌─────────────────────────────────────┐ Primary Fields
    │ title, name, main heading           │ (Most important)
    │                                     │
0.8 ├─────────────────────────────────────┤ Core Content
    │ description, body, summary          │
    │                                     │
0.5 ├─────────────────────────────────────┤ Metadata
    │ tags, category, type                │
    │                                     │
0.3 ├─────────────────────────────────────┤ Secondary
    │ author, date, optional fields       │
    │                                     │
0.0 └─────────────────────────────────────┘ Skip
      (Excluded from embedding)
```

## 🚀 Quick Start (5 Steps)

### Step 1: Get Service
```typescript
const service = new EmbeddingTemplateService(monitoring);
```

### Step 2: Get Template
```typescript
const template = service.getTemplate(shardType);
// Returns custom template or system default
```

### Step 3: Extract Text
```typescript
const text = service.extractText(shard, template);
// Returns: "title content tags..." combined respecting weights
```

### Step 4: Preprocess
```typescript
const { text: processed, chunks } = 
  service.preprocessText(text, template.preprocessing);
// Returns: cleaned text + optional chunks
```

### Step 5: Generate & Normalize
```typescript
const embedding = await openai.generateEmbedding(processed, 
  service.getModelId(template));
const normalized = service.normalizeEmbedding(embedding, 
  template.normalization);
// Store in shard.vectors[]
```

## 📊 Model Strategy Comparison

```
┌─────────────┬──────────────────────┬──────────┬─────────┬──────────┐
│ Strategy    │ Model                │ Cost     │ Quality │ Latency  │
├─────────────┼──────────────────────┼──────────┼─────────┼──────────┤
│ 🟢 default  │ text-embedding-3-sm  │ $0.02/M  │ ⭐⭐⭐⭐  │ ~100ms   │
│ 🟢 fast     │ text-embedding-3-sm  │ $0.02/M  │ ⭐⭐⭐⭐  │ ~100ms   │
│ 🔴 quality  │ text-embedding-3-lg  │ $0.13/M  │ ⭐⭐⭐⭐⭐ │ ~200ms   │
│ 🟡 custom   │ Your choice          │ Varies   │ Varies  │ Varies   │
└─────────────┴──────────────────────┴──────────┴─────────┴──────────┘

💡 RECOMMENDATION: Use 'default' for cost efficiency
                   Use 'quality' only when precision critical
```

## 📈 Preprocessing Strategies

```
┌─────────────────┬──────────────────────────────────┬─────────────┐
│ Content Type    │ Recommended Config               │ Use Case    │
├─────────────────┼──────────────────────────────────┼─────────────┤
│ Long documents  │ chunkSize: 512                   │ Files,      │
│                 │ overlap: 50                      │ articles    │
│                 │ splitBySentence: true            │             │
│                 │                                  │             │
│ Short content   │ chunkSize: 256                   │ Titles,     │
│                 │ overlap: 0                       │ summaries   │
│                 │                                  │             │
│ Structured data │ (no chunking)                    │ JSON,       │
│                 │ combineFields: true              │ records     │
│                 │                                  │             │
│ Mixed content   │ chunkSize: 512                   │ Blog posts, │
│                 │ overlap: 25                      │ documents   │
│                 │ splitBySentence: true            │             │
└─────────────────┴──────────────────────────────────┴─────────────┘
```

## 🔍 Normalization Techniques

```
┌──────────────────┬───────────────────────────┬──────────────────┐
│ Technique        │ Purpose                   │ When to Use      │
├──────────────────┼───────────────────────────┼──────────────────┤
│ L2 Normalize     │ Prepare for cosine        │ ✅ Always        │
│                  │ similarity search         │ (default)        │
│                  │                           │                  │
│ Min-Max Scale    │ Constrain to [0, 1]       │ Hybrid search    │
│                  │ useful for mixing with    │ or blending      │
│                  │ other scores              │ multiple scores  │
│                  │                           │                  │
│ Outlier Removal  │ Remove extreme values     │ Stability        │
│                  │ (z-score > 3)             │ critical tasks   │
│                  │                           │                  │
│ Dimensionality   │ Reduce from 3072 → 768    │ Cost reduction   │
│ Reduction        │ (for large models)        │ or storage       │
│                  │                           │                  │
└──────────────────┴───────────────────────────┴──────────────────┘
```

## 🎯 Common Templates

### Template 1: Document
```typescript
{
  name: 'Document Template',
  fields: [
    {name: 'title', weight: 1.0},
    {name: 'content', weight: 0.8},
    {name: 'tags', weight: 0.5}
  ],
  preprocessing: {
    combineFields: true,
    chunking: {chunkSize: 512, splitBySentence: true}
  }
}
```

### Template 2: Product
```typescript
{
  name: 'Product Template',
  fields: [
    {name: 'name', weight: 1.0},
    {name: 'description', weight: 0.9},
    {name: 'category', weight: 0.5}
  ],
  preprocessing: {
    combineFields: true,
    chunking: {chunkSize: 256}
  },
  modelConfig: {strategy: 'quality'}  // Better precision
}
```

### Template 3: Short Text (Default)
```typescript
{
  name: 'Default Template',
  fields: [{name: 'all', weight: 1.0}],
  preprocessing: {
    combineFields: true,
    chunking: {chunkSize: 512}
  },
  modelConfig: {strategy: 'default'}
}
```

## 📚 Documentation Map

| Document | Purpose | Read When |
|----------|---------|-----------|
| **embeddings.md** | Complete reference | Learning the system |
| **QUICK_REFERENCE.md** | Quick lookup | Need to remember something |
| **INTEGRATION_GUIDE.md** | Integration steps | Adding to your code |
| **COMPLETION_SUMMARY.md** | What was built | Want to know what exists |

## ✅ Implementation Checklist

- ✅ **Type System** - Full embedding template types
- ✅ **Service Logic** - Complete business logic
- ✅ **Repository Methods** - Database operations
- ✅ **ShardType Integration** - Added to model
- ✅ **Documentation** - 4 comprehensive guides
- ⏳ **Embedding Service Integration** - Next phase
- ⏳ **API Endpoints** - Next phase
- ⏳ **Unit Tests** - Next phase

## 🔗 Integration Points

```
┌─────────────────────────────────────┐
│ EmbeddingTemplateService (READY)    │◄──┐
└─────────────────────────────────────┘   │
           ↑                               │
           │                               │
    ┌──────┴──────────┬──────────┬──────┐  │
    │                 │          │      │  │
    ▼                 ▼          ▼      ▼  │
┌─────────────┐ ┌──────────┐ ┌────┐ ┌────┐│
│ AzureOpenAI │ │ WebSearch│ │ RAG│ │ ... ││
│ (Integrate) │ │(Integrate)│ │    │ │    ││
└─────────────┘ └──────────┘ └────┘ └────┘│
                                           │
                              (Next Phase)─┘
```

## 🎓 Learning Path

1. **Start Here** → `QUICK_REFERENCE.md`
2. **Understand Architecture** → `embeddings.md` (first 2 sections)
3. **Learn Templates** → `embeddings.md` (sections 3-6)
4. **See Examples** → `embeddings.md` (section 7)
5. **Ready to Integrate** → `INTEGRATION_GUIDE.md`

## 💡 Key Takeaways

| Concept | Key Point |
|---------|-----------|
| **Templates** | Every ShardType has one (custom or default) |
| **Fields** | Use weights to prioritize which fields matter |
| **Preprocessing** | Chunk text into 512-char pieces (or disable) |
| **Normalization** | L2 normalize vectors for cosine similarity |
| **Models** | Default to text-embedding-3-small (efficient) |
| **Storage** | Vectors go in Shard.vectors[] (Cosmos DB) |
| **Search** | Enables semantic vector search queries |

---

**System Status**: ✅ **READY FOR INTEGRATION**

**Next Step**: Integrate with embedding generation services

**Questions?** See the documentation files or integration guide.
