# Embedding Template System

## Overview

The Embedding Template System is a sophisticated framework for generating high-quality embeddings tailored to each shard type. It leverages embedding templates stored in ShardType to:

- **Define field priorities and weights** - Control which fields contribute most to embeddings
- **Preprocess data intelligently** - Transform shard data before embedding generation
- **Normalize embeddings** - Post-process vectors for optimal similarity search
- **Select embedding models** - Choose appropriate AI models for different shard types
- **Enable vector search** - Store embeddings for semantic retrieval

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Shard Creation/Update                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ EmbeddingTemplateService   │
        │ ─────────────────────────  │
        │ • getTemplate()            │
        │ • extractText()            │
        │ • preprocessText()         │
        │ • normalizeEmbedding()     │
        └────────────┬───────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
         ▼                        ▼
┌──────────────────────┐  ┌──────────────────────┐
│  ShardType           │  │ Template Data        │
│  ─────────────────   │  │ ─────────────────    │
│ • embeddingTemplate  │  │ • Field Config      │
│ • schema             │  │ • Preprocessing     │
│ • category           │  │ • Normalization     │
└──────────────────────┘  │ • Model Config      │
                          └──────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Embedding Generation           │
│ (OpenAI / Azure / Other)       │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Shard.vectors[] (Cosmos DB)    │
│ Stored for semantic search     │
└────────────────────────────────┘
```

### Key Components

#### 1. **EmbeddingTemplate** Interface
Stored in `ShardType.embeddingTemplate`, defines:

```typescript
interface EmbeddingTemplate {
  id: string;              // Unique ID
  version: number;         // Evolution tracking
  name: string;           // Descriptive name
  isDefault: boolean;     // System default flag
  fields: EmbeddingFieldConfig[];     // Field configuration
  preprocessing: EmbeddingPreprocessingConfig; // Preprocessing rules
  normalization: EmbeddingNormalizationConfig; // Normalization rules
  modelConfig: EmbeddingModelConfig;  // Model selection
  storeInShard: boolean;  // Store vectors in Cosmos DB
  enableVectorSearch: boolean; // Index for search
  createdAt: Date;
  createdBy: string;
}
```

#### 2. **EmbeddingTemplateService**
Core service implementing:
- Text extraction from shards using field configuration
- Preprocessing (chunking, normalization, cleaning)
- Vector normalization (L2, min-max scaling)
- Fallback to default template
- Template validation

#### 3. **ShardType Repository**
Enhanced with methods:
- `updateEmbeddingTemplate()` - Update template for shard type
- `getEmbeddingTemplate()` - Retrieve custom template
- `listWithEmbeddingTemplates()` - Find types with templates

## Field Configuration

### EmbeddingFieldConfig

Controls how individual fields contribute to embeddings:

```typescript
interface EmbeddingFieldConfig {
  name: string;                    // Field name from shard data
  weight: number;                  // Importance (0.0 - 1.0)
  include: boolean;                // Include in embedding
  preprocess?: {
    maxLength?: number;            // Truncate field
    lowercase?: boolean;           // Normalize case
    stripFormatting?: boolean;    // Remove markdown/HTML
    extractSections?: string[];   // Extract specific parts
  };
  nestedFields?: string[];         // For nested objects
}
```

### Weighting Recommendations

Field weights should reflect their semantic importance:

| Field Type | Weight | Rationale |
|---|---|---|
| Title/Name | 1.0 | Primary identifier |
| Description | 0.8 | Key content |
| Summary | 0.8 | Condensed summary |
| Body/Content | 0.8 | Full content |
| Tags | 0.5 | Metadata |
| Category | 0.5 | Classification |
| Metadata | 0.3 | Secondary info |

### Special Cases

**"all" Field**
```typescript
{
  name: "all",
  weight: 1.0,
  include: true,
  preprocess: {
    maxLength: 8000
  }
}
```
Combines all structured data fields into cohesive text.

**Nested Fields**
```typescript
{
  name: "author",
  weight: 0.6,
  include: true,
  nestedFields: ["name", "email"]  // Extract both
}
```

## Preprocessing

### EmbeddingPreprocessingConfig

Transforms raw data before embedding generation:

```typescript
interface EmbeddingPreprocessingConfig {
  combineFields: boolean;          // Merge fields into single text
  fieldSeparator?: string;         // Separator when combining
  chunking?: {
    chunkSize: number;             // Characters per chunk (default 512)
    overlap: number;               // Overlap between chunks (default 50)
    splitBySentence: boolean;      // Preserve sentence boundaries
    minChunkSize?: number;         // Minimum chunk size
    maxChunkSize?: number;         // Maximum chunk size
  };
  language?: string;               // Language-specific rules
  removeStopWords?: boolean;       // Remove common words
  normalize?: boolean;             // Apply lemmatization
}
```

### Processing Pipeline

1. **Combine Fields** - Merge selected fields with separator
2. **Clean Text** - Normalize whitespace, remove artifacts
3. **Chunk Text** - Split into manageable pieces
4. **Apply Preprocessing** - Language-specific rules

### Chunking Strategy

**Sentence-Based Chunking** (Recommended)
```
Input: "This is a document. It contains multiple sentences. Each chunk preserves semantic meaning."

