# Embedding Template System - Quick Reference

## Core Concepts

**Embedding Template** = Instructions for how to convert a shard into an embedding vector

Stored in: `ShardType.embeddingTemplate` (Cosmos DB)

## Quick Start

### 1. Get Template for a Shard Type
```typescript
const service = new EmbeddingTemplateService(monitoring);
const template = service.getTemplate(shardType);
// Returns custom template or system default
```

### 2. Extract Text from Shard
```typescript
const text = service.extractText(shard, template);
// Returns: combined text respecting field weights
```

### 3. Preprocess Text
```typescript
const { text: processed, chunks } = service.preprocessText(
  text,
  template.preprocessing
);
// Returns: cleaned text and optionally chunked versions
```

### 4. Generate Embedding
```typescript
const embedding = await openaiService.generateEmbedding({
  text: processed,
  model: service.getModelId(template)
});
```

### 5. Normalize Embedding
```typescript
const normalized = service.normalizeEmbedding(
  embedding.embedding,
  template.normalization
);
// Returns: L2 normalized vector ready for similarity search
```

## Template Structure

```typescript
{
  id: "unique-id",
  version: 1,
  name: "Template Name",
  isDefault: false,
  
  // Which fields to embed and their importance
  fields: [
    { name: "title", weight: 1.0 },      // Primary
    { name: "content", weight: 0.8 },    // Secondary
    { name: "tags", weight: 0.5 }        // Metadata
  ],
  
  // How to preprocess text
  preprocessing: {
    combineFields: true,
    chunking: { chunkSize: 512, overlap: 50 }
  },
  
  // How to normalize vectors
  normalization: { l2Normalize: true },
  
  // Which AI model to use
  modelConfig: { strategy: 'default' }
}
```

## Field Weights Cheat Sheet

| Weight | Field Type | Example |
|--------|-----------|---------|
| 1.0 | Primary identifier | title, name, main heading |
| 0.8-0.9 | Main content | description, body, summary |
| 0.5-0.7 | Metadata | tags, category, type |
| 0.3 | Secondary info | author, date, optional fields |

## Preprocessing Quick Reference

### Enable Chunking (Recommended for documents > 2KB)
```typescript
chunking: {
  chunkSize: 512,           // characters per chunk
  overlap: 50,              // overlap between chunks
  splitBySentence: true     // preserve sentence boundaries
}
```

### No Chunking (For short content)
```typescript
// Omit chunking entirely or set null
preprocessing: {
  combineFields: true
  // chunking: undefined
}
```

## Normalization Options

| Option | Use Case | Performance |
|--------|----------|-------------|
| `l2Normalize: true` | Cosine similarity (default) | Recommended ✅ |
| `minMaxScale: true` | Hybrid search | Adds overhead |
| `removeOutliers: true` | Improve stability | Slight overhead |

## Model Strategies

```typescript
'default'   // text-embedding-3-small  ($0.02/1M tokens) ✅ RECOMMENDED
'fast'      // Same as default, optimized for volume
'quality'   // text-embedding-3-large  ($0.13/1M tokens) - 6.5x cost
'custom'    // Your specified modelId
```

## Creating a Custom Template

```typescript
import { EmbeddingTemplate } from '@types/embedding-template.types';
import { v4 as uuidv4 } from 'uuid';

const myTemplate: EmbeddingTemplate = {
  id: uuidv4(),
  version: 1,
  name: 'My Custom Template',
  description: 'Optional description',
  isDefault: false,
  
  fields: [
    { name: 'title', weight: 1.0, include: true },
    { name: 'body', weight: 0.8, include: true },
    { name: 'metadata', weight: 0.5, include: true }
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
    l2Normalize: true,
    removeOutliers: false
  },
  
  modelConfig: {
    strategy: 'default'
  },
  
  storeInShard: true,
  enableVectorSearch: true,
  createdAt: new Date(),
  createdBy: 'user-id'
};
```

## Applying Template to Shard Type

```typescript
// Via repository
const repo = new ShardTypeRepository(monitoring);
const updated = await repo.updateEmbeddingTemplate(
  shardTypeId,
  tenantId,
  myTemplate
);
```

## Common Patterns

### Pattern 1: Document (Sentence-based chunking)
```typescript
fields: [
  { name: 'all', weight: 1.0 }  // Simple: use all fields
],
preprocessing: {
  combineFields: true,
  chunking: { 
    chunkSize: 512, 
    splitBySentence: true 
  }
}
```

### Pattern 2: Structured Data (No chunking)
```typescript
fields: [
  { name: 'name', weight: 1.0 },
  { name: 'category', weight: 0.6 },
  { name: 'description', weight: 0.8 }
],
preprocessing: {
  combineFields: true
  // No chunking
}
```

### Pattern 3: High-Quality Search
```typescript
fields: [ /* ... */ ],
preprocessing: { /* ... */ },
normalization: { 
  l2Normalize: true,
  removeOutliers: true 
},
modelConfig: { 
  strategy: 'quality'  // Use better model
}
```

## Debugging & Validation

### Validate Template
```typescript
const result = service.validateTemplate(template);
if (!result.valid) {
  console.error('Template errors:', result.errors);
}
```

### Check Extracted Text
```typescript
const text = service.extractText(shard, template);
console.log('Extracted:', text.substring(0, 200) + '...');
console.log('Length:', text.length);
```

### Check Model Selection
```typescript
const modelId = service.getModelId(template);
console.log('Using model:', modelId);
```

## Performance Tips

1. **Batch Embeddings**: Process multiple shards in parallel
2. **Cache Templates**: Load templates once, reuse frequently
3. **Monitor Chunking**: Don't set overlap too high (unnecessary work)
4. **Use Correct Strategy**: 'default' is fastest and cheapest
5. **Pre-filter Data**: Extract only needed fields before embedding

## Monitoring & Metrics

Track these for each template:
- Embedding generation time
- Vector search precision/recall
- Model usage and costs
- Chunk size distribution
- Normalization impact

## Default Behavior

If no custom template is set:
```typescript
// System uses DEFAULT_EMBEDDING_TEMPLATE
{
  fields: [{ name: 'all', weight: 1.0 }],
  preprocessing: {
    combineFields: true,
    chunking: { chunkSize: 512, overlap: 50 }
  },
  normalization: { l2Normalize: true },
  modelConfig: { strategy: 'default' }
}
```

## FAQ

**Q: Will templates affect existing embeddings?**  
A: No. Templates apply to NEW embeddings only. Use migration job to reprocess existing ones.

**Q: Can I change templates frequently?**  
A: Yes, but regenerate embeddings to maintain consistency.

**Q: Which model should I use?**  
A: Start with 'default' (text-embedding-3-small). Only upgrade to 'quality' if you have specific precision requirements.

**Q: What if a field is missing from shard?**  
A: The service skips it. No error. Other fields are still included.

**Q: Can I use custom models?**  
A: Yes, set `strategy: 'custom'` and provide `modelId`.

**Q: How do weights actually work?**  
A: Currently they indicate field priority/importance. Future: can drive text ordering and selection.

**Q: Should I enable chunking?**  
A: Yes, for documents > 2000 chars. No, for structured data with short fields.