Output:
- Chunk 1: "This is a document. It contains multiple sentences."
- Chunk 2: "It contains multiple sentences. Each chunk preserves semantic meaning."
         (overlap)
```

**Character-Based Chunking**
```
Input: (8000 character text)

Output:
- Chunk 1: (0-512 chars)
- Chunk 2: (462-974 chars)  // 50 char overlap
- Chunk 3: (924-1436 chars)
```

### Preprocessing Recommendations

| Scenario | Config |
|---|---|
| Long documents | `chunkSize: 512, overlap: 50, splitBySentence: true` |
| Short content | `chunkSize: 256, overlap: 0` |
| Technical content | `removeStopWords: false` (preserve terminology) |
| Natural language | `normalize: true, removeStopWords: true` |

## Normalization

### EmbeddingNormalizationConfig

Post-processes embedding vectors:

```typescript
interface EmbeddingNormalizationConfig {
  l2Normalize: boolean;            // L2 normalization
  minMaxScale?: boolean;           // Min-max scaling to [0,1]
  removeOutliers?: boolean;        // Remove z-score > 3
  reduction?: {
    enabled: boolean;              // PCA or similar
    targetDimensions?: number;     // Reduce to N dimensions
  };
}
```

### Normalization Techniques

#### L2 Normalization (Recommended)
```
Result = Vector / ||Vector||₂

Benefits:
- Prepares vectors for cosine similarity
- Used by Azure AI Search
- Standard for semantic search
```

#### Min-Max Scaling
```
Scaled = (Value - Min) / (Max - Min)

Benefits:
- Constrains values to [0, 1]
- Useful for hybrid search
```

#### Outlier Removal
```
If |z-score| > 3, replace with mean

Benefits:
- Reduces impact of anomalous values
- Improves stability
```

### Normalization Recommendations

| Use Case | Config |
|---|---|
| Cosine Similarity Search | `l2Normalize: true` |
| Hybrid Search | `l2Normalize: true, minMaxScale: true` |
| Quality-Critical | `removeOutliers: true` |
| Cost-Sensitive | No normalization (skip post-processing) |

## Model Selection

### EmbeddingModelConfig

Specifies which AI model to use:

```typescript
type ModelSelectionStrategy = 'default' | 'fast' | 'quality' | 'custom';

interface EmbeddingModelConfig {
  strategy: ModelSelectionStrategy;
  modelId?: string;                // Specific model
  fallbackModelId?: string;        // Fallback if primary fails
  parameters?: Record<string, any>; // Model-specific settings
}
```

### Strategy Comparison

| Strategy | Model | Cost | Quality | Use Case |
|---|---|---|---|---|
| **default** | text-embedding-3-small | $ | ⭐⭐⭐⭐ | Standard, recommended |
| **fast** | text-embedding-3-small | $ | ⭐⭐⭐⭐ | High volume, cost-optimized |
| **quality** | text-embedding-3-large | $$$ | ⭐⭐⭐⭐⭐ | Semantic precision required |
| **custom** | Specified modelId | Varies | Varies | Specialized requirements |

### Model Characteristics

**text-embedding-3-small**
- Dimensions: 1536
- Cost: $0.02 / 1M tokens
- Latency: ~100ms
- Quality: Excellent for most tasks
- **Recommendation: Default for all types**

**text-embedding-3-large**
- Dimensions: 3072
- Cost: $0.13 / 1M tokens (6.5x more)
- Latency: ~200ms
- Quality: Superior semantic precision
- **Recommendation: High-stakes semantic search only**

**text-embedding-ada-002** (Legacy)
- Dimensions: 1536
- Cost: $0.10 / 1M tokens
- Use as fallback only

## Default Template

System-wide default applied to all shard types without custom templates:

```typescript
{
  version: 1,
  name: 'Default Embedding Template',
  description: 'Default template for all shard types.',
  isDefault: true,
  fields: [
    {
      name: 'all',
      weight: 1.0,
      include: true,
      preprocess: {
        maxLength: 8000
      }
    }
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true
    }
  },
  normalization: {
    l2Normalize: true
  },
  modelConfig: {
    strategy: 'default',
    modelId: 'text-embedding-3-small'
  },
  storeInShard: true,
  enableVectorSearch: true
}
```

## Usage Examples

### Example 1: Document Shard Type

Document-specific template with weighted fields:

```typescript
const documentTemplate: EmbeddingTemplate = {
  id: 'tpl-doc-001',
  version: 1,
  name: 'Document Embedding Template',
  isDefault: false,
  fields: [
    {
      name: 'title',
      weight: 1.0,
      include: true,
      preprocess: { maxLength: 500 }
    },
    {
      name: 'summary',
      weight: 0.8,
      include: true,
      preprocess: { maxLength: 1000 }
    },
    {
      name: 'content',
      weight: 0.8,
      include: true,
      preprocess: { maxLength: 5000 }
    },
    {
      name: 'tags',
      weight: 0.5,
      include: true
    }
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 512,
      overlap: 50,
      splitBySentence: true,
      minChunkSize: 100
    }
  },
  normalization: {
    l2Normalize: true,
    removeOutliers: false
  },
  modelConfig: {
    strategy: 'default',
    modelId: 'text-embedding-3-small'
  },
  storeInShard: true,
  enableVectorSearch: true,
  createdAt: new Date(),
  createdBy: 'system'
};
```

### Example 2: Product Shard Type

E-commerce product with quality-focused model:

```typescript
const productTemplate: EmbeddingTemplate = {
  id: 'tpl-product-001',
  version: 1,
  name: 'Product Embedding Template',
  isDefault: false,
  fields: [
    {
      name: 'name',
      weight: 1.0,
      include: true
    },
    {
      name: 'description',
      weight: 0.9,
      include: true
    },
    {
      name: 'features',
      weight: 0.7,
      include: true,
      nestedFields: ['name', 'value']
    },
    {
      name: 'category',
      weight: 0.5,
      include: true
    }
  ],
  preprocessing: {
    combineFields: true,
    fieldSeparator: ' ',
    chunking: {
      chunkSize: 256,
      overlap: 25,
      splitBySentence: true
    }
  },
  normalization: {
    l2Normalize: true,
    removeOutliers: true  // More strict quality
  },
  modelConfig: {
    strategy: 'quality',  // Better semantic precision
    modelId: 'text-embedding-3-large'
  },
  storeInShard: true,
  enableVectorSearch: true,
  createdAt: new Date(),
  createdBy: 'system'
};
```

### Example 3: Using Templates in Code

```typescript
import { EmbeddingTemplateService } from './services/embedding-template.service';

class EmbeddingPipeline {
  constructor(
    private templateService: EmbeddingTemplateService,
    private openaiService: AzureOpenAIService
  ) {}

  async embedShard(shard: Shard, shardType: ShardType) {
    // 1. Get template (uses default if not defined)
    const template = this.templateService.getTemplate(shardType);

    // 2. Extract relevant text
    const text = this.templateService.extractText(shard, template);

    // 3. Preprocess
    const { text: processedText, chunks } = 
      this.templateService.preprocessText(text, template.preprocessing);

    // 4. Generate embedding
    const embedding = await this.openaiService.generateEmbedding({
      text: processedText,
      model: this.templateService.getModelId(template)
    });

    // 5. Normalize
    const normalized = this.templateService.normalizeEmbedding(
      embedding.embedding,
      template.normalization
    );

    // 6. Create result
    const result = this.templateService.createEmbeddingResult(
      normalized,
      template,
      processedText,
      {
        model: this.templateService.getModelId(template),
        tokenCount: embedding.usage.prompt_tokens
      },
      chunks
    );

    // 7. Store in shard
    if (template.storeInShard) {
      shard.vectors = shard.vectors || [];
      shard.vectors.push({
        id: uuidv4(),
        field: 'combined',
        model: result.metadata.model,
        dimensions: result.metadata.dimensions,
        embedding: result.embedding,
        createdAt: new Date()
      });
    }

    return result;
  }
}
```

## Storage

Embedding templates are stored in Cosmos DB as part of ShardType documents:

```json
{
  "id": "shard-type-123",
  "tenantId": "tenant-456",
  "name": "document",
  "displayName": "Document",
  "schema": { /* ... */ },
  "embeddingTemplate": {
    "id": "tpl-doc-001",
    "version": 1,
    "name": "Document Embedding Template",
    "fields": [ /* ... */ ],
    "preprocessing": { /* ... */ },
    "normalization": { /* ... */ },
    "modelConfig": { /* ... */ },
    "storeInShard": true,
    "enableVectorSearch": true,
    "createdAt": "2025-12-19T10:00:00Z",
    "createdBy": "system"
  }
}
```

**Schema Evolution**: Templates have their own version tracking separate from ShardType, allowing independent evolution.

## Best Practices

### 1. Field Selection
- Include only fields relevant to semantic search
- Exclude binary or categorical-only fields
- Use weights to balance field importance

### 2. Preprocessing
- Enable chunking for documents > 2000 characters
- Use sentence-based splitting to preserve semantics
- Set reasonable chunk sizes (256-512 tokens)

### 3. Normalization
- Always use L2 normalization for cosine similarity
- Consider outlier removal for stability
- Skip dimensionality reduction unless necessary

### 4. Model Selection
- Default to `text-embedding-3-small` for cost efficiency
- Use `text-embedding-3-large` only when semantic precision is critical
- Set fallback models for resilience

### 5. Testing
- Validate templates on sample shards
- Monitor embedding quality metrics
- Track vector search precision and recall

## Recommendations Summary

| Aspect | Recommendation |
|---|---|
| **Template Storage** | ShardType.embeddingTemplate (part of shard type document) |
| **Default Fallback** | System-provided DEFAULT_EMBEDDING_TEMPLATE |
| **Field Weights** | Priority-based (1.0 for primary, 0.5-0.8 for secondary) |
| **Preprocessing** | Combine fields, enable chunking, sentence-based splits |
| **Chunk Size** | 512 characters with 50-char overlap |
| **Normalization** | L2 normalize for cosine similarity |
| **Model Strategy** | Default to 'text-embedding-3-small' |
| **Vector Search** | Enable for all templates by default |
| **Storage Location** | Cosmos DB shard.vectors[] array |

## Future Enhancements

1. **Multi-Model Support** - Generate embeddings with multiple models simultaneously
2. **Field-Level Embeddings** - Store individual field embeddings for targeted search
3. **Dynamic Weighting** - Adjust weights based on query type
4. **Template Versioning** - Track and rollback template changes
5. **Performance Analytics** - Monitor template effectiveness metrics
6. **Auto-Tuning** - ML-driven optimization of template parameters
